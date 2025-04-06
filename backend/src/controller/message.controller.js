import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import Notification from "../models/Notification.model.js";
export const getUserForSidebar = async (req, res) => {
    try {
        const LoggedInUserId = req.user._id;
        const FilteredUser = await User.find({ _id: { $ne: LoggedInUserId } })
            .select("username fullName _id timestamps profilePic lastOnline description isVerified") // Include isVerified field
        res.status(200).json(FilteredUser);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all unread notifications for a user
export const getUnreadNotifications = async (req, res) => {
    try {
      const userId = req.user._id;
      const notifications = await Notification.find({ 
        receiverId: userId,
        read: false 
      }).sort({ createdAt: -1 });
      
      // Populate sender information
      const populatedNotifications = await Promise.all(
        notifications.map(async (notification) => {
          const sender = await User.findById(notification.senderId).select("fullName profilePic");
          return {
            ...notification._doc,
            sender
          };
        })
      );
      
      res.status(200).json(populatedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Error fetching notifications" });
    }
  };
  
  // Mark notifications as read
  export const markAsRead = async (req, res) => {
    try {
      const { notificationIds } = req.body;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return res.status(400).json({ message: "Invalid notification IDs" });
      }
      
      await Notification.updateMany(
        { _id: { $in: notificationIds }, receiverId: req.user._id },
        { $set: { read: true } }
      );
      
      res.status(200).json({ message: "Notifications marked as read" });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ message: "Error marking notifications as read" });
    }
  };
  
  // Mark notifications as delivered
  export const markAsDelivered = async (req, res) => {
    try {
      const { notificationIds } = req.body;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return res.status(400).json({ message: "Invalid notification IDs" });
      }
      
      await Notification.updateMany(
        { _id: { $in: notificationIds }, receiverId: req.user._id },
        { $set: { delivered: true } }
      );
      
      res.status(200).json({ message: "Notifications marked as delivered" });
    } catch (error) {
      console.error("Error marking notifications as delivered:", error);
      res.status(500).json({ message: "Error marking notifications as delivered" });
    }
  };
  
  // Delete notifications
  export const deleteNotifications = async (req, res) => {
    try {
      const { notificationIds } = req.body;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return res.status(400).json({ message: "Invalid notification IDs" });
      }
      
      await Notification.deleteMany({ 
        _id: { $in: notificationIds }, 
        receiverId: req.user._id 
      });
      
      res.status(200).json({ message: "Notifications deleted" });
    } catch (error) {
      console.error("Error deleting notifications:", error);
      res.status(500).json({ message: "Error deleting notifications" });
    }
  };
export const getMessages = async (req, res) => {
    try {
        const { userId: userToChat } = req.params;
        const myId = req.user._id;
        
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default 20 messages per page
        const skip = (page - 1) * limit;
        
        // Find total count for pagination info
        const totalCount = await Message.countDocuments({
            $or: [
                { sender: myId, receiver: userToChat },
                { sender: userToChat, receiver: myId },
            ],
        });

        // Get messages with pagination, sorted by newest first, then reverse for display
        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: userToChat },
                { sender: userToChat, receiver: myId },
            ],
        })
        .sort({ createdAt: -1 }) // Newest first for pagination
        .skip(skip)
        .limit(limit)
        .lean(); // Convert to plain JS objects for better performance
        
        // Return messages in chronological order (oldest first)
        res.status(200).json({
            messages: messages.reverse(),
            pagination: {
                total: totalCount,
                page,
                limit,
                hasMore: skip + messages.length < totalCount
            }
        });

    } catch (error) {
        console.log(error, "ERROR IN MESSAGE CONTROLLER");
        res.status(500).json({ message: "Internal server error while fetching messages" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { content, fileUrl } = req.body;
        const myId = req.user._id;
        const { userId: receiver } = req.params;

        const message = new Message({ 
            sender: myId, 
            receiver, 
            content 
        });
        await message.save();

        if (fileUrl) {
            const Image = await cloudinary.uploader.upload(fileUrl);
            message.fileUrl = Image.secure_url;
            await message.save();
        }

        // Return the created message instead of a success message
        res.status(201).json(message);
    } catch (error) {
        console.log("ERROR IN MESSAGE CONTROLLER", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getGlobalMessages = async (req, res) => {
    try {
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Find total count for pagination info
        const totalCount = await Message.countDocuments({ isGlobal: true });

        // Get global messages with pagination
        const messages = await Message.find({ isGlobal: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'fullName profilePic')
            .lean();
        
        res.status(200).json({
            messages: messages.reverse(),
            pagination: {
                total: totalCount,
                page,
                limit,
                hasMore: skip + messages.length < totalCount
            }
        });
    } catch (error) {
        console.error("Error fetching global messages:", error);
        res.status(500).json({ message: "Internal server error while fetching global messages" });
    }
};

export const sendGlobalMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const myId = req.user._id;

        const message = new Message({
            sender: myId,
            content,
            isGlobal: true
        });
        await message.save();

        // Populate sender info before sending response
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'fullName profilePic')
            .lean();

        // Get the io instance
        const io = req.app.get('io');
        
        // Emit socket event to notify clients about the new global message
        if (io) {
            io.emit('global_message', populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error sending global message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteGlobalMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        // Find the message
        const message = await Message.findById(messageId);
        
        // Check if message exists and is global
        if (!message || !message.isGlobal) {
            return res.status(404).json({ message: "Global message not found" });
        }
        
        // Check if the user is the sender of the message
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }
        
        // Delete the message
        await Message.findByIdAndDelete(messageId);
        
        // Get the io instance
        const io = req.app.get('io');
        
        // Emit socket event to notify clients about the deletion
        if (io) {
            io.emit('global_message_deleted', { messageId });
        }
        
        res.status(200).json({ message: "Global message deleted successfully" });
    } catch (error) {
        console.error("Error deleting global message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const DeleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        // Find the message
        const message = await Message.findById(messageId);
        
        // Check if message exists
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        
        // Check if the user is the sender of the message
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }
        
        // Delete the message
        await Message.findByIdAndDelete(messageId);
        
        // Get the io instance
        const io = req.app.get('io');
        
        // Emit socket event to notify clients about the deletion
        if (io) {
            io.emit('message_deleted', {
                messageId,
                conversationId: message.receiver.toString()
            });
            console.log("Server emitted message_deleted event:", messageId);
        }
        
        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.error("Error in DeleteMessage controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const UnseenMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { senderId } = req.params;  // Change from conversationId to senderId

        // Count unread messages from a specific sender
        const unseenMessageCount = await Message.countDocuments({
            sender: senderId,     // Messages from specific sender
            receiver: userId,     // Messages to current user
            isRead: false,        // Unread messages only
            isGlobal: { $ne: true } // Exclude global messages
        });

        res.status(200).json({ 
            unseenMessageCount,
            senderId 
        });
    }
    catch (error) {
        console.error("Error in UnseenMessage controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;
    const userId = req.user._id;

    await Message.updateMany(
      { sender: senderId, receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Error marking messages as read" });
  }
};