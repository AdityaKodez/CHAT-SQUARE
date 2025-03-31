import { useEffect, useState, useMemo } from "react";
import ChatStore from "../store/useChatStore.js";
import SidebarSkeleton from "./skeleton/Sidebarskeleton.jsx";
import { BadgeCheck, Plus, User, Users, Globe } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

const UserStatus = ({ userId }) => {
  const { users, formatLastOnline, onlineUsers } = ChatStore();
  const user = users.find(u => u._id === userId);
  
  if (!user) return null;

  return (
    <p className='text-xs whitespace-nowrap text-right'>
      {onlineUsers.includes(userId) 
        ? "Online now"
        : user.lastOnline 
          ? `${formatLastOnline(user.lastOnline)}`
          : "Never online"
      }
    </p>
  );
};
// Define an array of background color classes
const Colors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    SelectedUser, 
    setSelectedUser, 
    isUserLoading,
    onlineUsers,
    conversations, // Make sure to include this
    unreadCounts,
    initializeSocketListeners,
    globalChatSelected,
    fetchUnseenMessages,
    setGlobalChatSelected
  } = ChatStore();
  
  const { authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Function to get a random color from the Colors array
  function getRandomColor(userId) {
    // If no userId is provided, return the first color
    if (!userId) return Colors[0];
    
    // Simple string hash function for better distribution
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      // Multiply by 31 (common in hash functions) and add character code
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use absolute value to ensure positive index
    const index = Math.abs(hash) % Colors.length;
    
    return Colors[index];
  }

  // Initialize socket listeners when component mounts
  useEffect(() => {
    initializeSocketListeners();
  }, [initializeSocketListeners]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Filter users based on online status
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      // Don't show current user in the list
      if (user._id === authUser?._id) return false;
      // If showOnlineOnly is true, only show online users
      if (showOnlineOnly) return onlineUsers.includes(user._id);
      return true;
    });
  }, [users, showOnlineOnly, onlineUsers, authUser]);
  useEffect(() => {
    // Fetch unseen messages for each user
    filteredUsers.forEach(user => {
      ChatStore.getState().fetchUnseenMessages(user._id);
    });
  }, [filteredUsers]);
  if (isUserLoading) return <SidebarSkeleton />;

  // Function to get the last message for a user
  const getLastMessage = (userId) => {
    if (!conversations || !conversations[userId] || conversations[userId].length === 0) {
      return onlineUsers.includes(userId) ? "Online" : "Offline";
    }
    
    const lastMsg = conversations[userId][conversations[userId].length - 1];
    return lastMsg.content || "No content";
  };


  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 font-work-sans relative">
      {/* Header Section */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-4" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
        </div>
      </div>

      {/* Users List Section */}
      <div className="overflow-y-auto w-full py-3">
        {/* Global Chat Entry - Always at the top */}
        <button
          onClick={() => setGlobalChatSelected()}
          className={`
            w-full p-3 flex items-center gap-3 border-b border-base-300 mb-2
            hover:bg-base-300 transition-colors group
            ${globalChatSelected ? "bg-base-300 ring-1 ring-base-300" : ""}
            ${unreadCounts["global"] > 0 && !globalChatSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}
          `}
        >
          {/* Globe Icon */}
          <div className="relative flex-shrink-0 mx-auto lg:mx-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white">
              <Globe size={20} />
            </div>
            
            {/* Show unread message count if needed */}
            {unreadCounts["global"] > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full ring-1 ring-base-100 text-white text-xs flex items-center justify-center px-1">
                {unreadCounts["global"] > 9 ? '9+' : unreadCounts["global"]}
              </span>
            )}
          </div>

          {/* Global Chat info - only visible on larger screens */}
          <div className="hidden lg:block text-left min-w-0 flex-1 overflow-hidden justify-center items-center mb-3">
            <div className="flex justify-between items-center w-full mb-1">
              <div className="flex items-center gap-1">
                <p className="font-medium truncate mr-1">Global Chat</p>
                <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
              </div>
              <div className="flex-shrink-0 text-right">

              </div>
            </div>
            <div className="text-sm text-zinc-400 truncate">
              Chat with everyone
            </div>
          </div>
        </button>
        
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors group
                ${SelectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                ${unreadCounts[user._id] > 0 && SelectedUser?._id !== user._id ? "bg-blue-50 dark:bg-blue-900/20" : ""}
              `}
            >
              {/* Avatar with status indicators */}
              <div className="relative flex-shrink-0 mx-auto lg:mx-0">
                {
                 user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.fullName}
                    className="w-10 h-10 rounded-full object-cover" 
                  />
                 ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomColor(user._id)}`}>
                    <span className="text-xl text-white">{user.fullName?.charAt(0).toUpperCase()}</span>
                  </div> 
                 )
                }
              
                {/* Online status indicator */}
                {onlineUsers.includes(user._id) ? (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100"></span>
                ) : (
                  <span className="absolute bottom-0 right-0 size-3 bg-zinc-500 rounded-full ring-2 ring-base-100"></span>
                )}
                
                {/* Show unread message count */}
                {unreadCounts[user._id] > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full ring-1 ring-base-100 text-white text-xs flex items-center justify-center px-1">
                    {unreadCounts[user._id] > 9 ? '9+' : unreadCounts[user._id]}
                  </span>
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1 overflow-hidden">
                <div className="flex justify-between items-center w-full mb-1">
                  <div className="flex items-center gap-1">
                  <p className="font-medium truncate mr-1">{user.fullName}</p>
                  {user.isVerified && (
                    <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                </div>
                  <div className="flex-shrink-0 text-right">
                    {
                      onlineUsers.includes(user._id) ? (
                        <span className="text-xs text-green-500 whitespace-nowrap">Online</span>
                      ) : (
                        <UserStatus userId={user._id} />
                      )
                    }
                  </div>
                </div>
                <div className="text-sm text-zinc-400 truncate">
                  {getLastMessage(user._id)}
                </div>
              
                
                {/* Show unread message count for larger screens */}
                {unreadCounts[user._id] > 0 && (
                  <div className="text-xs text-white bg-red-500 rounded-full px-2 py-0.5 inline-block mt-1">
                    {unreadCounts[user._id]} new
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            {showOnlineOnly ? "No online users" : "No users found"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;