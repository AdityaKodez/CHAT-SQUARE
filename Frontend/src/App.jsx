import NavBar from "./Pages/NavBar";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import PageTransition from "./components/PageTransition";
import { VerificationProvider } from "./context/VerificationContext";
import VerificationPopup from "./components/VerificationPopup"; // Import this
import PrivacyPolicy from "./Pages/PrivacyPolicy";

const App = () => {
  const { theme } = useTheme();
  // Get authUser directly from the hook to ensure reactivity
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore(); 
  const isOnline = useNetworkStatus();
  const [notificationPermission, setNotificationPermission] = useState(null);
  const location = useLocation();
  
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

  // Effect for checking authentication status on initial load
  useEffect(() => {
      if (!authUser) {
        checkAuth(); 
      }
  },[authUser, checkAuth]); // Depend on checkAuth and authUser

  // Effect to fetch blocked users *after* authUser is confirmed
  useEffect(() => {
    if (authUser && !isCheckingAuth) { // Ensure auth check is complete AND user exists
      console.log("[App.jsx] Auth user confirmed, fetching blocked users...");
      ChatStore.getState().fetchBlockedUsers();
    }
  }, [authUser, isCheckingAuth]); // Re-run when authUser or isCheckingAuth changes

  // Effect for socket initialization and listeners
  useEffect(() => {
    const { socket, connectSocket, disconnectSocket } = useAuthStore.getState();
    if (authUser && !socket) {
      console.log("[App.jsx] Connecting socket...");
      connectSocket();
    } else if (!authUser && socket) {
      console.log("[App.jsx] Disconnecting socket...");
      disconnectSocket();
    }

    // Setup listeners if socket exists
    if (socket) {
      console.log("[App.jsx] Initializing socket listeners...");
      ChatStore.getState().initializeSocketListeners();
    }

    // Cleanup listeners on unmount or when socket changes
    return () => {
      if (socket) {
        console.log("[App.jsx] Cleaning up socket listeners...");
        // Remove specific listeners if initializeSocketListeners doesn't handle full cleanup
        // socket.off("..."); 
      }
    };
  }, [authUser]); // Rerun when authUser changes
  
  useEffect(() => {
    if (!isOnline) {
      toast.error('Please check your internet connection.');
    } else {
      toast.success('You are back online!');
    }
  }, [isOnline]);
  
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
      data-theme={theme}
      className="w-screen"
      style={{ 
        position: "relative",
        isolation: "isolate"
      }}
    >
      <NavBar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route 
            path="/" 
            element={
              authUser ? (
                <PageTransition>
                  <Home />
                </PageTransition>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/signup" 
            element={
              authUser ? (
                <Navigate to="/" />
              ) : (
                <PageTransition>
                  <Signup />
                </PageTransition>
              )
            } 
          />
          <Route 
            path="/login" 
            element={
              authUser ? (
                <Navigate to="/" />
              ) : (
                <PageTransition>
                  <Login />
                </PageTransition>
              )
            } 
          />
          <Route 
            path="/profile" 
            element={
              authUser ? (
                <PageTransition>
                  <Profile />
                </PageTransition>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/settings" 
            element={
              <PageTransition>
                <SettingsPage />
              </PageTransition>
            }
          />
          <Route 
            path="/privacy-policy" 
            element={
              <PageTransition>
                <PrivacyPolicy />
              </PageTransition>
            }
          />
          <Route 
            path="*" 
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            } 
          />
        </Routes>
      </AnimatePresence>
    </motion.div>
  );

  return (
    <VerificationProvider>

      <AnimatePresence mode="wait">
        {/* Show loader while checking auth OR if authUser is null but check isn't finished */}
        {isCheckingAuth || (!authUser && isCheckingAuth === undefined) ? ( 
          <Loader key="loader" />
        ) : (
          <>
            {authUser && <NotificationService />}
            <VerificationPopup /> {/* Move it here */}
            <AppContent key="app-content" />
          </>
        )}
      </AnimatePresence>
    </VerificationProvider>
  );
};

export default App;
