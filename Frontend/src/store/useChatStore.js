import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "./useAuthStore";
import { Delete, Globe } from "lucide-react";

// Modify the initial state
const ChatStore = create((set, get) => ({
  // Global chat state
  globalMessages: [],
  isGlobalMessageLoading: false,
  globalChatSelected: false,
  messages: [],
  messageCount:null,
  users: [],
  conversations: {},
  Notifications: [],
  IsTyping: false,
  onlineUsers: [], // Add this to track online users
  SelectedUser: null,
  isUserLoading: false,
  lastOnline:null,
  isMessageLoading: false,
  isSendingMessage: false,
  typingUsers: {}, // Track typing status per conversation


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
    
    // Remove existing listeners first to prevent duplicates
    socket.off("global_message")
         .off("global_message_deleted")
         .off("online-users")
         .off("typing")
         .off("private_message")
         .off("new_notification")
         .off("message_edited"); // Add this
    
    // Listen for global messages
    socket.on("global_message", (message) => {
      console.log("Received global message:", message);
      // Check if message already exists before handling
      const state = get();
      const messageExists = state.globalMessages.some(msg => msg._id === message._id);
      if (!messageExists) {
        get().handleNewGlobalMessage(message);
      }
    });
    
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
    
    // Listen for global message deletion
    socket.on("global_message_deleted", ({ messageId }) => {
      console.log("Global message deleted:", messageId);
      set((state) => ({
        globalMessages: state.globalMessages.filter(message => message._id !== messageId)
      }));
    });

    // Improved private message handling with notification support
    socket.on("private_message", (message) => {
      console.log("Received private message:", message);
      const state = get();
      const conversationId = message.sender._id;
      const existingMessages = state.conversations[conversationId] || [];
      const messageExists = existingMessages.some(msg => msg._id === message._id);
      
      if (!messageExists) {
        set((state) => {
          const updatedConversations = {
            ...state.conversations,
            [conversationId]: [
              ...(state.conversations[conversationId] || []),
              {
                ...message,
                isRead: state.SelectedUser?._id === message.sender._id
              }
            ]
          };

          // Update unread counts
          const newUnreadCounts = { ...state.unreadCounts };
          if (!state.SelectedUser || state.SelectedUser._id !== message.sender._id) {
            newUnreadCounts[message.sender._id] = (newUnreadCounts[message.sender._id] || 0) + 1;
          }

          return {
            conversations: updatedConversations,
            unreadCounts: newUnreadCounts
          };
        });

        // Show notification for new message if it's not from the current user
        if (message.sender._id !== useAuthStore.getState().authUser?._id) {
          toast.success(`New message from ${message.sender.name || message.sender.fullName}`);
        }
      }
    });

    // Add direct notification listener
    socket.on("new_notification", (notification) => {
      console.log("Received notification:", notification);
      // Show toast notification regardless of current page/state
      toast.success(notification.message);
      
      // Add to notifications array if needed
      set((state) => ({
        Notifications: [...state.Notifications, notification]
      }));
    });

    // Add this new listener for messages being read
    socket.on("messages_read", ({ readBy }) => {
      set((state) => ({
        conversations: {
          ...state.conversations,
          [readBy]: (state.conversations[readBy] || []).map(msg => ({
            ...msg,
            isRead: true
          }))
        }
      }));
    });

    // Add message edit listener
    socket.on("message_edited", ({ messageId, newContent }) => {
      set((state) => {
        const newState = { ...state };
        // Update message in all conversations where it exists
        Object.keys(state.conversations).forEach(conversationId => {
          const conversation = state.conversations[conversationId];
          if (conversation) {
            newState.conversations[conversationId] = conversation.map(msg =>
              msg._id === messageId ? { ...msg, content: newContent, edited: true } : msg
            );
          }
        });
        return newState;
      });
    });
  },
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
  
  //  getMessages method
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
      const isIncomingMessage = message.sender !== useAuthStore.getState().authUser?._id;
      const isNotSelectedUser = !state.SelectedUser || state.SelectedUser._id !== message.sender;
  
      if (isIncomingMessage && isNotSelectedUser) {
        return {
          conversations: {
            ...state.conversations,
            [message.sender]: [...(state.conversations[message.sender] || []), message]
          },
          unreadCounts: {
            ...state.unreadCounts,
            [message.sender]: (state.unreadCounts[message.sender] || 0) + 1
          }
        };
      }
  
      return {
        conversations: {
          ...state.conversations,
          [message.sender]: [...(state.conversations[message.sender] || []), message]
        }
      };
    });
  },
  // Add to your initial state
