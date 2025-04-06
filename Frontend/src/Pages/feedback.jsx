import { useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { X, Star, Send, User, Mail, MessageSquare, Loader2, MessageSquareShare, MessagesSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import axiosInstance from "../lib/axios";
export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name:authUser?.fullName || "",
    email: authUser?.email || "",
    feedback: ""
  });
  const textareaRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Auto-resize textarea (matching chat app behavior)
    if (name === "feedback" && textareaRef.current) {
      textareaRef.current.style.height = '42px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!formData.name.trim() || !formData.email.trim() || !formData.feedback.trim() || rating === 0) {
      toast.error("Please complete all fields", {
        style: {
          borderRadius: "10px",
          background: "#363636",
          color: "#fff",
        },
      });
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Send data to the backend
      const response = await axiosInstance.post("/submit-feedback", {
        name: formData.name,
        email: formData.email,
        feedback: formData.feedback,
        rating: rating,
      });
  
      // Check if the response status is in the 2xx range
      if (response.status >= 200 && response.status < 300) {
        toast.success("Feedback received, thank you!", {
          style: {
            borderRadius: "10px",
            background: "#363636",
            color: "#fff",
          },
          icon: "✨",
        });
        resetForm();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsOpen(false);
    setRating(0);
    setFormData({ name: "", email: "", feedback: "" });
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors border-t border-base-300 mt-auto"
      >
        <div className="relative flex-shrink-0 mx-auto lg:mx-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessagesSquare className="size-5 text-primary" />
          </div>
        </div>
        <div className="hidden lg:block text-left min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="font-medium truncate">Feedback</p>
          </div>
          <p className="text-sm text-zinc-400 truncate">Help us improve</p>
        </div>
      </button>

      {/* Modal - Matching the chat UI modal style */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-work-sans"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-base-100 w-full max-w-md rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Using same style as your chat header */}
              <div className="px-7 py-5 border-b border-base-300 bg-base-100 relative flex justify-center items-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-3 right-3 text-base-content/70 hover:text-base-content transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="font-medium text-base text-primary">Share Your Feedback</h2>
              </div>

              <form onSubmit={handleSubmit} className="p-4">
                <div className="space-y-4">
                  {/* Name input - Style matching your app */}
                  <div>
                    <label className="text-sm text-base-content/70 mb-1 block">Your Name</label>
                    <input
                      name="name"
                      value={authUser.fullName}
                      onChange={handleChange}
                      disabled
                      placeholder="Enter your name"
                      className="w-full px-4 py-2 text-sm text-secondary-content bg-base-200 rounded-sm border-none"
                    />
                  </div>

                  {/* Email input */}
                  <div>
                    <label className="text-sm text-base-content/70 mb-1 block">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={authUser.email||formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2 text-sm bg-base-200 rounded-sm text-secondary-content border-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="text-sm text-base-content/70 mb-1 block">Rate Your Experience</label>
                    <div className="flex gap-2 my-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`${
                            star <= rating ? "text-amber-400" : "text-base-content/30"
                          } hover:text-amber-300 transition`}
                        >
                          <Star size={24} fill={star <= rating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback textarea - Matching your chat textarea */}
                  <div>
                    <label className="text-sm text-base-content/70 mb-1 block">Your Feedback</label>
                    <textarea
                      ref={textareaRef}
                      name="feedback"
                      value={formData.feedback}
                      onChange={handleChange}
                      placeholder="Type your feedback here..."
                      className="w-full resize-none rounded-sm text-secondary-content px-4 py-2 max-h-32 min-h-[42px] text-sm bg-base-200 border-none focus:outline-none focus:ring-1 focus:ring-primary"
                      rows="3"
                    />
                  </div>


                  {/* Submit button - Matching your Send button style */}
                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full btn btn-primary flex items-center justify-center gap-2 text-primary-content"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin h-5 w-5" />
                      ) : (
                        <>
                          Submit Feedback <Send size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}