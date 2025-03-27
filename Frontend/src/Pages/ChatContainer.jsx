import { useEffect, useRef, useState, useMemo } from 'react';
import ChatStore from '../store/useChatStore.js';
import { useAuthStore } from '@/store/useAuthStore';
import { Send, Trash2 } from 'lucide-react';

const UserStatus = ({ userId }) => {
  const { users, formatLastOnline, onlineUsers } = ChatStore();
  const user = users.find(u => u._id === userId);
  
  if (!user) return null;

  // In the UserStatus component
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
    handleNewMessage,
    DeleteMessage, // Add this to destructured imports
  } = ChatStore();
 

    const userFullName = SelectedUser?.fullName;
  const userFirstInitial = userFullName?.[0] || "?";
  
  // Get messages for current conversation only - with safe access using useMemo
  const messages = useMemo(() => {
    return SelectedUser && SelectedUser._id ? (conversations[SelectedUser._id] || []) : [];
  }, [SelectedUser, conversations]);
  
  const { socket, authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  
  function HandleInputChange(e) {
    const content = e.target.value;
    if (!socket || !SelectedUser) return;
    
    // Emit typing event with correct parameters
    socket.emit("typing", {
      to: SelectedUser._id,  // Send to the selected user
      isTyping: content.trim().length > 0  // true if typing, false if not
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

  // Scroll to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherUserTyping]);

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

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isMessageLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-dots"></span>
          </div>
        ) : (
          messages.map((message) => {
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
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                  
                  {/* Add delete button - only for user's own messages */}
                  {isMyMessage && (
                    <button
                      onClick={() => DeleteMessage(message._id, SelectedUser._id)}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 
                               transition-opacity duration-200 bg-error hover:bg-error/80 
                               text-white rounded-full p-1"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        
        )}
        {
          !isMessageLoading && messages.length === 0 && (
            <div className="flex justify-center items-center w-full h-full">
              <span className="text-sm text-base-content/70">Start Your Talk Now!</span>
            </div> 
          )
        }

        
        {/* Show typing indicator only when the other user is typing */}
        {isOtherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-base-200 max-w-[80%] rounded-xl p-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="loading loading-dots loading-sm"></span>
                <span className="text-xs text-base-content/70">{SelectedUser.fullName} typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messageEndRef} />
      </div>

      {/* Message Input */}
      <form 
        onSubmit={async (e) => {
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
          } catch (error) {
            console.error("Error sending message:", error);
          }
        }}
        className="p-4 border-t border-base-300 bg-base-100"
      >
        <div className="flex gap-2">
          <input
            type="text"
            name="message"
            className="input input-bordered flex-1 text-sm h-10"
            placeholder="Type a message..."
            onChange={HandleInputChange}
          />
          <button type="submit" className="btn btn-primary h-10 min-h-0">
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatContainer;