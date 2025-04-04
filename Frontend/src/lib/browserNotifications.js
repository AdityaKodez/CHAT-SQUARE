export const isNotificationSupported = () => {
  return 'Notification' in window;
};

// Check current notification permission status
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }
  
  return Notification.permission;
};

// Show a browser notification
export const showBrowserNotification = (title, options = {}) => {
  console.log('Attempting to show notification:', title, options);
  
  // Double check permission right before showing
  if (!isNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Browser notifications permission not granted:', Notification.permission);
    return null;
  }
  
  try {
    const defaultOptions = {
      icon: '/favicon.svg', // Default icon
      badge: '/favicon.svg',
      silent: false,
      requireInteraction: true, // Make notification persist until user interacts with it
    };
    
    // Remove onClick from options before creating notification
    const { onClick, ...notificationOptions } = options;
    
    // Create the notification
    const notification = new Notification(title, { ...defaultOptions, ...notificationOptions });
    
    // Add click handler after creating the notification
    notification.onclick = (event) => {
      event.preventDefault(); // Prevent default behavior
      window.focus();
      notification.close();
      console.log('Notification clicked', event);
      if (onClick && typeof onClick === 'function') {
        onClick(event);
      }
    };
    
    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};