import NavBar from "./Pages/NavBar";
import { Navigate, Route, Routes } from "react-router-dom";
import Signup from "./Pages/Signup.jsx";
import Login from "./Pages/Login.jsx";
import Profile from "./Pages/Profile.jsx";
import Settings from "./Pages/Settings.jsx";
import Home from "./Pages/Home.jsx";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence for exit animations AnimatePresence } from "framer-motion"; // Import AnimatePresence for exit animations
import NotFound from "./Pages/NotFound";
import { useTheme } from "./store/useTheme.js";
import{Toaster,toast} from "react-hot-toast";
import useNetworkStatus from "./const/Network";
import ChatStore from "./store/useChatStore";
const App = () => {
  const { theme } = useTheme();
  const { authUser, isCheckingAuth } = useAuthStore();
  const isOnline = useNetworkStatus();
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
    {/* Toaster for displaying notifications */}  {/* Add toast.success/error/info/warning/error() */}  {/* Example: toast.success('Account created successfully!') */}  {/* Toast will automatically disappear after 3 seconds */}  {/* You can customize toast duration and position using toast.configure() */}  {/* Example: toast.configure({autoClose: 5000 }) */}
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
        <Route path="/settings" element={
          authUser ? <Settings /> : <Navigate to="/login" />
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {isCheckingAuth ? (
        <Loader key="loader" /> // Use key to ensure proper mount/unmount
      ) : (
        <AppContent key="app-content" />
      )}
    </AnimatePresence>
  );
};

export default App;
