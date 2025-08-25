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
  blockedUsers: [], // Initialize blockedUsers state
  isBlocking: false, // Add state for loading indicator
  unreadCounts: {}, // Store unread message counts per user
  isFetchingBlockedUsers: false, // Add this state
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
         .off("message_edited") // Add this
         .off("user_blocked")
         .off("user_unblocked"); // Remove previous listeners
    
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

    socket.on("user_blocked", ({ blockerId, blockedUserId }) => {
      const authUserId = useAuthStore.getState().authUser?._id;
      // If the current user is the one being blocked
      if (blockedUserId === authUserId) {
          // Potentially update the SelectedUser if they are the blocker
          const selectedUser = get().SelectedUser;
          if (selectedUser && selectedUser._id === blockerId) {
               set({ SelectedUser: { ...selectedUser, isBlockedViewer: true } });
          }
          toast.info(`You have been blocked by ${blockerId}`); // Adjust message as needed
      }
      // If the current user is the blocker
      else if (blockerId === authUserId) {
           set((state) => ({
              blockedUsers: [...new Set([...state.blockedUsers, blockedUserId])]
           }));
      }
    });

    socket.on("user_unblocked", ({ blockerId, blockedUserId }) => {
      const authUserId = useAuthStore.getState().authUser?._id;
       // If the current user was the one blocked
      if (blockedUserId === authUserId) {
           const selectedUser = get().SelectedUser;
           if (selectedUser && selectedUser._id === blockerId) {
               set({ SelectedUser: { ...selectedUser, isBlockedViewer: false } });
           }
           toast.info(`You have been unblocked by ${blockerId}`); // Adjust message
      }
       // If the current user was the blocker
      else if (blockerId === authUserId) {
           set((state) => ({
              blockedUsers: state.blockedUsers.filter(id => id !== blockedUserId)
           }));
      }
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
  currentPage: 1,
  hasMoreUsers: true,
  isLoadingMoreUsers: false,
  userPagination: null,

  // Fixed getUsers function with proper pagination
  getUsers: async (options = {}) => {
    const { skip = 0, limit = 10, isLoadMore = false } = options;
    
    // Set loading state
    if (isLoadMore) {
      set({ isLoadingMoreUsers: true });
    } else {
      set({ isUserLoading: true });
    }

    try {
      const response = await axiosInstance.get(
        `/message/users?skip=${skip}&limit=${limit}`);

      const { users: fetchedUsers, pagination } = response.data;

      set((state) => ({
        users: skip === 0 ? fetchedUsers : [...state.users, ...fetchedUsers],
        hasMoreUsers: pagination.hasNextPage,
        userPagination: pagination,
        isUserLoading: false,
        isLoadingMoreUsers: false,
        error: null
      }));

      return pagination;
    } catch (err) {
      console.error("Failed to fetch users:", err);
      set({ 
        error: err.message, 
        isUserLoading: false,
        isLoadingMoreUsers: false 
      });
    }
  },

  // Load more users for infinite scroll
  loadMoreUsers: async () => {
    const state = get();
    if (state.isLoadingMoreUsers || !state.hasMoreUsers) return;

    const currentUsersCount = state.users.length;
    await state.getUsers({ 
      skip: currentUsersCount, 
      limit: 10, 
      isLoadMore: true 
    });
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
    // Ensure message and sender._id exist
    if (!message || !message.sender || !message.sender._id) {
      console.error("Received invalid message structure:", message);
      return;
    }
  
    const senderId = message.sender._id;
    const receiverId = message.receiver; // Assuming receiver ID is directly on the message
    const authUserId = useAuthStore.getState().authUser?._id;
  
    // Determine the conversation key (the ID of the other user)
    const conversationKey = senderId === authUserId ? receiverId : senderId;
  
    if (!conversationKey) {
      console.error("Could not determine conversation key for message:", message);
      return;
    }
  
    set((state) => {
      const currentConversation = state.conversations[conversationKey] || [];
      
      // Prevent adding duplicate messages
      const messageExists = currentConversation.some(msg => msg._id === message._id);
      if (messageExists) {
        console.log("Duplicate message detected, skipping:", message._id);
        return state; // Return current state if duplicate
      }
  
      const isIncoming = message.sender._id !== authUserId;
      const isChatSelected = state.SelectedUser?._id === conversationKey;

      const updatedConversation = [...currentConversation, message];
      const newUnreadCounts = { ...state.unreadCounts };

      // Update unread counts if incoming and chat not selected
      if (isIncoming && !isChatSelected) {
        newUnreadCounts[conversationKey] = (newUnreadCounts[conversationKey] || 0) + 1;
        console.log(`Incremented unread count for ${conversationKey}:`, newUnreadCounts[conversationKey]);
      } else if (isChatSelected) {
        // If chat is selected, ensure count is 0 (might already be 0)
        newUnreadCounts[conversationKey] = 0;
      }

      return {
        conversations: {
          ...state.conversations,
          [conversationKey]: updatedConversation
        },
        unreadCounts: newUnreadCounts
      };
    });

    // If the message is incoming and the chat is currently selected,
    // trigger the seen logic (which will be called by ChatContainer's scroll/visibility handlers)
    const isChatSelected = get().SelectedUser?._id === conversationKey;
    if (message.sender._id !== authUserId && isChatSelected) {
       // We don't call markMessagesAsSeen here directly anymore.
       // ChatContainer's scroll/visibility handlers will call it.
       console.log("Incoming message for selected chat, relying on UI handlers to mark seen.");
    }
  },
  // Add to your initial state

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
      globalChatSelected: false, // Reset global chat when clearing selected user
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
      const newMessage = res.data; // newMessage from API has populated sender

      // Ensure newMessage and sender._id exist before updating state
      if (!newMessage || !newMessage.sender || !newMessage.sender._id) {
         console.error("Invalid message structure received from API:", newMessage);
         throw new Error("Invalid message structure from API");
      }

      set((state) => ({
        conversations: {
          ...state.conversations,
          [userId]: [
            ...(state.conversations[userId] || []),
            newMessage // Add the message returned from the API
          ]
        }
      }));
  
      // Emit through socket using the consistent event name
      const socket = useAuthStore.getState().socket;
      
      if (socket) {
        // Send the same message structure that the API returned
        socket.emit("private_message", { // Use consistent event name
          to: userId,
          message: newMessage // Send the full message object
        });
      }
  
      return newMessage;
    } catch (error) {
      console.error("Error sending message:", error); // Log the specific error
      // Check if the error is due to being blocked
      if (error.response && error.response.status === 403) {
         toast.error(error.response.data.message || "Cannot send message. You might be blocked.");
      } else {
         toast.error("Error sending message");
      }
      throw error; // Re-throw the error if needed elsewhere
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
    if (!senderId) return; // Don't proceed if senderId is invalid

    try {
      const messages = get().conversations[senderId] || [];
      const hasUnread = messages.some(msg => !msg.isRead && msg.sender === senderId);

      console.log(`markMessagesAsSeen called for ${senderId}. Has unread: ${hasUnread}`);

      // Update local state immediately regardless of hasUnread,
      // as this function might be called when the user scrolls/focuses.
      // This ensures the UI reflects 'Seen' even if the API call fails or is pending.
      set(state => {
          // Check if the conversation exists before trying to map
          if (!state.conversations[senderId]) {
              return state; // No changes if conversation doesn't exist
          }
          return {
              conversations: {
                  ...state.conversations,
                  [senderId]: state.conversations[senderId].map(msg =>
                      msg.sender === senderId ? { ...msg, isRead: true } : msg
                  )
              }
          };
      });

      // Always attempt backend update if the function is called.
      // Let the backend handle preventing duplicate updates if necessary.
      console.log(`markMessagesAsSeen: Notifying backend/socket for ${senderId}`);
      await axiosInstance.post('/message/mark-seen', { senderId });

      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("markAsRead", { senderId }); // Notify sender via socket
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error);
      if (error.response && error.response.status === 404) {
        console.error(`Error 404: Backend route POST /message/mark-seen not found.`);
        toast.error("Error updating seen status (endpoint not found).");
      } else {
         toast.error("Error updating seen status.");
      }
      // No rollback needed here, local state update is optimistic.
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
  },

  // Function to fetch initial blocked users (call this on app load/login)
  fetchBlockedUsers: async () => {
    set({ isFetchingBlockedUsers: true }); // Set loading true
    try {
      // Assuming your backend has an endpoint like /auth/blocked-users
      const res = await axiosInstance.get("/auth/blocked-users");
      // Ensure the response data is an array, default to empty array if not
      const blockedIds = Array.isArray(res.data) ? res.data.map(user => user._id) : [];
      set({ blockedUsers: blockedIds });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      // Handle error appropriately, maybe set to empty array
      set({ blockedUsers: [] });
    } finally {
      set({ isFetchingBlockedUsers: false }); // Set loading false
    }
  },

  // Function to block a user
  blockUser: async (userIdToBlock) => {
    set({ isBlocking: true }); // Set loading state
    try {
      await axiosInstance.post("/auth/block-user", { blockedUserId: userIdToBlock });
      set((state) => ({
        blockedUsers: [...state.blockedUsers, userIdToBlock],
      }));
      toast.success("User blocked successfully");
      // Optionally, update the SelectedUser state if needed
      if (get().SelectedUser?._id === userIdToBlock) {
        set((state) => ({
          SelectedUser: { ...state.SelectedUser, isBlockedViewer: true } // Assuming this property exists
        }));
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error(error.response?.data?.message || "Failed to block user");
      throw error; // Re-throw error for component handling
    } finally {
      set({ isBlocking: false }); // Reset loading state
    }
  },

  // Function to unblock a user
  unblockUser: async (userIdToUnblock) => {
    set({ isBlocking: true }); // Set loading state
    try {
      await axiosInstance.post("/auth/unblock-user", { blockedUserId: userIdToUnblock });
      set((state) => ({
        blockedUsers: state.blockedUsers.filter(id => id !== userIdToUnblock),
      }));
      toast.success("User unblocked successfully");
       // Optionally, update the SelectedUser state if needed
       if (get().SelectedUser?._id === userIdToUnblock) {
        set((state) => ({
          SelectedUser: { ...state.SelectedUser, isBlockedViewer: false } // Assuming this property exists
        }));
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error(error.response?.data?.message || "Failed to unblock user");
      throw error; // Re-throw error for component handling
    } finally {
      set({ isBlocking: false }); // Reset loading state
    }
  },
}));

export default ChatStore;
