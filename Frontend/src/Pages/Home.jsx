import { useEffect, useCallback } from "react";
import ChatStore from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Sidebar from "./Sidebar";
import GlobalChat from "../components/GlobalChat";
import ChatContainer from "./ChatContainer";
import Nochatselected from "./Nochatselected";
import { Toaster, toast } from "react-hot-toast";

const Home = () => {
  // Add this state to store pending notifications
  const [pendingNotifications, setPendingNotifications] = useState([]);
  
  const {
    SelectedUser,
    globalChatSelected,
    getMessages,
    getGlobalMessages,
    initializeSocketListeners,
  } = ChatStore();

  const { socket } = useAuthStore();

  // Initialize socket and fetch data
  const initializeChat = useCallback(async () => {
    try {
      initializeSocketListeners();
      await getGlobalMessages({ page: 1 });
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  }, [initializeSocketListeners, getGlobalMessages]);

  useEffect(() => {
    // Initialize chat system when component mounts
    const initChat = async () => {
      if (useAuthStore.getState().authUser) {
        await ChatStore.getState().initializeChat();
      }
    };
    
    initChat();
    
    // Clean up on unmount
    return () => {
      // Any cleanup if needed
    };
  }, []);

  useEffect(() => {
    // Request browser notification permission
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted");
        }
      });
    }

    // Listen for new_notification event
    if (socket) {
      // Remove any existing listeners first
      socket.off("new_notification");
      
      // Then add the new listener
      socket.on("new_notification", (notification) => {
        console.log("Received notification:", notification);
        
        // If we can't display it now, queue it
        if (!document.hasFocus() || !Notification.permission === "granted") {
          setPendingNotifications(prev => [...prev, notification]);
          return;
        }
        let { from, message } = notification;
        // Convert message to string if needed
        if (typeof message !== "string") {
          message = JSON.stringify(message);
        }
        // Show browser notification if tab is not active
        if (document.hidden && Notification.permission === "granted") {
          new Notification("New Message", {
            body: message,
            icon: "/favicon.svg",
          });
        } else {
          toast.info(message, {
            position: "top-right",
            autoClose: 3000,
            className: "bg-base-100 text-base-content font-work-sans shadow-md rounded-lg",
            bodyClassName: "text-sm",
            progressClassName: "bg-blue-500",
          });
        }
        
        // After displaying notification
        console.log("Notification displayed:", message);
      });
    }

    // Cleanup function
    return () => {
      if (socket) {
        socket.off("user-updated");
        socket.off("new_message");
        socket.off("global_message");
        socket.off("typing");
        socket.off("new_notification"); // Clean up new listener
      }
    };
  }, [socket, initializeChat]);

  // Process any pending notifications
  useEffect(() => {
    if (pendingNotifications.length > 0 && socket) {
      console.log("Processing pending notifications:", pendingNotifications);
      pendingNotifications.forEach(notification => {
        let { message } = notification;
        if (typeof message !== "string") {
          message = JSON.stringify(message);
        }
        
        toast.info(message, {
          position: "top-right",
          autoClose: 3000,
          className: "bg-base-100 text-base-content font-work-sans shadow-md rounded-lg",
          bodyClassName: "text-sm",
          progressClassName: "bg-blue-500",
        });
      });
      
      setPendingNotifications([]);
    }
  }, [pendingNotifications, socket]);
  
  // In your socket listener
  useEffect(() => {
    // Determine which component to render
    if (globalChatSelected) {
      return <GlobalChat />;
    }
    if (!SelectedUser) {
      return <Nochatselected />;
    }
    return <ChatContainer />;
  };

  return (
    <div className="h-screen bg-base-200 w-full">
      <div className="flex justify-center items-center pt-17 px-0 h-full">
        <div className="bg-base-100 shadow-cl w-full h-full flex">
          <Sidebar />
          {renderChatComponent()}
        </div>
      </div>
    </div>
  );
};

export default Home;