unreadCounts: {}, // Store unread message counts per user

// Update handleNewMessage to track unread messages

// Add a method to reset unread count when selecting a user
setSelectedUser: function(selectedUser) {
  const socket = useAuthStore.getState().socket;
  set((state) => {
    if (selectedUser && selectedUser._id) {
      return {
        SelectedUser: selectedUser,
        globalChatSelected: false, // Reset global chat when selecting a user
        unreadCounts: {
          ...state.unreadCounts,
          [selectedUser._id]: 0
        }
      };
    }
    return { 
      SelectedUser: selectedUser,
      globalChatSelected: false // Reset global chat when clearing selected user
    };
  });

  // Mark messages as read in backend
  if (selectedUser)  {
try {
  axiosInstance.put(`/message/markAsRead/${selectedUser._id}`);
  // Mark messages as read in backend using socket.io
  if (socket) {
    socket.emit("mark_messages_as_read", selectedUser._id);
  }
  
  console.log("Marked messages as read for user:", selectedUser._id);
  set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [selectedUser._id]: 0
    }
  }));
  console.log("Messages marked as read");
} catch (error) {
  console.error("Error marking messages as read:", error);
  toast.error("Error marking messages as read");
}
    

  }

},

// Method to select global chat
setGlobalChatSelected: function() {
  set((state) => ({
    SelectedUser: null,
    globalChatSelected: true,
    unreadCounts: {
      ...state.unreadCounts,
      global: 0
    }
  }));
},

// Get global messages
getGlobalMessages: async function({ page = 1, limit = 20 }) {
  const isInitialLoad = page === 1;
  
  if (isInitialLoad) {
    set({ isGlobalMessageLoading: true });
  } else {
    set({ isLoadingMoreMessages: true });
  }
  
  try {
    const res = await axiosInstance.get(`/message/global?page=${page}&limit=${limit}`);
    
    set((state) => {
      // For initial load, just set the messages
      // For pagination (page > 1), prepend the new messages to existing ones
      const updatedMessages = isInitialLoad 
        ? res.data.messages 
        : [...res.data.messages, ...state.globalMessages];
      
      return {
        globalMessages: updatedMessages,
        isGlobalMessageLoading: false,
        isLoadingMoreMessages: false,
        messagePagination: res.data.pagination
      };
    });
    
    return res.data.pagination;
  } catch (error) {
    console.error("Error fetching global messages:", error);
    toast.error("Error fetching global messages");
    set({ 
      isGlobalMessageLoading: false,
      isLoadingMoreMessages: false 
    });
  }
},

// Handle new global message
handleNewGlobalMessage: function(message) {
  set((state) => {
    // Check if this is an incoming message (not sent by the current user)
    const isIncomingMessage = message.sender._id !== useAuthStore.getState().authUser?._id;
    const isGlobalChatNotSelected = !state.globalChatSelected;
    
    // Check for duplicate message first
    const isDuplicate = state.globalMessages.some(msg => msg._id === message._id);
    if (isDuplicate) {
      return state;
    }
    
    // Update unread counts for global chat if needed
    const newUnreadCounts = { ...state.unreadCounts };
    if (isIncomingMessage && isGlobalChatNotSelected) {
      // Ensure we're only incrementing by 1
      newUnreadCounts["global"] = (state.unreadCounts["global"] || 0) + 1;
    }
    
    return {
      globalMessages: [...state.globalMessages, message],
      unreadCounts: newUnreadCounts
    };
  });
},

