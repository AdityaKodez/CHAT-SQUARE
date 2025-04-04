import Notification from "../models/Notification.model.js";
import User from "../models/user.model.js";
import { 
  getVapidPublicKey, 
  addPushSubscription, 
  removePushSubscription,
  sendPushNotification 
} from "../lib/pushNotification.js";

// Get VAPID public key
export const getVapidKey = async (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.status(200).send(publicKey);
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({ error: 'Failed to get VAPID key' });
  }
};

// Subscribe to push notifications
export const subscribe = async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    addPushSubscription(userId, subscription);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
};

// Unsubscribe from push notifications
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    const removed = removePushSubscription(endpoint);
    if (removed) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
};

// Get all unread notifications for the current user
export const getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`Fetching unread notifications for user: ${userId}`);
    
    const notifications = await Notification.find({
      receiverId: userId,
      read: false
    }).sort({ createdAt: -1 });
    
    const enhancedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        try {
          const sender = await User.findById(notification.senderId).select("fullName");
          return {
            _id: notification._id,
            from: notification.senderId,
            message: notification.message,
            timestamp: notification.createdAt,
            read: notification.read,
            senderName: sender ? sender.fullName : 'Unknown User'
          };
        } catch (error) {
          console.error(`Error enhancing notification ${notification._id}:`, error);
          return notification;
        }
      })
    );
    
    console.log(`Found ${enhancedNotifications.length} unread notifications`);
    return res.status(200).json(enhancedNotifications);
  } catch (error) {
    console.error('Error in getUnreadNotifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notifications as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user._id;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid notification IDs' });
    }
    
    console.log(`Marking notifications as read: ${notificationIds.join(', ')}`);
    
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, receiverId: userId },
      { $set: { read: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} notifications`);
    return res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// Mark notifications as delivered
export const markAsDelivered = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user._id;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid notification IDs' });
    }
    
    console.log(`Marking notifications as delivered: ${notificationIds.join(', ')}`);
    
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, receiverId: userId },
      { $set: { delivered: true } }
    );
    
    // Try to send push notification for each undelivered notification
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
      delivered: false
    });

    for (const notification of notifications) {
      try {
        await sendPushNotification(notification.receiverId, {
          title: 'New Message',
          body: notification.message,
          data: {
            notificationId: notification._id.toString(),
            senderId: notification.senderId.toString()
          }
        });
      } catch (error) {
        console.error(`Failed to send push notification for ${notification._id}:`, error);
      }
    }
    
    console.log(`Updated ${result.modifiedCount} notifications`);
    return res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error in markAsDelivered:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as delivered' });
  }
};

// Delete notifications
export const deleteNotifications = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user._id;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid notification IDs' });
    }
    
    console.log(`Deleting notifications: ${notificationIds.join(', ')}`);
    
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      receiverId: userId
    });
    
    console.log(`Deleted ${result.deletedCount} notifications`);
    return res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error in deleteNotifications:', error);
    return res.status(500).json({ error: 'Failed to delete notifications' });
  }
};
