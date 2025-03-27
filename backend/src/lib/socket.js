import {Server} from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors:{
        origin: process.env.NODE_ENV === "production" 
          ? true  // Allow connections from any origin in production
          : ["http://localhost:5173"],
        credentials: true,
    }
});

const userSockets = new Map(); // Track user socket connections

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    // Add function to broadcast online users to all clients
    const broadcastOnlineUsers = () => {
        const onlineUsers = Array.from(userSockets.keys());
        io.emit("online-users", onlineUsers);
        console.log("Broadcasting online users:", onlineUsers);
    };

    // Handle user setup
    socket.on("setup", (userId) => {
        userSockets.set(userId, socket.id);
        socket.join(userId);
        console.log(`User ${userId} setup complete`);
        
        // Broadcast updated online users list
        broadcastOnlineUsers();
    });

    socket.on("private message", ({to, message}) => {
        const recipientSocket = userSockets.get(to);
        if(recipientSocket) {
            // Send to recipient with sender's userId, not socket.id
            const senderId = [...userSockets.entries()]
                .find(([_, socketId]) => socketId === socket.id)?.[0];
                
            socket.to(recipientSocket).emit("private message", {
                from: senderId, // Use actual userId instead of socket.id
                message,
            });
        }
    });

    socket.on("typing", ({to, isTyping}) => {
        const recipientSocket = userSockets.get(to);
        if(recipientSocket) {
            // Send typing status with sender's userId, not socket.id
            const senderId = [...userSockets.entries()]
                .find(([_, socketId]) => socketId === socket.id)?.[0];
                
            socket.to(recipientSocket).emit("typing", {
                from: senderId, // Use actual userId instead of socket.id
                isTyping,
            });

            console.log(`typing, ${isTyping}`);
        }
    });

    // Add message deletion handler here
    socket.on("message_deleted", ({ messageId, conversationId }) => {
        console.log("Message deletion event received:", messageId, conversationId);
        
        // Find the recipient's socket ID
        const senderId = [...userSockets.entries()]
            .find(([_, socketId]) => socketId === socket.id)?.[0];
            
        if (senderId) {
            // Broadcast to everyone except sender
            socket.broadcast.emit("message_deleted", {
                messageId,
                conversationId
            });
            console.log(`Message deletion broadcast from ${senderId}`);
        }
    });
    
    socket.on("disconnect", async () => {
        // Find and remove user from userSockets
        for (const [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                console.log(`User ${userId} disconnected`, socket.id);
                
                // Update lastOnline with await
                try {
                    await User.findByIdAndUpdate(userId, { lastOnline: new Date() });
                    console.log(`Updated last online time for user ${userId}`);
                } catch (error) {
                    console.error(`Error updating last online time for user ${userId}:`, error);
                }
                
                // Broadcast updated online users list
                broadcastOnlineUsers();
                break;
            }
        }
    });
});

export {io, app, server};