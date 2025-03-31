import { MessageSquare} from 'lucide-react'
import ChatStore  from "../store/useChatStore.js"
import Nochatselected from './Nochatselected.jsx'
import ChatContainer from './ChatContainer.jsx'
import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'
import Sidebar from './Sidebar.jsx'
import GlobalChat from '../components/GlobalChat.jsx'

const Home = () => {
  const {SelectedUser, globalChatSelected} = ChatStore()
// In your component that initializes the socket listeners
useEffect(() => {
  // Initialize socket listeners
  ChatStore.getState().initializeSocketListeners();
  
  return () => {
    // Clean up socket listeners
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("user-updated");
    }
  };
}, []);
    return (
   <div className="h-screen bg-base-200 w-full">
    <div className="flex justify-center items-center pt-17 px-0 h-full">
      <div className="bg-base-100 shadow-cl w-full h-full flex">
   <Sidebar/>
  {globalChatSelected ? <GlobalChat/> : (!SelectedUser ? <Nochatselected/> : <ChatContainer/>)}
      </div>
    </div>
   </div>
  )
}

export default Home

