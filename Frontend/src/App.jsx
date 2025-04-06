import NavBar from "./Pages/NavBar";
import { Navigate, Route, Routes } from "react-router-dom";
import Signup from "./Pages/Signup.jsx";
import Login from "./Pages/Login.jsx";
import Profile from "./Pages/Profile.jsx";
import Home from "./Pages/Home.jsx";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect, useState } from "react"; // Added useState
import { motion, AnimatePresence } from "framer-motion";
import NotFound from "./Pages/NotFound";
import { useTheme } from "./store/useTheme.js";
import{Toaster,toast} from "react-hot-toast";
import useNetworkStatus from "./const/Network";
import ChatStore from "./store/useChatStore";
import SettingsPage from "./Pages/Settings.jsx";
import NotificationService from "./components/NotificationService";
import { getNotificationPermission } from "./lib/browserNotifications"; // Import this

const App = () => {
  const { theme } = useTheme();
  const { authUser, isCheckingAuth } = useAuthStore();
  const isOnline = useNetworkStatus();
  const [notificationPermission, setNotificationPermission] = useState(null);
  
  // Check notification permission on mount and periodically
  useEffect(() => {
    if (authUser) {
      const checkPermission = async () => {
        // Get current permission
        const permission = getNotificationPermission();
        setNotificationPermission(permission);
        
        // If permission is not determined yet, request it
        if (permission === 'default') {
          console.log('Requesting notification permission');
          const newPermission = await requestNotificationPermission();
          setNotificationPermission(newPermission);
          console.log('New notification permission:', newPermission);
        }
      };
      
      // Check immediately
      checkPermission();
      
      // Then check periodically (in case user changes browser settings)
      const permissionInterval = setInterval(checkPermission, 30000);
      return () => clearInterval(permissionInterval);
    }
  }, [authUser]);
  
  useEffect(() => {
    // Initialize socket listeners when socket is available
    const { socket } = useAuthStore.getState();
    if (socket) {
      ChatStore.getState().initializeSocketListeners();
    }
  }, [useAuthStore.getState().socket]);
  
  useEffect(() => {
    if (!isOnline) {
      toast.error('Please check your internet connection.');
    } else {
      toast.success('You are back online!');
    }
  }, [isOnline]);
  
  useEffect(() => {
    const checkAuth = async () => {
      if (isCheckingAuth) {
        await useAuthStore.getState().checkAuth();
      }
    };
    const timer = setTimeout(checkAuth, 2000);
    return () => clearTimeout(timer); // Cleanup timeout on unmount
  }, [isCheckingAuth]);

  // Show notification blocked warning if needed
  useEffect(() => {
    if (authUser && notificationPermission === 'denied') {
      toast.error(
        'Notifications are blocked. Please enable them in your browser settings for a better experience.',
        { duration: 6000, id: 'notification-blocked' }
      );
    }
  }, [authUser, notificationPermission]);

  console.log({ authUser });

  // Loader Component with smooth three-bar animation
  const Loader = () => (
    <motion.div
      className="loader flex items-center justify-center h-screen w-screen bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }} // Smooth exit animation
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="flex space-x-2">
        {/* Bar 1 */}
        <motion.div
          className="w-4 h-10 bg-white rounded"
          animate={{
            y: [0, -20, 0], // Move up and down
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            delay: 0, // No delay for the first bar
          }}
          
        />
        {/* Bar 2 */}
        <motion.div
          className="w-4 h-10 bg-white rounded"
          animate={{
            y: [0, -20, 0], // Move up and down
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            delay: 0.2, // Slight delay for the second bar
          }}
        />
        {/* Bar 3 */}
        <motion.div
          className="w-4 h-10 bg-white rounded"
          animate={{
            y: [0, -20, 0], // Move up and down
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            delay: 0.4, // More delay for the third bar
          }}
        />
      </div>
    </motion.div>
  );

  // Main App Content with smooth transitions
  const AppContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-screen"
      data-theme={theme}
    >
      <NavBar />
   
      <Routes>
        <Route path="/" element={
          authUser ? <Home /> : <Navigate to="/login" />
        } />
        <Route path="/signup" element={
          authUser ? <Navigate to="/" /> : <Signup />
        } />
        <Route path="/login" element={
          authUser ? <Navigate to="/" /> : <Login />
        } />
        <Route path="/profile" element={
          authUser ? <Profile /> : <Navigate to="/login" />
        } />
        <Route path="/settings" element={<SettingsPage/>}/>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {isCheckingAuth ? (
        <Loader key="loader" />
      ) : (
        <>
          {authUser && <NotificationService />}
          <AppContent key="app-content" />
          <Toaster 
            position="top-right"
            toastOptions={{
              className: '!bg-primary!text-white text-sm font-poppins',
              iconTheme: {
                primary: 'white',
                secondary: 'green',
              },
            }}
          />
         
        </>
      )}
    </AnimatePresence>
  );
};

export default App;
