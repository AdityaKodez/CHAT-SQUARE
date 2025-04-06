import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ChatStore from '../store/useChatStore.js';
import { useAuthStore } from '@/store/useAuthStore';
import { Send, Trash2, Loader2, Globe, Users, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalChat = () => {
  const { 
    globalMessages,
    sendGlobalMessage,
    isGlobalMessageLoading,
    getGlobalMessages,
    deleteGlobalMessage,
    onlineUsers,
  } = ChatStore();
  
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const { socket, authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Improved scroll to bottom function
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Function to handle input changes and typing status
  const handleInputChange = (e) => {
    if (!socket) return;
    
    const content = e.target.value;
    
    // Set typing state to true
    if (!isTyping && content.trim().length > 0) {
      setIsTyping(true);
      socket.emit("global_typing", {
        isTyping: true,
        fullName: authUser.fullName
      });
    } else if (isTyping && content.trim().length === 0) {
      // If the input is now empty, immediately set typing to false
      setIsTyping(false);
      socket.emit("global_typing", {
        isTyping: false,
        fullName: authUser.fullName
      });
    }
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit("global_typing", {
          isTyping: false,
          fullName: authUser.fullName
        });
      }
    }, 3000);
  };

  // Function to load more messages
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMoreMessages || !hasMore) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Store the current scroll height and position before loading more messages
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;
    
    try {
      setIsLoadingMoreMessages(true);
      
      const nextPage = currentPage + 1;
      const pagination = await getGlobalMessages({ 
        page: nextPage 
      });
      
      if (pagination) {
        setCurrentPage(nextPage);
        setHasMore(pagination.hasMore);
        
        // After the messages are loaded and rendered, adjust scroll position
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - prevScrollHeight;
            container.scrollTop = prevScrollTop + scrollDiff;
          }
          setIsLoadingMoreMessages(false);
        }, 100);
      }
    } catch (error) {
      console.error("Error loading more global messages:", error);
      setIsLoadingMoreMessages(false);
    }
  }, [currentPage, isLoadingMoreMessages, hasMore, getGlobalMessages]);
  
  // Handle scroll events with improved detection
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // More reliable bottom detection (within 100px of bottom)
    const isAtBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    setIsScrolledToBottom(isAtBottom);
    
    // Check if scrolled to top for loading more messages
    if (container.scrollTop < 20 && hasMore && !isLoadingMoreMessages) {
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
    if (!isGlobalMessageLoading && globalMessages?.length > 0) {
      // Use instant scroll on initial load
      scrollToBottom("auto");
      setIsScrolledToBottom(true);
    }
  }, [isGlobalMessageLoading, globalMessages?.length, scrollToBottom]);
  
  // Load initial messages
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    getGlobalMessages({ page: 1 });
  }, [getGlobalMessages]);

  // Update online count
  useEffect(() => {
    if (onlineUsers) {
      setOnlineCount(onlineUsers.length);
    }
  }, [onlineUsers]);

  // Handle typing events
  useEffect(() => {
    if (!socket) return;
  
    const handleUserTyping = ({ userId, isTyping, fullName }) => {
      if (userId !== authUser?._id) { // Don't show typing for yourself
        setTypingUsers(prev => {
          if (isTyping) {
            // Add user to typing users if not already there
            if (!prev.some(user => user.id === userId)) {
              return [...prev, { id: userId, fullName }];
            }
          } else {
            // Remove user from typing users
            return prev.filter(user => user.id !== userId);
          }
          return prev;
        });
      }
    };
  
    socket.on("global_typing", handleUserTyping);
  
    return () => {
      socket.off("global_typing", handleUserTyping);
    };
  }, [socket, authUser]);

  // Handle socket events for global messages
  useEffect(() => {
    if (!socket) return;
  
    const handleGlobalMessage = (message) => {
      // Only add the message if it's not already in the messages
      const messageExists = ChatStore.getState().globalMessages.some(
        msg => msg._id === message._id
      );
      
      if (!messageExists) {
        ChatStore.getState().handleNewGlobalMessage(message);
        if (isScrolledToBottom) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    };
  
    const handleGlobalMessageDeletion = ({ messageId }) => {
      console.log("Received global_message_deleted event:", messageId);
      deleteGlobalMessage(messageId);
    };
  
    // Remove existing listeners before adding new ones
    socket.off("global_message").off("global_message_deleted");
  
    // Add event listeners
    socket.on("global_message", handleGlobalMessage);
    socket.on("global_message_deleted", handleGlobalMessageDeletion);
  
    return () => {
      socket.off("global_message", handleGlobalMessage);
      socket.off("global_message_deleted", handleGlobalMessageDeletion);
    };
  }, [socket, isScrolledToBottom, scrollToBottom, deleteGlobalMessage]);

  // Remove the duplicate socket event handler implementation that appears after this

  useEffect(() => {
    // Only scroll to bottom when messages change if we're at the bottom already
    if (isScrolledToBottom && !isLoadingMoreMessages) {
      scrollToBottom();
    }
  }, [globalMessages, scrollToBottom, isScrolledToBottom, isLoadingMoreMessages]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = e.target.message.value;
    if (!content.trim()) return;

    try {
      // Reset form immediately to prevent double submission
      e.target.reset();
      await sendGlobalMessage({ content });
      
      // Still scroll to bottom
      setIsScrolledToBottom(true);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error sending global message:", error);
    }
  };

  return (
    <div className="w-full h-full bg-base-100 font-work-sans flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-100 w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white">
            <Globe size={20} />
          </div>
          <div className='flex-1 flex flex-col'>
            <div className='flex justify-between items-center w-full'>
              <div className="flex items-center gap-1">
                <h3 className="font-medium text-sm">Global Chat</h3>
                <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Users size={14} />
                <span className="text-xs text-success">{onlineCount-1} online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
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
        
        {isGlobalMessageLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        ) : (
          <>
          {
            // Show "No messages yet" message if no messages
            !globalMessages || globalMessages.length === 0 && !isGlobalMessageLoading && (
              <div className="flex h-full w-full justify-center items-center text-base-content">
                <p className='font-work-sans'>
                  Be the first to send a message in the Global Chat!
                </p>
              </div>
            )
          }
            {globalMessages && globalMessages.map((message) => {
              const isMyMessage = message.sender._id === authUser._id;
              
              return (
                <div
                  key={`${message._id}-${message.createdAt}`}
                  className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                >
                  {!isMyMessage && (
                    <div className="flex-shrink-0 mr-2">
                      {message.sender.profilePic ? (
                        <img 
                          src={message.sender.profilePic} 
                          alt={message.sender.fullName} 
                          className="w-8 h-8 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                          {message.sender.fullName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`
                      relative group max-w-[80%] rounded-xl p-3 shadow-sm
                      ${isMyMessage ? "bg-primary text-primary-content" : "bg-base-200"}
                    `}
                  >
                    {!isMyMessage && (
                      <p className="text-xs font-medium mb-1">{message.sender.fullName}</p>
                    )}
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
                        onClick={() => deleteGlobalMessage(message._id)}
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
            
            {/* Element to scroll to */}
            <div ref={messageEndRef} className="h-1" />
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-1 text-xs text-base-content/70 animate-pulse">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                {typingUsers.length === 1 ? (
                  <span>{typingUsers[0].fullName} is typing...</span>
                ) : (
                  <span>{typingUsers.length} people are typing...</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Message Input */}
      <form 
        className="p-3 border-t border-base-300 bg-base-100"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="message"
            placeholder="Type a message to everyone..."
            className="input input-bordered flex-1 text-sm"
            autoComplete="off"
            onChange={handleInputChange}
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

export default GlobalChat;