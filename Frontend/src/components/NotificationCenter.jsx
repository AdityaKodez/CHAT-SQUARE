import { useState, useEffect } from 'react';
import { Bell, X, Check, BellRing, Loader2 } from 'lucide-react';
import useNotificationStore from '@/store/useNotificationStore';
import { useNavigate } from 'react-router-dom';
import ChatStore from '../store/useChatStore';
import { formatDistanceToNow } from 'date-fns';
import { getNotificationPermission, requestNotificationPermission } from '@/lib/browserNotifications';
import { useAuthStore } from '@/store/useAuthStore';
// Add this at the top of your file, after the imports
const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());
  const { 
    notifications, 
    fetchUnreadNotifications, 
    markAsRead, 
    deleteNotifications,
    isLoading 
  } = useNotificationStore();

  
 
  useEffect(() => {
    // Always check permission on mount
    setNotificationPermission(getNotificationPermission());
    
    // And also when dropdown opens
    if (isOpen) {
      setNotificationPermission(getNotificationPermission());
    }
  }, [isOpen]);
  const getFormattedTime = (notification) => {
  // Check for different possible date fields
  const dateValue = notification.createdAt || notification.timestamp || notification.date;
  
  if (!dateValue) return 'Unknown time';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Unknown time';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Date formatting error:', error, notification);
    return 'Unknown time';
  }
};
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching unread notifications...');
        await fetchUnreadNotifications();
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    
    fetchData();
    // Set up polling for notifications
    const interval = setInterval(fetchData, 15000); // Poll every 15 seconds for more responsive updates
    
    return () => clearInterval(interval);
  }, [fetchUnreadNotifications]);
  
  // Listen for socket events that might trigger notification updates
  useEffect(() => {
    const { socket } = useAuthStore.getState();
    if (socket) {
      // When a new notification is received, refresh the notifications list
      const handleNewNotification = () => {
        fetchUnreadNotifications();
      };
      
      socket.on('new_notification', handleNewNotification);
      
      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [fetchUnreadNotifications]);
  const { setSelectedUser } = ChatStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);
  
  const handleNotificationClick = async (notification) => {
    // Mark this notification as read
    await markAsRead([notification._id]);
    
    // Navigate to the chat with this sender
    if (notification.from) {
      setSelectedUser({ _id: notification.from });
      navigate('/');
    }
    
    setIsOpen(false);
  };
  
  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n._id);
      
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };
  
  const handleClearAll = async () => {
    const notificationIds = notifications.map(n => n._id);
    if (notificationIds.length > 0) {
      await deleteNotifications(notificationIds);
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Handle requesting browser notification permission
  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };
  
  // Add this handler function
  const handleBellClick = () => {
    setIsOpen(!isOpen);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };
  
  return (

    <div className="relative">
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
          }
          .shake-animation {
            animation: shake 0.5s ease-in-out;
          }
        `}
      </style>
      
      <button 
        className={`btn btn-ghost btn-circle relative ${isShaking ? 'shake-animation' : ''}`}
        onClick={handleBellClick}
      >
        <Bell size="1rem" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <>
          {/* Mobile view (centered) */}
          <div className="fixed inset-x-0 top-16 flex justify-center z-50 sm:hidden">
            <div className="w-80 max-w-[90vw] bg-base-100 rounded-lg shadow-lg border border-base-300 max-h-[70vh] overflow-y-auto">
              <div className="p-3 border-b border-base-300 flex justify-between items-center">
                <h3 className="font-medium">Notifications</h3>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-ghost btn-xs"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    <Check size={14} />
                    <span className="text-xs">Mark all read</span>
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs"
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                  >
                    <X size={14} />
                    <span className="text-xs">Clear all</span>
                  </button>
                </div>
              </div>
              
              {/* Notification content for mobile */}
              {notificationPermission !== 'granted' && (
                <div className="p-3 border-b border-base-300">
                  <button 
                    className="btn btn-sm btn-primary w-full flex items-center justify-center gap-2"
                    onClick={handleRequestPermission}
                  >
                    <BellRing size={16} />
                    <span>Enable Browser Notifications</span>
                  </button>
                </div>
              )}
              
              {/* Notification list for mobile */}
              <div className="divide-y divide-base-300">
                {isLoading ? (
                  <div className="p-3 flex w-full items-center justify-center">
                       <div className="flex justify-start">
                <div className=" rounded-xl p-3 max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-3 text-center">No notifications</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-3 cursor-pointer hover:bg-base-200 ${notification.read ? 'opacity-50' : ''}`}
                      onClick={() => handleNotificationClick(notification)} 
                      disabled={notificationPermission === 'denied'}
                    >
                      <p className="text-sm">{notification.message}</p>
                        
                      <p className="text-xs text-gray-500">
  {getFormattedTime(notification)}
</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Desktop/tablet view (dropdown) */}
          <div className="absolute right-0 mt-2 w-80 bg-base-100 rounded-lg shadow-lg z-50 border border-base-300 max-h-[70vh] overflow-y-auto hidden sm:block">
            <div className="p-3 border-b border-base-300 flex justify-between items-center">
              <h3 className="font-medium">Notifications</h3>
              <div className="flex gap-2">
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <Check size={14} />
                  <span className="text-xs">Mark all read</span>
                </button>
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                >
                  <X size={14} />
                  <span className="text-xs">Clear all</span>
                </button>
              </div>
            </div>
            
            {/* Notification permission for desktop */}
            {notificationPermission !== 'granted' && (
              <div className="p-3 border-b border-base-300">
                <button 
                  className="btn btn-sm btn-primary w-full flex items-center justify-center gap-2"
                  onClick={handleRequestPermission}
                >
                  <BellRing size={16} />
                  <span>Enable Browser Notifications</span>
                </button>
              </div>
            )}
            
            {/* Notification list for desktop */}
            <div className="divide-y divide-base-300">
              {isLoading ? (
                <div className="p-3 flex w-full justify-center items-center">
                       <div className="flex justify-start">
                <div className=" rounded-xl p-3 max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
                </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-3 text-center">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-3 cursor-pointer hover:bg-base-200 ${notification.read ? 'opacity-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)} 
                    disabled={notificationPermission === 'denied'}
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500">
  {getFormattedTime(notification)}
</p>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </>
      )}
    </div>
  );
};

export default NotificationCenter;