// Send global message
sendGlobalMessage: async function({ content }) {
  set({ isSendingMessage: true });
  try {
    const res = await axiosInstance.post('/message/global', { content });
    const newMessage = res.data;
    
    // Don't update state here - let the socket event handle it
    // This prevents duplicate messages

    // Emit through socket

    return newMessage;
  } catch (error) {
    console.error("Error sending global message:", error);
    toast.error("Error sending global message");
    throw error;
  } finally {
    set({ isSendingMessage: false });
  }
},

// Delete global message
deleteGlobalMessage: async function(messageId) {
  try {
    // Make the DELETE request to the backend
    await axiosInstance.delete(`/message/global/${messageId}`);
    
    // Update the local state to remove the deleted message
    set((state) => ({
      globalMessages: state.globalMessages.filter(message => message._id !== messageId)
    }));
    
    // Emit socket event to notify other users about the deletion
    const socket = useAuthStore.getState().socket;
    if (socket) {
      console.log("Emitting global_message_deleted event:", messageId);
      socket.emit("global_message_deleted", { messageId });
    }
    
    toast.success("Message deleted successfully");
  } catch (error) {
    console.error("Error deleting global message:", error);
    toast.error("Error deleting message");
    throw error; 
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
     userRefreshInterval: null, // Add this line
     globalMessages: [],
     globalChatSelected: false
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
     
     // Only show success toast if we actually get here without errors
     toast.success("Message deleted successfully");
     return res.data;
   } catch (error) {
     // Check if this is a 404 error (message already deleted)
     if (error.response && error.response.status === 404) {
       // Message was already deleted, so just update the UI and don't show an error
       set((state) => {
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
       return { success: true, message: "Message already deleted" };
     }
     
     // For other errors, log and show error toast
     console.error("Error deleting message:", error);
     toast.error("Error deleting message");
     throw error; 
   }
 },

 // Add this to your ChatStore
 fetchUnseenMessages: async function (senderId) {
  try {
    const response = await axiosInstance.get(`/message/unseen/${senderId}`);
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [senderId]: response.data.unseenMessageCount
      }
    }));
  } catch (error) {
    console.error("Error fetching unseen messages:", error);
  }
},

 // Add this new method
 sendTypingStatus: function({ to, isTyping }) {
   const socket = useAuthStore.getState().socket;
   if (socket) {
     socket.emit("typing", {
       to,
       isTyping,
       from: useAuthStore.getState().authUser?._id
     });
   }
 },

  markMessagesAsSeen: async function(senderId) {
    try {
      // Only mark messages if they're from the other user
      const messages = get().conversations[senderId] || [];
      const unreadMessages = messages.filter(
        msg => !msg.isRead && msg.sender === senderId
      );

      if (unreadMessages.length === 0) return;

      // First update local state immediately
      set(state => ({
        conversations: {
          ...state.conversations,
          [senderId]: state.conversations[senderId].map(msg => ({
            ...msg,
            isRead: msg.sender === senderId ? true : msg.isRead
          }))
        }
      }));

      // Then notify the backend
      await axiosInstance.post('/message/mark-seen', { senderId });
      
      // And notify through socket
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("markAsRead", { senderId });
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error);
      // Rollback the state if the request failed
      set(state => ({
        conversations: {
          ...state.conversations,
          [senderId]: state.conversations[senderId].map(msg => ({
            ...msg,
            isRead: false
          }))
        }
      }));
    }
  },
  EditMessages: async function({ messageId, content, userId }) {
    try {
      // Update URL to match backend route
      const res = await axiosInstance.put(`/message/edit/${messageId}`, { 
        newContent: content 
      });
      
      // Update local state immediately
      set((state) => {
        const updatedConversations = { ...state.conversations };
        if (updatedConversations[userId]) {
          updatedConversations[userId] = updatedConversations[userId].map(msg => 
            msg._id === messageId ? { ...msg, content, edited: true } : msg
          );
        }
        return { conversations: updatedConversations };
      });
  
      // Emit socket event
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("message_edited", {
          messageId,
          newContent: content,
          to: userId
        });
      }
      
      toast.success("Message edited successfully");
      return res.data;
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Error editing message");
      throw error;
    }
  }
}));

export default ChatStore;
