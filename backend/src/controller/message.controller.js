import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import Notification from "../models/Notification.model.js";
import cache from "../lib/cache.js";
import { getOnlineUsers } from "../lib/socket.js";
export const getUserForSidebar = async (req, res) => {
    try {
        const LoggedInUserId = req.user._id;
        const skip = parseInt(req.query.skip) || 0;
        const limit = parseInt(req.query.limit) || 10;

        // TEMPORARY: Disable cache to debug online users sorting
        // const onlineUsers = getOnlineUsers();
        // const onlineUsersKey = onlineUsers.sort().join(','); // Create a stable key from online users
        // const cacheKey = `users:${LoggedInUserId}:${skip}:${limit}:${onlineUsersKey.slice(0, 50)}`; // Limit key length
        
        // // Try to get from cache first - reduced cache time due to online status dependency
        // const cachedData = cache.get(cacheKey);
        // if (cachedData) {
        //     console.log(`Cache hit for key: ${cacheKey}`);
        //     return res.status(200).json(cachedData);
        // }
        
        console.log('🔥 DEBUGGING: Cache disabled for online users sorting');
        const cacheKey = 'disabled'; // Placeholder

        console.log(`Cache miss for key: ${cacheKey}, fetching from database`);

        // Get total number of users except the logged-in one (cache this too)
        const totalUsersCacheKey = `totalUsers:${LoggedInUserId}`;
        let totalUsers = cache.get(totalUsersCacheKey);
        
        if (!totalUsers) {
            totalUsers = await User.countDocuments({ _id: { $ne: LoggedInUserId } });
            cache.set(totalUsersCacheKey, totalUsers, 2 * 60 * 1000); // Cache for 2 minutes
        }

        // Get currently online users from socket
        const onlineUserIds = getOnlineUsers();
        console.log(`🟢 Online users count: ${onlineUserIds.length}`);
        console.log(`🟢 Online user IDs:`, onlineUserIds);
        console.log(`🔍 LoggedInUserId:`, LoggedInUserId.toString());
        
        // Convert online user IDs to strings for comparison
        const onlineUserIdsAsStrings = onlineUserIds.map(id => id.toString());
        console.log(`🔄 Online user IDs as strings:`, onlineUserIdsAsStrings);
        
        // SIMPLIFIED APPROACH: Get all users first, then sort with JavaScript
        const allUsersFromDB = await User.find(
            { _id: { $ne: LoggedInUserId } },
            {
                fullName: 1,
                _id: 1,
                profilePic: 1,
                lastOnline: 1,
                description: 1,
                isVerified: 1,
                blockedUsers: 1,
                createdAt: 1,
                updatedAt: 1
            }
        ).populate({
            path: 'blockedUsers',
            select: 'fullName profilePic'
        }).lean();
        
        console.log(`📋 Found ${allUsersFromDB.length} total users from DB`);
        
        // Add online status and priority using JavaScript
        const usersWithOnlineStatus = allUsersFromDB.map(user => {
            const userIdString = user._id.toString();
            const isOnline = onlineUserIdsAsStrings.includes(userIdString);
            const hasGoldenTick = user.isVerified && user.fullName === "Faker";
            
            let sortPriority;
            if (isOnline) {
                if (hasGoldenTick) {
                    sortPriority = 0; // Online golden tick users
                } else if (user.isVerified) {
                    sortPriority = 1; // Online verified users  
                } else {
                    sortPriority = 2; // Online non-verified users
                }
            } else {
                if (hasGoldenTick) {
                    sortPriority = 10; // Offline golden tick users
                } else if (user.isVerified) {
                    sortPriority = 11; // Offline verified users
                } else {
                    sortPriority = 12; // Offline non-verified users
                }
            }
            
            return {
                ...user,
                isOnline,
                hasGoldenTick,
                sortPriority
            };
        });
        
        console.log(`🔄 Added online status to all users`);
        
        // Sort users by priority, then by name
        const sortedUsers = usersWithOnlineStatus.sort((a, b) => {
            if (a.sortPriority !== b.sortPriority) {
                return a.sortPriority - b.sortPriority;
            }
            return a.fullName.localeCompare(b.fullName);
        });
        
        console.log(`🔄 Sorted users by priority`);
        
        // Apply pagination after sorting
        const allUsers = sortedUsers.slice(skip, skip + limit);

        // DEBUG: Log aggregation results
        console.log(`📋 Aggregation results (${allUsers.length} users):`);
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.fullName} - Online: ${user.isOnline} - Priority: ${user.sortPriority || 'undefined'}`);
        });

        const FilteredUser = allUsers.map(user => {
            const isBlockedViewer = user.blockedUsers && Array.isArray(user.blockedUsers) 
                ? user.blockedUsers.some(blockedId => blockedId.equals(LoggedInUserId))
                : false;
            
            const { blockedUsers, ...userWithoutBlockedList } = user;

            return {
                ...userWithoutBlockedList,
                isBlockedViewer
            };
        });

        const responseData = {
            users: FilteredUser,
            pagination: {
                totalUsers,
                skip,
                limit,
                count: FilteredUser.length,
                hasNextPage: skip + limit < totalUsers,
                hasPrevPage: skip > 0
            }
        };

        // Cache the response for 30 seconds due to real-time online status
        cache.set(cacheKey, responseData, 30 * 1000);

        res.status(200).json(responseData);

    } catch (error) {
        console.log("Error in getUserForSidebar:", error);
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
        const senderId = req.user._id; // Renamed for clarity
        const { userId: receiverId } = req.params; // Renamed for clarity

        // Fetch receiver's document to check their blocked list
        const receiver = await User.findById(receiverId).select('blockedUsers');
        if (!receiver) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        // Check if the receiver has blocked the sender
        if (receiver.blockedUsers.some(blockedId => blockedId.equals(senderId))) {
            return res.status(403).json({ message: "You cannot send messages to this user." });
        }
        
        // Check if the sender has blocked the receiver (optional but good practice)
        const sender = await User.findById(senderId).select('blockedUsers');
         if (sender.blockedUsers.some(blockedId => blockedId.equals(receiverId))) {
            return res.status(403).json({ message: "Unblock the user to send messages." });
        }


        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            content
        });
        // ... rest of the code for saving message and handling fileUrl ...

        await message.save();

        if (fileUrl) {
            const Image = await cloudinary.uploader.upload(fileUrl);
            message.fileUrl = Image.secure_url;
            await message.save();
        }

        // Populate sender details before sending back
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'fullName profilePic _id') // Populate sender info
            .lean(); // Use lean for performance

        // Emit socket event (handled in socket.js, but good to be aware)

        res.status(201).json(populatedMessage); // Return the populated message
    } catch (error) {
        console.log("ERROR IN sendMessage CONTROLLER", error); // Corrected log message
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

export const markMessagesAsSeen = async (req, res) => {
  console.log("Backend: Entered markMessagesAsSeen controller"); // Log controller entry
  try {
    const userId = req.user._id;
    const { senderId } = req.body; // expect senderId from frontend
    console.log(`Backend: Marking messages from sender ${senderId} as seen for receiver ${userId}`); // Log IDs

    if (!senderId) {
       console.log("Backend: senderId missing in request body for markMessagesAsSeen");
       return res.status(400).json({ message: "Sender ID is required" });
    }

    // Update messages from senderId to current user that have not yet been seen
    const result = await Message.updateMany(
      {
        sender: senderId,
        receiver: userId,
        isRead: false,
        isGlobal: { $ne: true } // Exclude global messages
      },
      { $set: { isRead: true } }
    );

    console.log(`Backend: Updated ${result.modifiedCount} messages as seen.`);
    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    res.status(500).json({ message: "Error marking messages as seen" });
  }
};

export const EditMessage = async (req, res) => {
    try {
        const { messageId, newContent } = req.body;
        const userId = req.user._id;

        // Find the message
        const message = await Message.findById(messageId);
        
        // Check if message exists
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        
        // Check if the user is the sender of the message
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }
        // Update the message content
        message.content = newContent;
        await message.save();

        // Get the io instance
        res.status(200).json({ message: "Message updated successfully", updatedMessage: message });
    } catch (error) {
        console.error("Error in EditMessage controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};