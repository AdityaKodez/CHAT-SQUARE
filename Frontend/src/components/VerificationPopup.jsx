"use client"

import { useState, useEffect } from "react"
import { Check, X, Loader2, AlertCircle, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/useAuthStore"
import { useVerification } from "../context/VerificationContext"
import toast from "react-hot-toast"

const VerificationPopup = () => {
  const { showVerification, closeVerification } = useVerification()
  const { verifyOTP } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("pending")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [focusedInput, setFocusedInput] = useState(false)
  const [showSuccessCheck, setShowSuccessCheck] = useState(false)

  // Reset state when popup opens
  useEffect(() => {
    if (showVerification) {
      setOtp("")
      setError("")
      setStatus("pending")
      setShowSuccessCheck(false)
    }
  }, [showVerification])

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error("Please enter verification code")
      setError("Please enter verification code")
      animateErrorShake()
      return
    }

    setIsLoading(true)
    setError("")
    try {
      const success = await verifyOTP(otp)
      if (success) {
        setStatus("success")
        setShowSuccessCheck(true)
        toast.success("Email verified successfully")
        setTimeout(() => {
          closeVerification()
        }, 2000)
      } else {
        setStatus("error")
        setError("Invalid verification code. Please try again.")
        toast.error("Invalid verification code")
        animateErrorShake()
      }
    } catch (error) {
      setStatus("error")
      setError("Invalid verification code. Please try again.")
      toast.error("Invalid verification code")
      animateErrorShake()
    } finally {
      setIsLoading(false)
    }
  }

  const animateErrorShake = () => {
    // This function is just a placeholder - the actual animation is handled by Framer Motion
    // We'll use this to trigger the error animation
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  }

  const iconContainerVariants = {
    pending: {
      backgroundColor: "rgba(var(--color-primary), 0.1)",
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
    success: {
      backgroundColor: "rgba(var(--color-success), 0.15)",
      scale: [1, 1.1, 1],
      transition: { duration: 0.5 },
    },
    error: {
      backgroundColor: "rgba(var(--color-error), 0.15)",
      x: [-4, 4, -4, 4, 0],
      transition: { duration: 0.4 },
    },
  }

  const successCheckVariants = {
    hidden: {
      opacity: 0,
      pathLength: 0,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      pathLength: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      },
    },
  }

  const inputVariants = {
    idle: {
      borderColor: "rgba(var(--color-border), 1)",
      boxShadow: "0 0 0 0 rgba(var(--color-primary), 0)",
    },
    focus: {
      borderColor: "rgba(var(--color-primary), 1)",
      boxShadow: "0 0 0 3px rgba(var(--color-primary), 0.2)",
    },
    error: {
      borderColor: "rgba(var(--color-error), 1)",
      boxShadow: "0 0 0 3px rgba(var(--color-error), 0.2)",
      x: [0, -5, 5, -5, 5, 0],
      transition: { duration: 0.4 },
    },
  }

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
    loading: {
      scale: 1,
      transition: {
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        duration: 1.5,
      },
    },
  }

  return (
    <AnimatePresence>
      {showVerification && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] min-h-screen"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.target === e.currentTarget && closeVerification()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-base-100 p-8 rounded-2xl shadow-2xl max-w-md w-[90%] mx-auto relative border border-base-300 font-work-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              onClick={closeVerification}
              className="absolute top-4 right-4 p-2 hover:bg-base-200 rounded-full transition-colors duration-200"
              whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--color-base-200), 1)" }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={20} className="text-base-content/70 hover:text-base-content" />
            </motion.button>

            <div className="text-center mb-8">
              <motion.div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                variants={iconContainerVariants}
                animate={status}
                initial="pending"
              >
                <AnimatePresence mode="wait">
                  {status === "pending" && (
                    <motion.div
                      key="pending"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Mail className="w-8 h-8 text-primary" />
                    </motion.div>
                  )}
                  {status === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-success"
                      >
                        <motion.path
                          d="M20 6L9 17L4 12"
                          variants={successCheckVariants}
                          initial="hidden"
                          animate={showSuccessCheck ? "visible" : "hidden"}
                        />
                      </svg>
                    </motion.div>
                  )}
                  {status === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AlertCircle className="w-8 h-8 text-error" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.h3
                className="text-2xl font-semibold mb-2 text-base-content"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {status === "success" ? "Email Verified!" : "Verify Your Email"}
              </motion.h3>

              <motion.p
                className="text-base text-base-content/80"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {status === "success"
                  ? "Thank you for verifying your email address."
                  : "We've sent a verification code to your email address. Please enter it below."}
              </motion.p>
            </div>

            <div className="space-y-6">
              <motion.div animate={error ? "error" : focusedInput ? "focus" : "idle"} variants={inputVariants}>
                <motion.input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setError("")
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }}
                  onFocus={() => setFocusedInput(true)}
                  onBlur={() => setFocusedInput(false)}
                  placeholder="000000"
                  className={`input input-bordered w-full text-center text-3xl tracking-[0.5em] font-mono h-16 text-base-content placeholder:text-base-content/30 transition-shadow duration-300 ${error ? "border-error" : ""}`}
                  maxLength={6}
                  disabled={status === "success"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                />

                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.p
                      key="error-message"
                      className="text-[13px] text-error text-center mt-2"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      {error}
                    </motion.p>
                  ) : (
                    <motion.p
                      key="help-text"
                      className="text-[13px] text-base-content/60 text-center mt-2"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      Enter the 6-digit verification code
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6 || status === "success"}
                className="btn btn-primary w-full h-12 text-[15px] relative overflow-hidden"
                variants={buttonVariants}
                initial="idle"
                whileHover={!isLoading && otp.length === 6 && status !== "success" ? "hover" : "idle"}
                whileTap={!isLoading && otp.length === 6 && status !== "success" ? "tap" : "idle"}
                animate={isLoading ? "loading" : "idle"}
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </motion.div>
                  ) : status === "success" ? (
                    <motion.div
                      key="success"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Check className="w-5 h-5" />
                      Verified
                    </motion.div>
                  ) : (
                    <motion.span key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Verify Email
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Button background animation for success state */}
                {status === "success" && (
                  <motion.div
                    className="absolute inset-0 bg-success"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default VerificationPopup
