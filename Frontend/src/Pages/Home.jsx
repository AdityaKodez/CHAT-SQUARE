import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import ChatStore from '../store/useChatStore';
import Sidebar from './Sidebar';
import GlobalChat from '../components/GlobalChat';
import ChatContainer from './ChatContainer';
import Nochatselected from './Nochatselected';

const Home = () => {
  const { 
    SelectedUser, 
    globalChatSelected, 
    getMessages,
    getGlobalMessages,
    initializeSocketListeners 
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

    // Cleanup function
    return () => {
      if (socket) {
        socket.off("user-updated");
        socket.off("new_message");
        socket.off("global_message");
        socket.off("typing");
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
        </div>
      </div>
    </div>
  );
};
export default Home; 