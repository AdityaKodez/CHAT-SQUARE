import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? true 
      : ["http://localhost:5173"],
    credentials: true,
  },
});

const userSockets = new Map(); // Track user socket connections

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const broadcastOnlineUsers = () => {
    const onlineUsers = Array.from(userSockets.keys());
    io.emit("online-users", onlineUsers);
    console.log("Broadcasting online users:", onlineUsers);
  };

  socket.on("setup", (userId) => {
    userSockets.set(userId, socket.id);
    socket.join(userId);
    console.log(`User ${userId} setup complete`);
    broadcastOnlineUsers();
  });

  socket.on("private message", async ({ to, message }) => {
    try {
      const recipientSocket = userSockets.get(to);
      if (recipientSocket) {
        const senderId = [...userSockets.entries()]
          .find(([_, socketId]) => socketId === socket.id)?.[0];
  
        // Send the private message
        io.to(recipientSocket).emit("private message", {
          from: senderId,
          message,
        });
        
        const sender = await User.findById(senderId).select("fullName");
        // Determine the message text:
        const messageText = typeof message === "object" && message.content
          ? message.content 
          : message;
          
        // Send a notification to the recipient with proper string conversion
        // Send with acknowledgement
        io.to(recipientSocket).emit("new_notification", {
          from: senderId,
          message: `${sender.fullName}: ${messageText}`,
          timestamp: new Date().toISOString(),
        }, (acknowledgement) => {
          if (acknowledgement && acknowledgement.received) {
            console.log(`Notification acknowledged by ${to}`);
          } else {
            console.log(`Notification might not have been received by ${to}`);
            // Implement retry logic
          }
        });
        console.log(`Notification sent to ${to} from ${senderId}`);
      } else {
        console.log(`Recipient ${to} not found or offline, storing notification`);
        // Store notification in database for later delivery
        try {
          // Create a new notification document in your database
          // You would need to create a notification model for this
        } catch (error) {
          console.error("Error storing notification:", error);
        }
      }
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  });

  socket.on("typing", ({ to, isTyping, from }) => {
    const recipientSocket = userSockets.get(to);
    if (recipientSocket) {
      socket.to(recipientSocket).emit("typing", { from, isTyping });
    }
  });

  socket.on("message_deleted", ({ messageId, conversationId }) => {
    const senderId = [...userSockets.entries()]
      .find(([_, socketId]) => socketId === socket.id)?.[0];
    if (senderId) {
      socket.broadcast.emit("message_deleted", { messageId, conversationId });
      console.log(`Message deletion broadcast from ${senderId}`);
    }
  });

  socket.on("disconnect", async () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`, socket.id);
        try {
          await User.findByIdAndUpdate(userId, { lastOnline: new Date() });
          console.log(`Updated last online time for user ${userId}`);
        } catch (error) {
          console.error(`Error updating last online time for user ${userId}:`, error);
        }
        broadcastOnlineUsers();
        break;
      }
    }
  });

  socket.on("global_typing", ({ isTyping, fullName }) => {
    const senderId = [...userSockets.entries()]
      .find(([_, socketId]) => socketId === socket.id)?.[0];
    if (senderId) {
      socket.broadcast.emit("global_typing", { userId: senderId, isTyping, fullName });
    }
  });
});

export { io, app, server };