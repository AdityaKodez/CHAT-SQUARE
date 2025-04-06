import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import ChatStore from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js"; // Fixed alias import
import { Send, Trash2, Loader2, Info, X, BadgeCheck } from "lucide-react";
import { AnimatePresence,motion } from "framer-motion";
import ReactLinkify from "react-linkify";

const UserStatus = ({ userId }) => {
  const { users, formatLastOnline, onlineUsers } = ChatStore();
  const user = users.find((u) => u._id === userId);

  if (!user) return null;

  return (
    <p className="text-primary text-xs w-full">
      {onlineUsers.includes(userId)
        ? "Online now"
        : user.lastOnline
        ? `${formatLastOnline(user.lastOnline)}`
        : "Never online"}
    </p>
  );
};

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

const ChatContainer = () => {
  const {
    SelectedUser,
    conversations,
    onlineUsers,
    sendMessage,
    isMessageLoading,
    getMessages,
    handleNewMessage,
    DeleteMessage,
    typingUsers,
    sendTypingStatus,
    markMessagesAsSeen,
  } = ChatStore();
  const [seen, setSeen] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const userFullName = SelectedUser?.fullName;
  const userFirstInitial = userFullName?.[0] || "?";

  const messages = useMemo(() => {
    return SelectedUser && SelectedUser._id
      ? conversations[SelectedUser._id] || []
      : [];
  }, [SelectedUser, conversations]);

  const { socket, authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  function getRandomColor(userId) {
    if (!userId) return Colors[0];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    const index = Math.abs(hash) % Colors.length;
    return Colors[index];
  }

  const loadMoreMessages = useCallback(async () => {
    if (!SelectedUser || isLoadingMoreMessages || !hasMore) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    try {
      setIsLoadingMoreMessages(true);
      const nextPage = currentPage + 1;
      const pagination = await getMessages({
        userId: SelectedUser._id,
        page: nextPage,
      });

      if (pagination) {
        setCurrentPage(nextPage);
        setHasMore(pagination.hasMore);
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
      console.error("Error loading more messages:", error);
      setIsLoadingMoreMessages(false);
    }
  }, [SelectedUser, currentPage, isLoadingMoreMessages, hasMore, getMessages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsScrolledToBottom(isAtBottom);
    if (isAtBottom && document.visibilityState === "visible" && SelectedUser) {
      setSeen(true);
      markMessagesAsSeen(SelectedUser._id);
    }
    if (container.scrollTop < 20 && hasMore && !isLoadingMoreMessages) {
      loadMoreMessages();
    }
  }, [hasMore, isLoadingMoreMessages, loadMoreMessages, SelectedUser, markMessagesAsSeen]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (!isMessageLoading && messages.length > 0) {
      scrollToBottom("auto");
      setIsScrolledToBottom(true);
    }
  }, [isMessageLoading, messages.length, scrollToBottom]);

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    if (SelectedUser?._id) {
      getMessages({ userId: SelectedUser._id, page: 1 });
    }
  }, [SelectedUser?._id, getMessages]);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = () => {
    if (!isTyping && SelectedUser) {
      setIsTyping(true);
      sendTypingStatus({ to: SelectedUser._id, isTyping: true });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (SelectedUser) {
        sendTypingStatus({ to: SelectedUser._id, isTyping: false });
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (SelectedUser?._id) {
        sendTypingStatus({ to: SelectedUser._id, isTyping: false });
      }
    };
  }, [SelectedUser, sendTypingStatus]);

  useEffect(() => {
    if (!socket || !SelectedUser) return;
    const handleTyping = ({ from, isTyping }) => {
      if (from === SelectedUser._id) {
        setIsOtherUserTyping(isTyping);
      }
    };
    const handlePrivateMessage = ({ from, message }) => {
      if (from === SelectedUser._id) {
        setIsOtherUserTyping(false);
      }
      handleNewMessage(message);
    };
    const handleMessageDeletion = ({ messageId, conversationId }) => {
      DeleteMessage(messageId, conversationId);
    };
    socket.off("typing").off("private message").off("message_deleted");
    socket.on("typing", handleTyping);
    socket.on("private message", handlePrivateMessage);
    socket.on("message_deleted", handleMessageDeletion);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("private message", handlePrivateMessage);
      socket.off("message_deleted", handleMessageDeletion);
    };
  }, [socket, SelectedUser, handleNewMessage, DeleteMessage]);

  useEffect(() => {
    if (isScrolledToBottom && !isLoadingMoreMessages) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, isScrolledToBottom, isLoadingMoreMessages]);

  useEffect(() => {
    if (SelectedUser && messages.length > 0) {
      const container = messagesContainerRef.current;
      if (!container) return;

      const lastMessage = messages[messages.length - 1];
      const isVisible =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      const isActiveChat = document.visibilityState === "visible";
      const isOtherUserMessage = lastMessage.sender === SelectedUser._id;

      if (isVisible && isActiveChat && isOtherUserMessage) {
        markMessagesAsSeen(SelectedUser._id);
      }
    }
  }, [SelectedUser, messages, markMessagesAsSeen]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        SelectedUser &&
        messages.length > 0 &&
        isScrolledToBottom
      ) {
        markMessagesAsSeen(SelectedUser._id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [SelectedUser, messages, isScrolledToBottom, markMessagesAsSeen]);

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const content = e?.target?.message?.value || e?.target?.message;
    if (!content || content.trim().length === 0) return; // Only check if empty, don't trim content itself

    try {
      await sendMessage({ userId: SelectedUser._id, content }); // Send original content with line breaks
      if (e?.target) {
        e.target.message.value = "";
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "42px";
      }
      if (socket) {
        socket.emit("typing", { to: SelectedUser._id, isTyping: false });
      }
      setIsScrolledToBottom(true);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!SelectedUser) return null;

  return (
    <div className="w-full h-full bg-base-100 font-work-sans flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-100 w-full">
        <div className="flex items-center gap-3">
          {SelectedUser.profilePic ? (
            <button
              onClick={() => setShowProfileModal(true)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={SelectedUser.profilePic}
                alt={userFullName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            </button>
          ) : (
            <button
              onClick={() => setShowProfileModal(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium cursor-pointer hover:opacity-80 transition-opacity ${getRandomColor(
                SelectedUser._id
              )}`}
            >
              {userFirstInitial}
            </button>
          )}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-1">
                <h3 className="font-medium text-sm">{userFullName}</h3>
                {SelectedUser.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-primary hover:text-primary-focus transition-colors"
                  title="View profile"
                >
                  <Info size={16} />
                </button>
                {onlineUsers.includes(SelectedUser._id) ? (
                  <span className="text-xs text-success">Online</span>
                ) : (
                  <UserStatus userId={SelectedUser._id} />
                )}
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
            {messages.length === 0 && !isMessageLoading && (
              <div className="flex h-full w-full justify-center items-center text-base-content">
                <p className="font-work-sans">Start Your Chat Now!!</p>
              </div>
            )}
            {messages.map((message) => {
              const isMyMessage = message.sender === authUser._id;
              return (
                <div
                  key={`${message._id}-${message.createdAt}`}
                  className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative group max-w-[80%] rounded-xl p-3 shadow-sm ${
                      isMyMessage ? "bg-primary text-primary-content" : "bg-base-200"
                    }`}
                  >
                    <ReactLinkify
                      componentDecorator={(href, text, key) => (
                        <a
                          href={href}
                          key={key}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            isMyMessage
                              ? "text-white underline hover:text-primary-content/80"
                              : "text-blue-500 underline hover:text-blue-600"
                          }
                        >
                          {text}
                        </a>
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </ReactLinkify>
                    <p
                      className={`text-[10px] mt-1.5 ${
                        isMyMessage
                          ? "text-primary-content/70"
                          : "text-base-content/70"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {seen && isMyMessage && (
                      <p
                        className={`text-[10px] mt-1.5 ${
                          isMyMessage
                            ? "text-primary-content/50"
                            : "text-base-content/70"
                        }`}
                      >
                        {message.isRead ? "Seen" : "Delivered"}
                      </p>
                    )}
                    {isMyMessage && (
                      <button
                        onClick={() =>
                          DeleteMessage(message._id, SelectedUser._id)
                        }
                        className="absolute -right-3 -top-3 bg-error text-white p-1 rounded-full opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 transition-opacity touch-action-manipulation"
                        aria-label="Delete message"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {isOtherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-base-200 rounded-xl p-3 max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messageEndRef} className="h-1" />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers[SelectedUser?._id] && (
        <div className="text-sm text-gray-500 italic ml-4 mb-2">
          {SelectedUser.fullName} is typing...
        </div>
      )}

      {/* Message Input */}
      <form className="p-3 border-t border-base-300 bg-base-100" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            name="message"
            placeholder="Type a message..."
            className="w-full resize-none rounded-sm px-4 py-2 max-h-32 min-h-[42px] text-sm bg-base-200 border-none focus:outline-none focus:ring-1 focus:ring-primary"
            rows="1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const content = e.target.value;
                if (content && content.trim().length > 0) {
                  handleSubmit({ target: { message: content } });
                  e.target.value = "";
                  e.target.style.height = "42px";
                }
              }
            }}
            onInput={(e) => {
              e.target.style.height = "42px";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onChange={handleInputChange}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-circle">
            <Send size={18} />
          </button>
        </div>
      </form>

      {/* User Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-base-100 rounded-xl shadow-xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-base-content/70 hover:text-base-content"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center">
                {SelectedUser.profilePic ? (
                  <img
                    src={SelectedUser.profilePic}
                    alt={SelectedUser.fullName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${getRandomColor(
                      SelectedUser._id
                    )}`}
                  >
                    <div>
                      <h1>{SelectedUser.fullName?.charAt(0).toUpperCase()}</h1>
                      {SelectedUser.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1 mb-1">
                  <h3 className="text-xl font-bold">{SelectedUser.fullName}</h3>
                  {SelectedUser.isVerified && (
                    <BadgeCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <div className="mb-4">
                  {onlineUsers.includes(SelectedUser._id) ? (
                    <span className="text-sm text-success flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-success rounded-full"></span>{" "}
                      Online now
                    </span>
                  ) : (
                    <UserStatus userId={SelectedUser._id} />
                  )}
                </div>
                {SelectedUser.description && (
                  <div className="mb-6 max-w-xs">
                    <h4 className="text-sm font-medium mb-2 text-base-content/70">
                      About
                    </h4>
                    <p className="text-sm">{SelectedUser.description}</p>
                  </div>
                )}
                {SelectedUser.email && (
                  <div className="text-sm text-base-content/70">
                    <span className="font-medium">Email: </span>{" "}
                    {SelectedUser.email}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatContainer;