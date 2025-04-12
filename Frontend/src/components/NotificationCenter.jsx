"use client"

import { useState, useEffect } from "react"
import { Bell, X, Check, BellRing } from "lucide-react"
import useNotificationStore from "@/store/useNotificationStore"
import { useNavigate } from "react-router-dom"
import ChatStore from "../store/useChatStore"
import { formatDistanceToNow } from "date-fns"
import { getNotificationPermission, requestNotificationPermission } from "@/lib/browserNotifications"
import { useAuthStore } from "@/store/useAuthStore"
import { motion, AnimatePresence } from "framer-motion"

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission())
  const { notifications, fetchUnreadNotifications, markAsRead, deleteNotifications, isLoading } = useNotificationStore()

  useEffect(() => {
    // Always check permission on mount
    setNotificationPermission(getNotificationPermission())

    // And also when dropdown opens
    if (isOpen) {
      setNotificationPermission(getNotificationPermission())
    }
  }, [isOpen])

  const getFormattedTime = (notification) => {
    // Check for different possible date fields
    const dateValue = notification.createdAt || notification.timestamp || notification.date

    if (!dateValue) return "Unknown time"

    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return "Unknown time"
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error("Date formatting error:", error, notification)
      return "Unknown time"
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch notifications if user is authenticated
        const { authUser } = useAuthStore.getState()
        if (authUser) {
          console.log("Fetching unread notifications...")
          await fetchUnreadNotifications()
        } else {
          console.log("User not authenticated, skipping notification fetch")
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    fetchData()
    // Set up polling for notifications
    const interval = setInterval(fetchData, 15000) // Poll every 15 seconds for more responsive updates

    return () => clearInterval(interval)
  }, [fetchUnreadNotifications])

  // Listen for socket events that might trigger notification updates
  useEffect(() => {
    const { socket } = useAuthStore.getState()
    if (socket) {
      // When a new notification is received, refresh the notifications list
      const handleNewNotification = () => {
        fetchUnreadNotifications()
      }

      socket.on("new_notification", handleNewNotification)

      return () => {
        socket.off("new_notification", handleNewNotification)
      }
    }
  }, [fetchUnreadNotifications])

  const { setSelectedUser } = ChatStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchUnreadNotifications()
  }, [fetchUnreadNotifications])

  const handleNotificationClick = async (notification) => {
    // Mark this notification as read
    await markAsRead([notification._id])

    // Navigate to the chat with this sender
    if (notification.from) {
      setSelectedUser({ _id: notification.from })
      navigate("/")
    }

    setIsOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n._id)

    if (unreadIds.length > 0) {
      await markAsRead(unreadIds)
    }
  }

  const handleClearAll = async () => {
    const notificationIds = notifications.map((n) => n._id)
    if (notificationIds.length > 0) {
      await deleteNotifications(notificationIds)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // Handle requesting browser notification permission
  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
  }

  // Toggle notification panel
  const toggleNotifications = () => {
    setIsOpen(!isOpen)
  }

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } },
  }

  const panelVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transformOrigin: "top right",
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.2,
        ease: "easeInOut",
      },
    },
  }

  const mobilePanelVariants = {
    hidden: {
      opacity: 0,
      y: -50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
      },
    },
  }

  const staggerItems = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",   
        stiffness: 400,
        damping: 25,
      },
    },
  }

  const bellAnimation = {
    initial: { rotate: 0 },
    ring: {
      rotate: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
  }

  return (
    <div className="relative">
      <motion.button
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-base-300 hover:bg-base-300/80 transition-colors duration-200"
        onClick={toggleNotifications}
        whileTap={{ scale: 0.95 }}
        animate={unreadCount > 0 ? "ring" : "initial"}
        variants={bellAnimation}
      >
        <Bell size="1rem" className="text-base-content" />
        {unreadCount > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 bg-error text-error-content rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-medium"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for better focus */}
            <motion.div
              className="fixed inset-0 bg-black/5 z-40"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsOpen(false)}
            />

            {/* Mobile view (centered) */}
            <motion.div
              className="fixed inset-x-0 top-16 flex justify-center z-50 sm:hidden"
              variants={mobilePanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="w-80 max-w-[90vw] bg-base-100 rounded-xl shadow-2xl border border-base-300 max-h-[70vh] overflow-hidden">
                <div className="p-4 border-b border-base-300 flex justify-between items-center">
                  <h3 className="font-medium text-base-content">Notifications</h3>
                  <div className="flex gap-2">
                    <motion.button
                      className="p-1.5 rounded-md hover:bg-base-200 transition-colors disabled:opacity-50"
                      onClick={handleMarkAllAsRead}
                      disabled={unreadCount === 0}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Check size={16} className="text-base-content" />
                    </motion.button>
                    <motion.button
                      className="p-1.5 rounded-md hover:bg-base-200 transition-colors disabled:opacity-50"
                      onClick={handleClearAll}
                      disabled={notifications.length === 0}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X size={16} className="text-base-content" />
                    </motion.button>
                  </div>
                </div>

                {/* Notification content for mobile */}
                {notificationPermission !== "granted" && (
                  <div className="p-4 border-b border-base-300">
                    <motion.button
                      className="w-full px-4 py-2 bg-primary text-primary-content rounded-lg flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-colors"
                      onClick={handleRequestPermission}
                      whileTap={{ scale: 0.98 }}
                    >
                      <BellRing size={16} />
                      <span className="text-sm font-medium">Enable Notifications</span>
                    </motion.button>
                  </div>
                )}

                {/* Notification list for mobile */}
                <div className="overflow-y-auto max-h-[50vh]">
                  <motion.div
                    className="divide-y divide-accent-content/10"
                    variants={staggerItems}
                    initial="hidden"
                    animate="visible"
                  >
                    {isLoading ? (
                      <div className="p-4 flex justify-center">
                        <div className="flex space-x-1.5">
                          <motion.div
                            className="w-2 h-2 rounded-full bg-base-content/50"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "loop",
                              delay: 0,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 rounded-full bg-base-content/50"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "loop",
                              delay: 0.2,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 rounded-full bg-base-content/50"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "loop",
                              delay: 0.4,
                            }}
                          />
                        </div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-base-content/70">
                        <div className="flex justify-center mb-2">
                          <Bell size={24} className="text-base-content/30" />
                        </div>
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <motion.div
                          key={notification._id}
                          className={`p-3 cursor-pointer hover:bg-base-200 transition-colors ${notification.read ? "opacity-60" : ""}`}
                          onClick={() => handleNotificationClick(notification)}
                          variants={itemVariants}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-sm text-base-content">{notification.message}</p>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary mt-1.5 ml-1.5 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-base-content/60 mt-1">{getFormattedTime(notification)}</p>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Desktop/tablet view (dropdown) */}
            <motion.div
              className="absolute right-0 mt-3 w-80 bg-base-100 rounded-xl shadow-2xl z-50 border border-base-300 max-h-[70vh] overflow-hidden hidden sm:block"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="p-4 border-b border-base-300 flex justify-between items-center">
                <h3 className="font-medium text-base-content">Notifications</h3>
                <div className="flex gap-2">
                  <motion.button
                    className="p-1.5 rounded-md hover:bg-base-200 transition-colors disabled:opacity-50"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                    whileTap={{ scale: 0.95 }}
                    title="Mark all as read"
                  >
                    <Check size={16} className="text-base-content" />
                  </motion.button>
                  <motion.button
                    className="p-1.5 rounded-md hover:bg-base-200 transition-colors disabled:opacity-50"
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    whileTap={{ scale: 0.95 }}
                    title="Clear all"
                  >
                    <X size={16} className="text-base-content" />
                  </motion.button>
                </div>
              </div>

              {/* Notification permission for desktop */}
              {notificationPermission !== "granted" && (
                <div className="p-4 border-b border-base-300">
                  <motion.button
                    className="w-full px-4 py-2 bg-primary text-primary-content rounded-lg flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-colors"
                    onClick={handleRequestPermission}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BellRing size={16} />
                    <span className="text-sm font-medium">Enable Notifications</span>
                  </motion.button>
                </div>
              )}

              {/* Notification list for desktop */}
              <div className="overflow-y-auto max-h-[50vh]">
                <motion.div
                  className="divide-y divide-base-300"
                  variants={staggerItems}
                  initial="hidden"
                  animate="visible"
                >
                  {isLoading ? (
                    <div className="p-4 flex justify-center">
                      <div className="flex space-x-1.5">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-base-content/50"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, repeatType: "loop", delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-base-content/50"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "loop",
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-base-content/50"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "loop",
                            delay: 0.4,
                          }}
                        />
                      </div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-base-content/70">
                      <div className="flex justify-center mb-2">
                        <Bell size={24} className="text-base-content/30" />
                      </div>
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <motion.div
                        key={notification._id}
                        className={`p-3 cursor-pointer hover:bg-base-200 transition-colors ${notification.read ? "opacity-60" : ""}`}
                        onClick={() => handleNotificationClick(notification)}
                        variants={itemVariants}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-base-content">{notification.message}</p>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-1.5 ml-1.5 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-base-content/60 mt-1">{getFormattedTime(notification)}</p>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationCenter
