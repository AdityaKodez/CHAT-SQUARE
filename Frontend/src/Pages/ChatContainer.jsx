import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ChatStore from '../store/useChatStore.js';
import { useAuthStore } from '@/store/useAuthStore';
import { Send, Trash2, Loader2 } from 'lucide-react';

const UserStatus = ({ userId }) => {
  const { users, formatLastOnline, onlineUsers } = ChatStore();
  const user = users.find(u => u._id === userId);
  
  if (!user) return null;

  return (
    <p className='text-primary text-xs w-full'>
      {onlineUsers.includes(userId) 
        ? "Online now"
        : user.lastOnline 
          ? `${formatLastOnline(user.lastOnline)}`
          : "Never online"
      }
    </p>
  );
};

const ChatContainer = () => {
  const { 
    SelectedUser, 
    conversations,
    onlineUsers,
    sendMessage,
    isMessageLoading,
    isLoadingMoreMessages,
    getMessages,
    handleNewMessage,
    DeleteMessage,
  } = ChatStore();

  const userFullName = SelectedUser?.fullName;
  const userFirstInitial = userFullName?.[0] || "?";
  
  // Get messages for current conversation only - with safe access using useMemo
  const messages = useMemo(() => {
    return SelectedUser && SelectedUser._id ? (conversations[SelectedUser._id] || []) : [];
  }, [SelectedUser, conversations]);
  
  const { socket, authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  
  // Improved scroll to bottom function
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior });
    }
  }, []);
  
  // Function to load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!SelectedUser || isLoadingMoreMessages || !hasMore) return;
    
    const nextPage = currentPage + 1;
    try {
      const pagination = await getMessages({ 
        userId: SelectedUser._id, 
        page: nextPage 
      });
      
      if (pagination) {
        setCurrentPage(nextPage);
        setHasMore(pagination.hasMore);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    }
  }, [SelectedUser, currentPage, isLoadingMoreMessages, hasMore, getMessages]);
  
  // Handle scroll events with improved detection
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // More reliable bottom detection (within 100px of bottom)
    const isAtBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    setIsScrolledToBottom(isAtBottom);
    
    // Check if scrolled to top for loading more messages
    if (container.scrollTop === 0 && hasMore && !isLoadingMoreMessages) {
      loadMoreMessages();
    }
  }, [hasMore, isLoadingMoreMessages, loadMoreMessages]);
  
  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // Initial scroll to bottom when messages load
  useEffect(() => {
    if (!isMessageLoading && messages.length > 0) {
      // Use instant scroll on initial load
      scrollToBottom("auto");
      setIsScrolledToBottom(true);
    }
  }, [isMessageLoading, messages.length, scrollToBottom]);
  
  // Reset pagination when changing users
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    
    // Load initial messages for the selected user
    if (SelectedUser?._id) {
      getMessages({ userId: SelectedUser._id, page: 1 });
    }
  }, [SelectedUser?._id, getMessages]);
  
  function HandleInputChange(e) {
    const content = e.target.value;
    if (!socket || !SelectedUser) return;
    
    // Emit typing event with correct parameters
    socket.emit("typing", {
      to: SelectedUser._id,
      isTyping: content.trim().length > 0
    });
  }

  // Auto-clear typing status after delay
  useEffect(() => {
    let typingTimer;
    if (socket && SelectedUser) {
      typingTimer = setTimeout(() => {
        socket.emit("typing", {
          to: SelectedUser._id,
          isTyping: false
        });
      }, 1000);
    }
    return () => clearTimeout(typingTimer);
  }, [socket, SelectedUser]);

  // Handle socket events
  useEffect(() => {
    if (!socket || !SelectedUser) return;

    // Listen for typing events
    socket.on("typing", ({ from, isTyping }) => {
      // Only show typing indicator if it's from the selected user
      if (from === SelectedUser._id) {
        setIsOtherUserTyping(isTyping);
      }
    });

    // Listen for new messages
    socket.on("private message", ({ from, message }) => {
      // If we receive a message, clear typing indicator
      if (from === SelectedUser._id) {
        setIsOtherUserTyping(false);
      }
      handleNewMessage(message);
    });

    // Add listener for message deletion
    socket.on("message_deleted", ({ messageId, conversationId }) => {
      console.log("Received message_deleted event:", messageId, conversationId);
      // The store will handle the actual deletion
    });

    return () => {
      socket.off("private message");
      socket.off("typing");
      socket.off("message_deleted");
    };
  }, [socket, SelectedUser, handleNewMessage]);

  // Improved scroll to bottom on new messages
  useEffect(() => {
    // Only auto-scroll if we were already at the bottom
    if (isScrolledToBottom && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages.length, isScrolledToBottom, scrollToBottom]);
  
  // Scroll to bottom when typing indicator changes
  useEffect(() => {
    if (isScrolledToBottom && isOtherUserTyping) {
      scrollToBottom();
    }
  }, [isOtherUserTyping, isScrolledToBottom, scrollToBottom]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = e.target.message.value;
    if (!content.trim()) return;

    try {
      await sendMessage({
        userId: SelectedUser._id,
        content
      });
      e.target.reset();
      
      // Clear typing status after sending message
      if (socket) {
        socket.emit("typing", {
          to: SelectedUser._id,
          isTyping: false
        });
      }
      
      // Force scroll to bottom after sending
      setIsScrolledToBottom(true);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Early return if SelectedUser is not available
  if (!SelectedUser) return null;

  return (
    <div className="w-full h-full bg-base-100 font-work-sans flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-100 w-full">
        <div className="flex items-center gap-3">
          {
            SelectedUser.profilePic ? 
              <img 
                src={SelectedUser.profilePic} 
                alt={userFullName} 
                className="w-10 h-10 rounded-lg object-cover" 
              /> : 
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                {userFirstInitial}
              </div>
          }
          <div className='flex-1 flex justify-between items-center'>
            <h3 className="font-medium text-sm">{userFullName}</h3>
            <div className="ml-auto">
              {
                onlineUsers.includes(SelectedUser._id) ? 
                  <span className="text-xs text-success">Online</span> : 
                  <UserStatus userId={SelectedUser._id} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container with improved styling */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {/* Loading indicator for pagination */}
        {isLoadingMoreMessages && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        )}
        
        {isMessageLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        ) : (
          <>
          {
            // Show "No messages yet" message if no messages
            messages.length === 0 && !isMessageLoading && (
              <div className="flex h-full w-full justify-center items-center text-base-content">
                <p className='font-work-sans'>
                  Start Your Chat Now!!
                </p>
              </div>
            )
          }
            {messages.map((message) => {
              const isMyMessage = message.sender === authUser._id;
              
              return (
                <div
                  key={message._id}
                  className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      relative group max-w-[80%] rounded-xl p-3 shadow-sm
                      ${isMyMessage ? "bg-primary text-primary-content" : "bg-base-200"}
                    `}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`
                        text-[10px] mt-1.5
                        ${isMyMessage ? "text-primary-content/70" : "text-base-content/70"}
                      `}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    {/* Delete button for own messages */}
                    {isMyMessage && (
                      <button
                        onClick={() => DeleteMessage(message._id, SelectedUser._id)}
                        className="absolute -right-3 -top-3 bg-error text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete message"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {isOtherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-base-200 rounded-xl p-3 max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Element to scroll to */}
            <div ref={messageEndRef} className="h-1" />
          </>
        )}
      </div>

      {/* Message Input with updated submit handler */}
      <form 
        className="p-3 border-t border-base-300 bg-base-100"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="message"
            placeholder="Type a message..."
            className="input input-bordered flex-1 text-sm"
            onChange={HandleInputChange}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatContainer;