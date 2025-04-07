import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Notification from "../models/Notification.model.js";
import { sendPushNotification } from "./pushNotification.js";
import Message from "../models/message.model.js";
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

  socket.on("setup", async (userId) => {
    userSockets.set(userId, socket.id);
    socket.join(userId);
    console.log(`User ${userId} setup complete`);
    broadcastOnlineUsers();
    
    // Deliver any stored notifications when user comes online
    try {
      const storedNotifications = await Notification.find({ 
        receiverId: userId,
        read: false 
      }).sort({ createdAt: -1 }).limit(10);
      
      if (storedNotifications.length > 0) {
        console.log(`Delivering ${storedNotifications.length} stored notifications to ${userId}`);
        
        for (const notification of storedNotifications) {
          const sender = await User.findById(notification.senderId).select("fullName profilePic");
          if (sender) {
            socket.emit("new_notification", {
              _id: notification._id,
              from: notification.senderId,
              message: `${sender.fullName}: ${notification.message}`,
              senderName: sender.fullName,
              senderProfilePic: sender.profilePic || "",
              timestamp: notification.createdAt,
              createdAt: notification.createdAt,
              read: notification.read,
              delivered: notification.delivered || false
            });
            
            // Acknowledge delivery
            await Notification.findByIdAndUpdate(notification._id, { delivered: true });
          }
        }
      }
    } catch (error) {
      console.error("Error delivering stored notifications:", error);
    }
  });

  socket.on("private message", async ({ to, message }) => {
    try {
      const senderId = [...userSockets.entries()]
        .find(([_, socketId]) => socketId === socket.id)?.[0];
      
      if (!senderId) {
        console.error("Could not identify sender");
        return;
      }

      const sender = await User.findById(senderId).select("fullName");
      const messageText = typeof message === "object" && message.content
        ? message.content 
        : message;
      
      const recipientSocket = userSockets.get(to);
      if (recipientSocket) {
        // Recipient is online, send message directly
        io.to(recipientSocket).emit("private message", {
          from: senderId,
          message,
        });
        
        // Send notification with acknowledgement
        io.to(recipientSocket).emit("new_notification", {
          _id: `temp-${Date.now()}`, // Temporary ID for real-time notifications
          from: senderId,
          message: `${sender.fullName}: ${messageText}`,
          senderName: sender.fullName,
          senderProfilePic: sender.profilePic || "",
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          read: false,
          delivered: true
        }, (acknowledgement) => {
          if (acknowledgement && acknowledgement.received) {
            console.log(`Notification acknowledged by ${to}`);
          } else {
            console.log(`Notification might not have been received by ${to}`);
            // Store notification in case it wasn't received
            storeNotification(to, senderId, messageText);
          }
        });
        console.log(`Notification sent to ${to} from ${senderId}`);
      } else {
        console.log(`Recipient ${to} not found or offline, storing notification`);
        // Store notification and send push notification
        await storeNotification(to, senderId, messageText);
      }
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  });
  
  // Helper function to store notifications and send push notification
  async function storeNotification(receiverId, senderId, messageText) {
    try {
      const notification = new Notification({
        receiverId: receiverId,
        senderId: senderId,
        message: messageText,
        createdAt: new Date(),
        read: false,
        delivered: false
      });
      await notification.save();
      console.log("Notification stored in database");

      // Get sender info for push notification
      const sender = await User.findById(senderId).select("fullName");
      
      // Send push notification
      await sendPushNotification(receiverId, {
        title: `New Message from ${sender.fullName}`,
        body: messageText,
        data: {
          notificationId: notification._id.toString(),
          senderId: senderId.toString()
        }
      });
      
      console.log("Push notification sent");
    } catch (error) {
      console.error("Error storing notification or sending push:", error);
    }
  }

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
 
  socket.on("EditMessage", async ({ messageId, newContent, senderId }) => {
    const recipientSocket = userSockets.get(senderId);
    if (recipientSocket) {
      await Message.findByIdAndUpdate(messageId, { content: newContent });
      console.log(`Message ${messageId} updated to: ${newContent}`);
      io.to(recipientSocket).emit("EditMessage", { messageId, newContent });
      console.log(`Notified user ${senderId} about the edit`);
    }
});

  socket.on("message_edited", async ({ messageId, newContent, to }) => {
    try {
      // Update message in database
      await Message.findByIdAndUpdate(messageId, { 
        content: newContent,
        edited: true 
      });
  
      // Get recipient's socket
      const recipientSocket = userSockets.get(to);
      
      if (recipientSocket) {
        // Emit to specific recipient
        io.to(recipientSocket).emit("message_edited", { 
          messageId,
          newContent
        });
      }
    } catch (error) {
      console.error("Error handling message edit:", error);
    }
  });

  socket.on("markAsRead", ({ senderId }) => {
    const recipientSocket = userSockets.get(senderId);
    if (recipientSocket) {
      socket.to(recipientSocket).emit("messages_read", {
        readBy: [...userSockets.entries()]
          .find(([_, socketId]) => socketId === socket.id)?.[0],
        conversationId: senderId
      });
    }

  });
  // Handle notification acknowledgment
  socket.on("notification_received", async ({ notificationId, received }) => {
    if (received && notificationId) {
      try {
        // If it's a database notification with an ID, mark it as delivered
        if (notificationId.toString().startsWith('temp-')) {
          console.log(`Temporary notification acknowledged: ${notificationId}`);
        } else {
          await Notification.findByIdAndUpdate(notificationId, { delivered: true });
          console.log(`Notification ${notificationId} marked as delivered`);
        }
      } catch (error) {
        console.error(`Error marking notification ${notificationId} as delivered:`, error);
      }
    }
  });
});

export { io, app, server };
