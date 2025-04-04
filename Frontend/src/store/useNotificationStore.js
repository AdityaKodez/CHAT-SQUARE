import { create } from 'zustand';
import axiosInstance from '../lib/axios';
import toast from 'react-hot-toast';

const useNotificationStore = create((set) => ({
  notifications: [],
  isLoading: false,
  
  fetchUnreadNotifications: async () => {
    set({ isLoading: true });
    try {
      // Add error handling and logging
      const response = await axiosInstance.get('/notification/unread');
      console.log('Notification response:', response.data);
      set({ notifications: response.data });
    } catch (error) {
      console.error('Error details:', error.response || error);
      toast.error('Failed to fetch notifications');
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Mark notifications as read
  markAsRead: async (notificationIds) => {
    try {
      await axiosInstance.post('/notification/mark-read', { notificationIds });
      set(state => ({
        notifications: state.notifications.map(notification => 
          notificationIds.includes(notification._id) 
            ? { ...notification, read: true } 
            : notification
        )
      }));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  },
  
  // Mark notifications as delivered
  markAsDelivered: async (notificationIds) => {
    try {
      await axiosInstance.post('/notification/mark-delivered', { notificationIds });
      set(state => ({
        notifications: state.notifications.map(notification => 
          notificationIds.includes(notification._id) 
            ? { ...notification, delivered: true } 
            : notification
        )
      }));
    } catch (error) {
      console.error('Error marking notifications as delivered:', error);
    }
  },
  
  // Delete notifications
  deleteNotifications: async (notificationIds) => {
    try {
      await axiosInstance.post('/notification/delete', { notificationIds });
      set(state => ({
        notifications: state.notifications.filter(
          notification => !notificationIds.includes(notification._id)
        )
      }));
      toast.success('Notifications deleted');
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  },
  
  // Add a new notification (from socket)
  addNotification: (notification) => {
    // Normalize notification data structure
    const normalizedNotification = {
      _id: notification._id || `temp-${Date.now()}`,
      from: notification.from || notification.senderId,
      senderId: notification.from || notification.senderId,
      message: notification.message || '',
      timestamp: notification.timestamp || notification.createdAt || new Date().toISOString(),
      createdAt: notification.createdAt || notification.timestamp || new Date().toISOString(),
      read: notification.read || false
    };
    
    // Check if notification already exists to prevent duplicates
    set(state => {
      // If notification with this ID already exists, don't add it again
      if (state.notifications.some(n => n._id === normalizedNotification._id)) {
        return state;
      }
      
      return {
        notifications: [normalizedNotification, ...state.notifications]
      };
    });
  },
  
  // Clear all notifications
  clearNotifications: () => {
    set({ notifications: [] });
  }
}));

export default useNotificationStore;