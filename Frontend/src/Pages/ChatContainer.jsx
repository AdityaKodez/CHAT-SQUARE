"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import ChatStore from "../store/useChatStore.js"
import { useAuthStore } from "../store/useAuthStore.js" // Fixed alias import
import { Send, Trash2, Loader2, X, BadgeCheck, Edit2, Ban } from "lucide-react" // Added Ban icon
import { AnimatePresence, motion } from "framer-motion"
import ReactLinkify from "react-linkify"

const UserStatus = ({ userId }) => {
  const { users, formatLastOnline, onlineUsers } = ChatStore()
  const user = users.find((u) => u._id === userId)
  const windowWidth = window.innerWidth
  useEffect(() => {
    console.log("Window width:", windowWidth)
  }, [windowWidth])

  if (!user) return null

  return (
    <p className="text-primary text-xs w-full">
      {onlineUsers.includes(userId)
        ? "Online now"
        : user.lastOnline
          ? `${formatLastOnline(user.lastOnline)}`
          : "Never online"}
    </p>
  )
}

const Colors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
]

const ChatContainer = () => {
  const {
    SelectedUser,
    conversations,
    onlineUsers,
    sendMessage,
    isMessageLoading,
    getMessages,
    DeleteMessage,
    EditMessages,
    sendTypingStatus,
    markMessagesAsSeen, // Keep this
    blockUser,
    unblockUser,
    blockedUsers, // Ensure this is correctly destructured
    isBlocking,
    isFetchingBlockedUsers, // Import the new loading state
  } = ChatStore()
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false)
  const userFullName = SelectedUser?.fullName
  const userFirstInitial = userFullName?.[0] || "?"
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingContent, setEditingContent] = useState("")
  const editInputRef = useRef(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true); // Re-add local scroll state

  const handleStartEdit = (message) => {
    setEditingMessageId(message._id)
    setEditingContent(message.content)
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus()
      }
    }, 50)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const handleSaveEdit = async () => {
    if (!editingContent.trim()) return
    try {
      await EditMessages({
        messageId: editingMessageId,
        content: editingContent,
        userId: SelectedUser._id,
      })

      // If successful, emit socket event
      if (socket) {
        socket.emit("message_edited", {
          messageId: editingMessageId,
          newContent: editingContent,
          to: SelectedUser._id,
        })
      }

      setEditingMessageId(null)
      setEditingContent("")
    } catch (error) {
      console.error("Error saving edit:", error)
    }
  }

  const messages = useMemo(() => {
    return SelectedUser && SelectedUser._id ? conversations[SelectedUser._id] || [] : []
  }, [SelectedUser, conversations])

  const { socket, authUser } = useAuthStore()
  const messageEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior })
    }
  }, [])

  function getRandomColor(userId) {
    if (!userId) return Colors[0]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i)
      hash = hash & hash
    }
    const index = Math.abs(hash) % Colors.length
    return Colors[index]
  }
  // loading messages as scrolling
  const loadMoreMessages = useCallback(async () => {
    if (!SelectedUser || isLoadingMoreMessages || !hasMore) return
    const container = messagesContainerRef.current
    if (!container) return
    const prevScrollHeight = container.scrollHeight
    const prevScrollTop = container.scrollTop

    try {
      setIsLoadingMoreMessages(true)
      const nextPage = currentPage + 1
      const pagination = await getMessages({
        userId: SelectedUser._id,
        page: nextPage,
      })

      if (pagination) {
        setCurrentPage(nextPage)
        setHasMore(pagination.hasMore)
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            const scrollDiff = newScrollHeight - prevScrollHeight
            container.scrollTop = prevScrollTop + scrollDiff
          }
          setIsLoadingMoreMessages(false)
        }, 100)
      }
    } catch (error) {
      console.error("Error loading more messages:", error)
      setIsLoadingMoreMessages(false)
    }
  }, [SelectedUser, currentPage, isLoadingMoreMessages, hasMore, getMessages])

  // Handling scroll events - Simplified back
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setIsScrolledToBottom(isAtBottom); // Update local state

    // If scrolled to bottom and window is visible, mark messages seen
    if (isAtBottom && document.visibilityState === "visible" && SelectedUser) {
      console.log("handleScroll: At bottom and visible, calling markMessagesAsSeen");
      markMessagesAsSeen(SelectedUser._id);
    }

    // Load more messages logic
    if (container.scrollTop < 20 && hasMore && !isLoadingMoreMessages) {
      loadMoreMessages();
    }
  }, [SelectedUser, hasMore, isLoadingMoreMessages, loadMoreMessages, markMessagesAsSeen]); // Added markMessagesAsSeen

  // Add/remove scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      // Initial check if scrolled to bottom on mount
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      setIsScrolledToBottom(isAtBottom);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]); // Dependency is just handleScroll

  // Scroll to bottom on initial load/user change
  useEffect(() => {
    scrollToBottom("auto");
    setIsScrolledToBottom(true); // Assume user starts at bottom
  }, [SelectedUser?._id, scrollToBottom]);

  // Scroll smoothly when new messages arrive IF user was previously at the bottom
  useEffect(() => {
    // Check scroll position *before* new messages render might be tricky.
    // Let's scroll if the *current* state indicates we are near the bottom.
    if (isScrolledToBottom && !isLoadingMoreMessages) {
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom, isLoadingMoreMessages, isScrolledToBottom]); // Use local isScrolledToBottom

  // Fetch initial messages
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    setIsScrolledToBottom(true); // Reset scroll tracker on user change
    if (SelectedUser?._id) {
      getMessages({ userId: SelectedUser._id, page: 1 }).then(() => {
         // After messages load, check scroll position again and mark seen if needed
         const container = messagesContainerRef.current;
         if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            setIsScrolledToBottom(isAtBottom);
            if (isAtBottom && document.visibilityState === "visible") {
               console.log("Initial load: At bottom and visible, calling markMessagesAsSeen");
               markMessagesAsSeen(SelectedUser._id);
            }
         }
      });
    }
  }, [SelectedUser?._id, getMessages, markMessagesAsSeen]); // Added markMessagesAsSeen

  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)

  const handleInputChange = () => {
    if (!isTyping && SelectedUser) {
      setIsTyping(true)
      sendTypingStatus({ to: SelectedUser._id, isTyping: true })
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      if (SelectedUser) {
        sendTypingStatus({ to: SelectedUser._id, isTyping: false })
      }
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (SelectedUser?._id) {
        sendTypingStatus({ to: SelectedUser._id, isTyping: false })
      }
    }
  }, [SelectedUser, sendTypingStatus])

  useEffect(() => {
    if (!socket || !SelectedUser) return
    const handleTyping = ({ from, isTyping }) => {
      if (from === SelectedUser._id) {
        setIsOtherUserTyping(isTyping)
      }
    }
    const handleMessageDeletion = ({ messageId, conversationId }) => {
      // Check if the deletion is for the currently selected conversation
      if (conversationId === SelectedUser?._id) {
        // Let the store handle the state update, maybe just log here
        console.log(`Deletion event for current chat: ${messageId}`);
      }
    }
    const handleMessageEdit = ({ messageId }) => { // Removed 'to' as it might not be reliable here
        // Let the store handle the actual state update globally
        // We might not need component-specific logic if store handles it well
        console.log(`Edit event received in component: ${messageId}`);
    }

    // Remove previous listeners specific to this component instance if any
    socket.off("typing");
    // socket.off("private_message"); // Remove if handled by store
    socket.off("message_deleted");
    socket.off("message_edited");

    // Add listeners
    socket.on("typing", handleTyping);
    // socket.on("private_message", handlePrivateMessage); // Remove if handled by store
    socket.on("message_deleted", handleMessageDeletion); // Keep if specific UI logic needed
    socket.on("message_edited", handleMessageEdit); // Keep if specific UI logic needed

    return () => {
      // Cleanup listeners on component unmount or when SelectedUser/socket changes
      socket.off("typing", handleTyping);
      // socket.off("private_message", handlePrivateMessage);
      socket.off("message_deleted", handleMessageDeletion);
      socket.off("message_edited", handleMessageEdit);
    }
    // Rerun effect if socket or SelectedUser changes. handleNewMessage/DeleteMessage refs shouldn't change.
  }, [socket, SelectedUser]); // Removed authUser?._id dependency as it's stable

  // Handle visibility change - Simplified back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isScrolledToBottom && SelectedUser) {
         console.log("Visibility changed: Visible and at bottom, calling markMessagesAsSeen");
         markMessagesAsSeen(SelectedUser._id);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Initial check on mount
    if (document.visibilityState === "visible" && isScrolledToBottom && SelectedUser) {
        console.log("Initial mount: Visible and at bottom, calling markMessagesAsSeen");
        markMessagesAsSeen(SelectedUser._id);
    }
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isScrolledToBottom, SelectedUser, markMessagesAsSeen]); // Depend on local scroll state

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault()
    }
    const content = e?.target?.message?.value || e?.target?.message
    if (!content || content.trim().length === 0) return // Only check if empty, don't trim content itself

    try {
      await sendMessage({ userId: SelectedUser._id, content }) // Send original content with line breaks
      if (e?.target) {
        e.target.message.value = ""
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "42px"
      }
      if (socket) {
        socket.emit("typing", { to: SelectedUser._id, isTyping: false })
      }
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Determine block status with logging
  const isBlockedByMe = useMemo(() => {
    const blocked = blockedUsers.includes(SelectedUser?._id);
    // Log the calculation details
    console.log("[ChatContainer] isBlockedByMe Check:", { 
      selectedUserId: SelectedUser?._id, 
      blockedUsersArray: blockedUsers, 
      result: blocked 
    });
    return blocked;
  }, [blockedUsers, SelectedUser?._id]); // Depend specifically on SelectedUser._id

  const isBlockedByThem = useMemo(() => {
    const blocked = SelectedUser?.isBlockedViewer;
     // Log the calculation details
    console.log("[ChatContainer] isBlockedByThem Check:", { 
      selectedUser: SelectedUser, 
      isBlockedViewerProp: SelectedUser?.isBlockedViewer,
      result: blocked 
    });
    return !!blocked; // Ensure boolean
  }, [SelectedUser?.isBlockedViewer]); // Depend specifically on the property

  const isChatBlocked = useMemo(() => {
    const blocked = isBlockedByMe || isBlockedByThem;
    // Log the final result
    console.log("[ChatContainer] isChatBlocked Calculated:", { 
      isBlockedByMe, 
      isBlockedByThem, 
      result: blocked 
    });
    return blocked;
  }, [isBlockedByMe, isBlockedByThem]);

  // Add a useEffect to specifically log when isChatBlocked changes value
  useEffect(() => {
    console.log("[ChatContainer] isChatBlocked state updated:", isChatBlocked);
  }, [isChatBlocked]);

  const handleBlock = async () => {
    if (!SelectedUser || isBlocking) return // Prevent action if already blocking
    try {
      await blockUser(SelectedUser._id)
      // No need to call IsBlocking here
      setShowProfileModal(false)
    } catch (error) {
      console.error("Error blocking user:", error)
      // Handle error display
    }
    // No finally block needed here for IsBlocking
  }

  const handleUnblock = async () => {
    if (!SelectedUser || isBlocking) return // Prevent action if already blocking
    try {
      await unblockUser(SelectedUser._id)
      setShowProfileModal(false)
    } catch (error) {
      console.error("Error unblocking user:", error)
      // Handle error display
    }
  }

  if (!SelectedUser) return null

  return (
    <div className="w-full h-full bg-base-100 font-work-sans flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-100 w-full">
        <div className="flex items-center gap-3">
          {SelectedUser.profilePic ? (
            <button
              onClick={() => setShowProfileModal(true)}
              className="cursor-pointer hover:opacity-80 transition-opacity relative"
            >
              <img
                src={SelectedUser.profilePic || "/placeholder.svg"}
                alt={userFullName}
                className={`w-10 h-10 rounded-lg object-cover ${isChatBlocked ? "opacity-70 grayscale" : ""}`}
              />
              {isChatBlocked && (
                <div className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5">
                  <Ban size={12} />
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowProfileModal(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium cursor-pointer hover:opacity-80 transition-opacity capitalize ${getRandomColor(
                SelectedUser._id,
              )} ${isChatBlocked ? "opacity-70" : ""} relative`}
            >
              {userFirstInitial}
              {isChatBlocked && (
                <div className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5">
                  <Ban size={12} />
                </div>
              )}
            </button>
          )}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <h3 className="font-medium text-sm">{userFullName}</h3>
                </button>

                {SelectedUser.isVerified && SelectedUser.fullName === "Faker" && (
                  <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                {SelectedUser.isVerified && SelectedUser.fullName !== "Faker" && (
                  <span className="text-xs text-amber-400 font-medium">
                    <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  </span>
                )}
                {isChatBlocked && (
                  <span className="text-xs bg-error/10 text-error px-1.5 py-0.5 rounded-full flex items-center gap-1 ml-1">
                    <Ban size={10} />
                    {isBlockedByMe ? "Blocked" : "Restricted"}
                  </span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth relative">
        {isChatBlocked && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-base-100/5 backdrop-blur-[1px] w-full h-full flex items-center justify-center"
            ></motion.div>
          </div>
        )}
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
            {/* messages */}
            {messages.map((message) => {
              // --- Debugging Logs for isMyMessage ---
              const senderId = message?.sender?._id ?? message?.sender; // Handle both object and string ID cases
              const authId = authUser?._id;
              const isMyMessage = senderId === authId;
              console.log(`Msg ID: ${message._id}, Sender ID: ${senderId} (Type: ${typeof senderId}), Auth ID: ${authId} (Type: ${typeof authId}), Is Mine: ${isMyMessage}`);
              // --- End Debugging Logs ---

              return (
                <div
                  key={`${message._id}-${message.createdAt}`}
                  className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                  onClick={() => {
                    if (window.innerWidth < 900) {
                      const buttons = document.querySelectorAll(`[data-message-id="${message._id}"]`)
                      buttons.forEach((button) => {
                        button.classList.toggle("opacity-100")
                      })
                    }
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`relative group max-w-[80%] rounded-xl p-3 shadow-sm ${
                      isMyMessage ? "bg-primary text-primary-content" : "bg-base-200"
                    } ${isChatBlocked ? "opacity-70" : ""}`} 
                  >
                    {editingMessageId === message._id ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <textarea
                          ref={editInputRef}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full resize-none rounded-sm px-2 py-1 text-sm bg-primary-foreground/50 border-none focus:outline-none focus:ring-1 focus:ring-primary text-primary-content"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSaveEdit()
                            } else if (e.key === "Escape") {
                              handleCancelEdit()
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={handleCancelEdit} className="text-[10px] opacity-70 hover:opacity-100">
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="text-[10px] font-medium opacity-70 hover:opacity-100"
                          >
                            Save
                          </button>
                        </div>
                      </motion.div>
                    ) : (
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
                    )}
                    <p
                      className={`text-[10px] mt-1.5 ${
                        isMyMessage ? "text-primary-content/70" : "text-base-content/70"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {message.edited && " (edited)"}
                    </p>
                    {isMyMessage && !isChatBlocked && (
                      <p
                        className={`text-[10px] mt-0.5 ${ // Adjusted margin slightly
                          isMyMessage ? "text-primary-content/50" : "text-base-content/70"
                        }`}
                      >
                        {/* Check the specific message's isRead status */}
                        {message.isRead ? "Seen" : "Delivered"}
                      </p>
                    )}
                    {isMyMessage && !isChatBlocked && (
                      <div
                        className="absolute -right-3 -top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-message-id={message._id}
                      >
                        <motion.button
                          onClick={() => handleStartEdit(message)}
                          whileHover={{ scale: 1.1 }}
                          className="bg-primary text-white p-1 rounded-full active:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label="Edit message"
                        >
                          <Edit2 size={14} />
                        </motion.button>
                        <motion.button
                          onClick={() => DeleteMessage(message._id, SelectedUser._id)}
                          whileHover={{ scale: 1.1 }}
                          className="bg-error text-white p-1 rounded-full active:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label="Delete message"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                </div>
              )
            })}
            {/* Typing Indicator */}
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
      {/* Message Input */}
      {isChatBlocked ? (
        <div className="p-4 border-t border-base-300 bg-base-200 flex flex-col items-center gap-3">
          <div className="bg-base-300 rounded-full p-3">
            <Ban size={24} className="text-base-content/70" />
          </div>
          <div className="text-center">
            <p className="font-medium text-base-content">
              {isBlockedByMe ? "You've blocked this user" : "You cannot reply to this conversation"}
            </p>
            <p className="text-sm text-base-content/70 mt-1">
              {isBlockedByMe
                ? "Unblock this user from their profile to continue the conversation"
                : "This user has restricted who can send them messages"}
            </p>
          </div>
          {isBlockedByMe && (
            <motion.button
              onClick={() => setShowProfileModal(true)}
              className="btn btn-sm btn-outline mt-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Profile
            </motion.button>
          )}
        </div>
      ) : (
        <form className="p-3 border-t border-base-300 bg-base-100" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              name="message"
              placeholder="Type a message..."
              className="w-full resize-none rounded-sm px-4 py-2 max-h-32 min-h-[42px] text-sm bg-base-200 border-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed" // Add disabled styles
              rows="1"
              disabled={isFetchingBlockedUsers || isBlocking} // Disable while fetching or blocking
              onKeyDown={(e) => {
                if (window.innerWidth >= 900) {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    const content = e.target.value
                    if (content && content.trim().length > 0) {
                      handleSubmit({ target: { message: content } })
                      e.target.value = ""
                      e.target.style.height = "42px"
                    }
                  }
                } else {
                  // For mobile devices, if it's Enter key, don't prevent default
                  if (e.key === "Enter") {
                    return // This allows new line creation on mobile
                  }
                }
              }}
              onInput={(e) => {
                e.target.style.height = "42px"
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
              }}
              onChange={handleInputChange}
              autoComplete="off"
            />
            <button 
              type="submit" 
              className="btn btn-primary btn-circle"
              disabled={isFetchingBlockedUsers || isBlocking} // Disable while fetching or blocking
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      )}

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
                    src={SelectedUser.profilePic || "/placeholder.svg"}
                    alt={SelectedUser.fullName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold capitalize ${getRandomColor(
                      SelectedUser._id,
                    )}`}
                  >
                    <div>
                      <h1>{SelectedUser.fullName?.charAt(0).toUpperCase()}</h1>
                      {SelectedUser.isVerified && <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1 mb-1">
                  <h3 className="text-xl font-bold">{SelectedUser.fullName}</h3>
                  {SelectedUser.isVerified && SelectedUser.fullName === "Faker" && (
                    <BadgeCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  {SelectedUser.isVerified && SelectedUser.fullName !== "Faker" && (
                    <span className="text-amber-400 font-medium">
                      <BadgeCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  {onlineUsers.includes(SelectedUser._id) ? (
                    <span className="text-sm text-success flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-success rounded-full"></span> Online now
                    </span>
                  ) : (
                    <UserStatus userId={SelectedUser._id} />
                  )}
                </div>
                {SelectedUser.description && (
                  <div className="mb-6 max-w-xs">
                    <h4 className="text-sm font-medium mb-2 text-base-content/70">About</h4>
                    <p className="text-sm">{SelectedUser.description}</p>
                  </div>
                )}
                {SelectedUser.email && (
                  <div className="text-sm text-base-content/70">
                    <span className="font-medium">Email: </span> {SelectedUser.email}
                  </div>
                )}
                <div className="mt-6 flex justify-center h-10">
                  <AnimatePresence mode="wait">
                    {isBlockedByMe ? (
                      <motion.button
                        key="unblock"
                        onClick={handleUnblock}
                        disabled={isBlocking}
                        className="btn btn-sm flex items-center gap-2 disabled:opacity-50 bg-success/10 text-success hover:bg-success hover:text-success-content border-success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isBlocking ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                            <Ban size={16} />
                          </motion.div>
                        )}
                        Unblock User
                      </motion.button>
                    ) : (
                      <motion.button
                        key="block"
                        onClick={handleBlock}
                        disabled={isBlocking}
                        className="btn btn-sm flex items-center gap-2 disabled:opacity-50 bg-error/10 text-error hover:bg-error hover:text-error-content border-error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isBlocking ? <Loader2 className="animate-spin h-4 w-4" /> : <Ban size={16} />}
                        Block User
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ChatContainer
