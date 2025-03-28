import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "./useAuthStore";
import { Delete } from "lucide-react";

// Modify the initial state
const ChatStore = create((set, get) => ({
  messages: [],
  messageCount:null,
  users: [],
  IsTyping: false,
  onlineUsers: [], // Add this to track online users
  SelectedUser: null,
  isUserLoading: false,
  lastOnline:null,
  isMessageLoading: false,
  isSendingMessage: false,

  // Add this method to update online users
  setOnlineUsers: (onlineUserIds) => {
    set({ onlineUsers: onlineUserIds });
    
    // Also update the online status in the users array
    set((state) => ({
      users: state.users.map(user => ({
        ...user,
        isOnline: onlineUserIds.includes(user._id)
      }))
    }));
  },

  // Add this method to initialize socket listeners
  // In your initializeSocketListeners method
  initializeSocketListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    // Listen for online users updates
    socket.on("online-users", (onlineUserIds) => {
      console.log("Received online users:", onlineUserIds);
      get().setOnlineUsers(onlineUserIds);
    });
    
    // Add listener for user profile updates
    socket.on("user-updated", ({ userId, updatedData }) => {
      console.log("User updated:", userId, updatedData);
      
      // Update the user in the users array
      set((state) => ({
        users: state.users.map(user => 
          user._id === userId 
            ? { ...user, ...updatedData } 
            : user
        )
      }));
      
      // If this is the currently selected user, update that too
      const selectedUser = get().SelectedUser;
      if (selectedUser && selectedUser._id === userId) {
        set((state) => ({
          SelectedUser: { ...state.SelectedUser, ...updatedData }
        }));
      }
    });
    
    // Add listener for message deletion
    socket.on("message_deleted", ({ messageId, conversationId }) => {
      console.log("Message deleted:", messageId, "in conversation:", conversationId);
      
      // Update the local state to remove the deleted message
      set((state) => {
        // Only update if we have this conversation in our state
        if (state.conversations[conversationId]) {
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: state.conversations[conversationId].filter(
                message => message._id !== messageId
              )
            }
          };
        }
        return state;
      });
    });
  }
,
  // Add this method to format last online time
  formatLastOnline: (lastOnlineDate) => {
    if (!lastOnlineDate) return "Never";
    
    const now = new Date();
    const lastOnline = new Date(lastOnlineDate);
    const diffInSeconds = Math.floor((now - lastOnline) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    // For longer periods, return the actual date
    return lastOnline.toLocaleDateString();
  },
  // Update the formatLastOnline method
  // Add this to your initial state
  userRefreshInterval: null,
  
  // Update getUsers to handle lastOnline
  getUsers: async function() {
    set({ isUserLoading: true });
    try {
      // Clear any existing interval
      const currentInterval = get().userRefreshInterval;
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      
      // Initial fetch
      const res = await axiosInstance.get("/message/users");
      set({ 
        users: res.data.map(user => ({
          ...user,
          lastOnline: user.lastOnline ? new Date(user.lastOnline) : null
        })), 
        isUserLoading: false 
      });
      
      // Set up interval for periodic updates
      const intervalId = setInterval(async () => {
        try {
          const res = await axiosInstance.get("/message/users");
          set({ 
            users: res.data.map(user => ({
              ...user,
              lastOnline: user.lastOnline ? new Date(user.lastOnline) : null
            }))
          });
          
          // After getting users, update their online status
          const onlineUserIds = get().onlineUsers;
          if (onlineUserIds.length > 0) {
            get().setOnlineUsers(onlineUserIds);
          }
        } catch (error) {
          console.error("Error in periodic user fetch:", error);
        }
      }, 5000); // Update every 5 seconds
      
      set({ userRefreshInterval: intervalId });
      
      // After getting users, update their online status
      const onlineUserIds = get().onlineUsers;
      if (onlineUserIds.length > 0) {
        get().setOnlineUsers(onlineUserIds);
      }
    } 
    catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error fetching users");
      set({ isUserLoading: false });
    }
  },

  // Update getMessages method
  // In your initial state
  conversations: {}, // Store messages per conversation
  
  // In your getMessages method
  getMessages: async function({ userId, page = 1, limit = 20 }) {
    const isInitialLoad = page === 1;
    
    if (isInitialLoad) {
      set({ isMessageLoading: true });
    } else {
      set({ isLoadingMoreMessages: true });
    }
    
    try {
      const res = await axiosInstance.get(`/message/${userId}?page=${page}&limit=${limit}`);
      
      set((state) => {
        // Get current conversation messages
        const currentMessages = state.conversations[userId] || [];
        
        // For initial load, just set the messages
        // For pagination (page > 1), prepend the new messages to existing ones
        const updatedMessages = isInitialLoad 
          ? res.data.messages 
          : [...res.data.messages, ...currentMessages];
        
        return {
          conversations: {
            ...state.conversations,
            [userId]: updatedMessages
          },
          messageCount: updatedMessages.length,
          isMessageLoading: false,
          isLoadingMoreMessages: false,
          messagePagination: res.data.pagination
        };
      });
      
      return res.data.pagination;
    } catch (error) {
      console.log(error);
      toast.error("Error fetching messages");
      set({ 
        isMessageLoading: false,
        isLoadingMoreMessages: false 
      });
    }
  },

  // In your handleNewMessage method
  handleNewMessage: function(message) {
    set((state) => {
      // Get the conversation ID (either sender or recipient depending on who sent it)
      const conversationId = message.sender === state.authUser?._id ? 
        message.recipient : message.sender;
      
      // Only update if we have this conversation in our state
      if (state.conversations[conversationId]) {
        return {
          conversations: {
            ...state.conversations,
            [conversationId]: [
              ...(state.conversations[conversationId] || []),
              message
            ]
          }
        };
      }
      return state;
    });
  },
  // Add to your initial state
