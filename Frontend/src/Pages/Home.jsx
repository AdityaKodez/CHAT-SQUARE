import { useEffect, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import ChatStore from "../store/useChatStore";
import Sidebar from "./Sidebar";
import GlobalChat from "../components/GlobalChat";
import ChatContainer from "./ChatContainer";
import Nochatselected from "./Nochatselected";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Home = () => {
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
    initializeChat();

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
      socket.on("new_notification", (notification) => {
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
          });
        }
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

  // Determine which component to render
  const renderChatComponent = () => {
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
          <ToastContainer /> {/* Add this for toast notifications */}
        </div>
      </div>
    </div>
  );
};

export default Home;