import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import useNotificationStore from '@/store/useNotificationStore';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  showBrowserNotification 
} from '@/lib/browserNotifications';
import {
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/lib/pushNotifications';
import { useNavigate } from 'react-router-dom';
import ChatStore from '@/store/useChatStore';
import { toast } from 'react-hot-toast';

const NotificationService = () => {
  const { socket, authUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { setSelectedUser } = ChatStore();
  const navigate = useNavigate();
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);

  // Initialize notifications
  const initializeNotifications = useCallback(async () => {
    if (!authUser || !isNotificationSupported()) return;

    try {
      // Request notification permission
      const permission = await requestNotificationPermission();
      setPermissionRequested(true);

      if (permission === 'granted') {
        // Register service worker
        const registration = await registerServiceWorker();
        if (registration) {
          setServiceWorkerRegistered(true);
          // Subscribe to push notifications
          const subscription = await subscribeToPushNotifications(authUser._id);
          if (!subscription) {
            console.warn('Failed to subscribe to push notifications');
          }
        }
      } else if (permission === 'denied') {
        toast.error(
          'Please enable notifications in your browser settings for a better experience.',
          { duration: 6000, id: 'notification-blocked' }
        );
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      toast.error('Failed to initialize notifications');
    }
  }, [authUser]);

  // Register service worker and request notification permission
  useEffect(() => {
    if (authUser && !permissionRequested) {
      initializeNotifications();
    }
  }, [authUser, permissionRequested, initializeNotifications]);

  // Handle socket notifications
  useEffect(() => {
    if (!socket || !authUser) {
      return;
    }

    const handleNewNotification = (notification) => {
      
      // Process message content - handle both string and object formats
      let messageContent = notification.message;
      if (typeof messageContent === 'object') {
        // If it's an object, stringify it or extract the relevant text
        messageContent = JSON.stringify(messageContent);
      }
      
      // Ensure notification has all required fields
      const normalizedNotification = {
        _id: notification._id || `temp-${Date.now()}`,
        senderId: notification.from || notification.senderId,
        message: messageContent, // Now properly handles both formats
        delivered: notification.timestamp || new Date().toISOString(),
        createdAt: notification.timestamp || new Date().toISOString(),
        read: false
      };
      
      // Add to notification store
      addNotification(normalizedNotification);
      
      // Show browser notification if window not focused
      if (document.hidden) {
        // Double-check permission right before showing notification
        const permission = getNotificationPermission();
        
        if (permission === 'granted') {
          try {
            const notificationTitle = 'New Message';
            const notificationOptions = {
              body: messageContent, // Use the processed message content
              tag: `notification-${normalizedNotification.senderId}`,
              requireInteraction: true,
              icon: '/favicon.svg',
              onClick: () => {
                window.focus();
                setSelectedUser({ _id: normalizedNotification.senderId });
                navigate('/');
              }
            };
            
            const browserNotification = showBrowserNotification(notificationTitle, notificationOptions);
          } catch (error) {
            console.error('Error showing browser notification:', error);
          }
        }
      }
      
      // Acknowledge notification receipt
      if (socket && notification._id) {
        socket.emit('notification_received', { 
          notificationId: notification._id, 
          received: true 
        });
      }
    };

    // Remove any existing listeners to prevent duplicates
    socket.off('new_notification');
    socket.on('new_notification', handleNewNotification);
    
    // Fetch unread notifications
    const fetchInitialNotifications = async () => {
      try {
        // Only fetch notifications if user is authenticated
        if (authUser) {
          await useNotificationStore.getState().fetchUnreadNotifications();
        } else {
        }
      } catch (error) {
        console.error('Failed to fetch initial notifications:', error);
        toast.error('Failed to load notifications');
      }
    };
    
    fetchInitialNotifications();

    // Cleanup
    return () => {
      socket.off('new_notification');
      if (serviceWorkerRegistered) {
        unsubscribeFromPushNotifications().catch(console.error);
      }
    };
  }, [socket, authUser, addNotification, navigate, setSelectedUser, serviceWorkerRegistered]);

  // This component doesn't render anything
  return null;
};

export default NotificationService;