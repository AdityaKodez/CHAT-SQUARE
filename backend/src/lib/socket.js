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

  socket.on("private_message", async ({ to, message }) => { // Listen for consistent event name
    try {
      const senderId = [...userSockets.entries()]
        .find(([_, socketId]) => socketId === socket.id)?.[0];

      if (!senderId) {
        console.error("Could not identify sender for private message");
        return;
      }

      // Fetch receiver and sender details including blocked lists
      const receiver = await User.findById(to).select('blockedUsers');
      const sender = await User.findById(senderId).select('blockedUsers fullName profilePic'); // Fetch sender details too

      if (!receiver || !sender) {
        console.error("Sender or Receiver not found");
        return;
      }

      // Check block status (receiver blocking sender)
      if (receiver.blockedUsers.some(blockedId => blockedId.equals(senderId))) {
        console.log(`Message blocked: Receiver (${to}) has blocked Sender (${senderId})`);
        // Optionally notify sender
        // socket.emit("message_blocked", { recipientId: to });
        return;
      }
      
       // Check block status (sender blocking receiver)
      if (sender.blockedUsers.some(blockedId => blockedId.equals(to))) {
        console.log(`Message blocked: Sender (${senderId}) has blocked Receiver (${to})`);
        // Optionally notify sender
        // socket.emit("message_blocked", { recipientId: to });
        return;
      }

      // Ensure the message object has the necessary structure before emitting
      // The 'message' object received here likely comes directly from the sender's client-side call
      // It might *not* be the fully populated message from the database yet.
      // It's better to rely on the message object returned by the `sendMessage` controller.
      // However, the current flow emits *before* the controller responds.
      // Let's assume the 'message' object passed in the event *does* contain necessary info for now,
      // but ideally, the emission should happen *after* the message is saved and populated in the controller.

      const messageToSend = {
         ...message, // Spread the incoming message data
         sender: { // Ensure sender object is structured correctly
             _id: senderId,
             fullName: sender.fullName,
             profilePic: sender.profilePic
         },
         receiver: to // Ensure receiver ID is correct
      };


      const messageText = messageToSend.content || ""; // Get content for notification

      const recipientSocket = userSockets.get(to);
      if (recipientSocket) {
        // Recipient is online, send message directly
        io.to(recipientSocket).emit("private_message", messageToSend); // Use consistent event name

        // Send notification
        io.to(recipientSocket).emit("new_notification", {
          _id: messageToSend._id || `temp-${Date.now()}`,
          from: senderId,
          message: `${sender.fullName}: ${messageText}`,
          senderName: sender.fullName,
          senderProfilePic: sender.profilePic || "",
          timestamp: messageToSend.createdAt || new Date().toISOString(),
          createdAt: messageToSend.createdAt || new Date().toISOString(),
          read: false,
          delivered: true // Assume delivered if sent directly via socket
        }, (acknowledgement) => {
          // ... acknowledgement logic ...
        });
        console.log(`Private message sent to ${to} from ${senderId}`);
      } else {
        console.log(`Recipient ${to} not found or offline, storing notification`);
        // Store notification and send push notification
        await storeNotification(to, senderId, messageText, messageToSend._id); // Pass message ID if available
      }
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  });
  
  // Helper function to store notifications and send push notification
  async function storeNotification(receiverId, senderId, messageText, messageId = null) { // Added messageId param
    try {
      // Check if a notification for this specific message already exists
      // This helps prevent duplicates if the socket event fires before the controller saves
      // and the recipient comes online right after.
      if (messageId) {
         const existingNotification = await Notification.findOne({ messageId: messageId });
         if (existingNotification) {
            console.log("Notification for message already exists, skipping storage:", messageId);
            return;
         }
      }

      const notification = new Notification({
        receiverId: receiverId,
        senderId: senderId,
        message: messageText,
        messageId: messageId, // Store the original message ID if available
        createdAt: new Date(),
        read: false,
        delivered: false
      });
      await notification.save();
      console.log("Notification stored in database");

      // Get sender info for push notification
      const sender = await User.findById(senderId).select("fullName");
      if (!sender) {
         console.error("Sender not found for push notification");
         return;
      }
      
      // Send push notification
      await sendPushNotification(receiverId, {
        title: `New Message from ${sender.fullName}`,
        body: messageText,
        data: {
          notificationId: notification._id.toString(),
          senderId: senderId.toString(),
          messageId: messageId ? messageId.toString() : undefined // Include messageId in push data if available
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
