import { useEffect, useState, useMemo } from "react";
import ChatStore from "../store/useChatStore.js";
import SidebarSkeleton from "./skeleton/Sidebarskeleton.jsx";
import { Plus, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    SelectedUser, 
    setSelectedUser, 
    isUserLoading,
    onlineUsers,
    unreadCounts, // Get unread counts from store
    initializeSocketListeners
  } = ChatStore();
  
  const { authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

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

  if (isUserLoading) return <SidebarSkeleton />;

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
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${SelectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0 my-2">
                <img
                  src={user.profilePic}
                  alt={user.fullName}
                  className="size-10 object-cover rounded-lg"
                />
                {onlineUsers.includes(user._id) ? (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900">
                  </span>):(
                  <span className="absolute bottom-0 right-0 size-3 bg-zinc-900 rounded-full ring-2 ring-zinc-900"/>
                  )}
                
                {/* Show unread message count */}
                {unreadCounts[user._id] > 0 && (
                  <span className="absolute top-0 right-0 min-w-5 h-5 bg-red-500 rounded-full ring-2 ring-zinc-900 text-white text-xs flex items-center justify-center">
                    {unreadCounts[user._id] > 9 ? '9+' : unreadCounts[user._id]}
                  </span>
                )}
              </div>

              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
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