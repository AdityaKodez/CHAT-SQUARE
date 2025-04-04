import axios from './axios'; // Using our configured axios instance

const convertVapidKey = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  console.warn('Push notifications are not supported in this browser');
  return null;
};

export const subscribeToPushNotifications = async (userId) => {
  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready, checking for existing subscription');
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    console.log('Existing subscription:', !!subscription);

    if (!subscription) {
      // Get VAPID public key from backend
      console.log('No subscription found, requesting VAPID public key');
      const { data: vapidPublicKey } = await axios.get('/notification/vapid-public-key');
      
      if (!vapidPublicKey) {
        console.error('Failed to get VAPID public key from server');
        throw new Error('Failed to get VAPID public key');
      }

      console.log('Converting VAPID key');
      const convertedVapidKey = convertVapidKey(vapidPublicKey);

      try {
        console.log('Attempting to subscribe to push notifications');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        console.log('Push notification subscription successful');
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        return null;
      }
    }

    // Send subscription to backend
    console.log('Sending subscription to server');
    await axios.post('/notification/subscribe', {
      subscription,
      userId
    });

    console.log('Push subscription sent to server successfully');
    return subscription;
  } catch (error) {
    console.error('Error in subscribeToPushNotifications:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    return null;
  }
};

export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Notify backend about unsubscription
      try {
        await axios.post('/notification/unsubscribe', {
          endpoint: subscription.endpoint,
        });
        console.log('Successfully unsubscribed on server');
      } catch (error) {
        console.error('Failed to unsubscribe on server:', error);
      }

      // Unsubscribe locally regardless of server response
      await subscription.unsubscribe();
      console.log('Successfully unsubscribed locally');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};