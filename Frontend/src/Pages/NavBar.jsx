"use client"

import { MessageSquare, Settings, User2Icon, ShieldCheck, LogOut, Mail, ChevronRight } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { Link } from "react-router-dom"
import NotificationCenter from "@/components/NotificationCenter"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import VerifyEmailButton from "@/components/VerifyEmailButton"
import VerificationPopup from "@/components/VerificationPopup"
import { useVerification } from "@/context/VerificationContext";

const NavBar = () => {
  const { authUser, logout } = useAuthStore()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const menuRef = useRef(null)
  const { openVerification } = useVerification();

  const userFullName = authUser?.fullName
  const userEmail = authUser?.email || "user@example.com"
  const userFirstInitial = userFullName?.[0] || "?"
  const userId = authUser?.userId || "defaultUserId"
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

  // Toggle profile menu
  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen)
  }

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Random color for profile button
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

  // Framer Motion variants for animation
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } },
  }

  const menuVariants = {
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

  const staggerMenuItems = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const menuItemVariants = {
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

  return (
    <div className="navbar flex justify-between items-center p-4 font-work-sans fixed top-0 w-full z-[40] border-b-2 border-gray-800 backdrop-blur-2xl bg-base-200">
      <div className="logo flex gap-3 items-center px-4">
        <Link to={"/"} className="flex items-center gap-2">
          <MessageSquare className="text-blue-400" size="1.2rem" />
          <h3 className="text-[0.8rem]">Chat Square</h3>
        </Link>
      </div>
      <div className="settings flex items-center gap-3 pr-3">
        {/* Notification button */}
        {authUser && <NotificationCenter size="1rem" />}

        {/* Profile button with popover */}
        {authUser && (
          <div className="relative" ref={menuRef}>
            <motion.button
              onClick={toggleProfileMenu}
              whileTap={{ scale: 0.95 }}
              className={`btn-sm w-8 h-8 btn-circle ${getRandomColor(
                userId,
              )} text-white capitalize text-sm font-work-sans cursor-pointer flex items-center justify-center shadow-md`}
            >
              {authUser.profilePic ? (
                <img
                  src={authUser.profilePic || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                userFirstInitial
              )}
            </motion.button>

            {/* Backdrop for better focus */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  className="fixed inset-0 bg-black/5 z-40"
                  variants={backdropVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
              )}
            </AnimatePresence>

            {/* Enhanced Popover with Framer Motion */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  className="absolute right-0 mt-3 w-64 bg-base-100 rounded-xl shadow-2xl py-0 border border-base-300 overflow-hidden z-50"
                  variants={menuVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {/* User info section */}
                  <motion.div
                    className="p-4 bg-base-200/50 border-b border-base-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${getRandomColor(userId)} flex items-center justify-center text-base-100 text-lg font-medium`}
                      >
                        {authUser.profilePic ? (
                          <img
                            src={authUser.profilePic || "/placeholder.svg"}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          userFirstInitial
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base-content truncate">{userFullName}</p>
                        <p className="text-xs text-base-content/70 truncate flex items-center gap-1">
                          <Mail size={12} />
                          {userEmail}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Menu items */}
                  <motion.div className="py-2" variants={staggerMenuItems} initial="hidden" animate="visible">
                    <motion.div variants={menuItemVariants}>
                      <Link
                        to="/profile"
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-base-content hover:bg-base-300/50 transition-colors duration-200"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-pink-100 dark:bg-pink-900/30 p-1.5 rounded-md">
                            <User2Icon size="0.9rem" className="text-pink-500" />
                          </div>
                          <span>Profile</span>
                        </div>
                        <ChevronRight size="0.9rem" className="text-base-content/50" />
                      </Link>
                    </motion.div>

                    <motion.div variants={menuItemVariants}>
                      <Link
                        to="/settings"
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-base-content hover:bg-base-300/50 transition-colors duration-200"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-pink-100 dark:bg-pink-900/30 p-1.5 rounded-md">
                            <Settings size="0.9rem" className="text-pink-500" />
                          </div>
                          <span>Settings</span>
                        </div>
                        <ChevronRight size="0.9rem" className="text-base-content/50" />
                      </Link>
                    </motion.div>
{!authUser.isVerified && (
  <motion.div variants={menuItemVariants}>
    <VerifyEmailButton
      onClick={() => {
        setIsProfileMenuOpen(false);
        openVerification();
      }}
      className="flex items-center justify-between px-4 py-2.5 text-sm text-base-content hover:bg-base-300/50 transition-colors duration-200 w-full"
    />
  </motion.div>
)}

                    <div className="h-px bg-base-300 my-1.5 mx-4"></div>

                    <motion.div variants={menuItemVariants}>
                      <button
                        onClick={() => {
                          logout()
                          setIsProfileMenuOpen(false)
                        }}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors duration-200 w-full"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-error/10 p-1.5 rounded-md">
                            <LogOut size="0.9rem" className="text-error" />
                          </div>
                          <span>Logout</span>
                        </div>
                      </button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <VerificationPopup 
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
      />
    </div>
  )
}

export default NavBar
