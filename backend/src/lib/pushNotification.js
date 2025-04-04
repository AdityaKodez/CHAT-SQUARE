import webpush from 'web-push';
import dotenv from 'dotenv';
import PushSubscription from '../models/PushSubscription.model.js';

dotenv.config();

// VAPID keys should be generated once and stored in environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('VAPID keys must be set in environment variables');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  vapidPublicKey,
  vapidPrivateKey
);

export const addPushSubscription = async (userId, subscription) => {
  try {
    // Check if subscription already exists for this endpoint
    const existingSub = await PushSubscription.findOne({
      'subscription.endpoint': subscription.endpoint
    });

    if (existingSub) {
      // Update existing subscription
      existingSub.userId = userId;
      existingSub.subscription = subscription;
      existingSub.lastUsed = new Date();
      await existingSub.save();
      console.log('Updated existing push subscription for user:', userId);
      return true;
    }

    // Create new subscription
    await PushSubscription.create({
      userId,
      subscription,
      lastUsed: new Date()
    });
    console.log('Added new push subscription for user:', userId);
    return true;
  } catch (error) {
    console.error('Error adding push subscription:', error);
    return false;
  }
};

export const removePushSubscription = async (endpoint) => {
  try {
    const result = await PushSubscription.deleteOne({
      'subscription.endpoint': endpoint
    });
    console.log('Removed push subscription:', result.deletedCount > 0);
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return false;
  }
};

export const sendPushNotification = async (userId, payload) => {
  try {
    // Find all subscriptions for the user
    const subscriptions = await PushSubscription.find({ userId });
    
    if (!subscriptions.length) {
      console.log('No subscriptions found for user:', userId);
      return false;
    }

    let success = false;
    
    // Try to send to all subscriptions
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          typeof payload === 'string' ? payload : JSON.stringify(payload)
        );
        
        // Update last used timestamp
        sub.lastUsed = new Date();
        await sub.save();
        
        success = true;
      } catch (error) {
        console.error('Error sending push notification:', error);
        
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Subscription is no longer valid
          console.log('Removing invalid subscription for user:', userId);
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }

    return success;
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    return false;
  }
};

export const getVapidPublicKey = () => vapidPublicKey;

// Cleanup old subscriptions periodically
export const cleanupOldSubscriptions = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await PushSubscription.deleteMany({
      lastUsed: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} old push subscriptions`);
    }
  } catch (error) {
    console.error('Error cleaning up old subscriptions:', error);
  }
};

// Run cleanup every day
setInterval(cleanupOldSubscriptions, 24 * 60 * 60 * 1000);