unreadCounts: {}, // Store unread message counts per user

// Update handleNewMessage to track unread messages

// Add a method to reset unread count when selecting a user
setSelectedUser: function(selectedUser) {
  set((state) => {
    // Reset unread count for this user
   
    const newUnreadCounts = { ...state.unreadCounts };
    if (selectedUser && selectedUser._id) {
      newUnreadCounts[selectedUser._id] = 0;
    }
    
    return { 
      SelectedUser: selectedUser,
      unreadCounts: newUnreadCounts
    };
  });
  
  // If a user is selected, fetch their messages
  if (selectedUser && selectedUser._id) {
    get().getMessages({ userId: selectedUser._id });
  }
},
  // Update sendMessage method
  sendMessage: async function({ userId, content }) {
    set({ isSendingMessage: true });
    try {
      const res = await axiosInstance.post(`/message/send/${userId}`, { content });
      const newMessage = res.data;
      
      set((state) => ({
        conversations: {
          ...state.conversations,
          [userId]: [
            ...(state.conversations[userId] || []),
            newMessage
          ]
        }
      }));
  
      // Emit through socket
      const socket = useAuthStore.getState().socket;
      const authUser = useAuthStore.getState().authUser;
      
      if (socket && authUser) {
        socket.emit("private message", {
          to: userId,
          message: newMessage
        });
      }
  
      return newMessage;
    } catch (error) {
      toast.error("Error sending message");
      throw error;
    } finally {
      set({ isSendingMessage: false });
    }
  }
  ,
  // Fix the setSelectedUser function

 // Add this method to handle logout cleanup
 // Update the handleLogout function to clear the interval
 handleLogout: function() {
   // Clear any existing interval
   const currentInterval = get().userRefreshInterval;
   if (currentInterval) {
     clearInterval(currentInterval);
   }
   
   set({
     messages: [],
     users: [],
     SelectedUser: null,
     onlineUsers: [],
     userRefreshInterval: null // Add this line
   });
 },
 DeleteMessage: async function(messageId, conversationId) {
   try {
     // Make the DELETE request to the backend
     const res = await axiosInstance.delete(`/message/${messageId}`);
     
     // Update the local state to remove the deleted message
     set((state) => {
       // Only update if we have this conversation in our state
       if (state.conversations[conversationId]) {
         return {
           conversations: {
             ...state.conversations,
             [conversationId]: state.conversations[conversationId].filter(
               message => message._id !== messageId
             )
           }
         };
       }
       return state;
     });
     
     // Emit socket event to notify other users about the deletion
     const socket = useAuthStore.getState().socket;
     if (socket) {
       console.log("Emitting message_deleted event:", messageId, conversationId);
       socket.emit("message_deleted", {
         messageId,
         conversationId
       });
     } else {
       console.warn("Socket not available for message deletion notification");
     }
     
     toast.success("Message deleted successfully");
     return res.data;
   } catch (error) {
     console.error("Error deleting message:", error);
     toast.error("Error deleting message");
     throw error; 
   }
 }
}));

export default ChatStore;