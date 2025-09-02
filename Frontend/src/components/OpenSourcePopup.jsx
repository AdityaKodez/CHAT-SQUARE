import { motion, AnimatePresence } from "framer-motion";
import { Github, Star, Heart, X, ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const OpenSourcePopup = ({ isOpen, onClose }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Stop confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  const popupVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      rotateX: -15
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      rotateX: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 25,
        mass: 0.9,
        delay: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 30,
      transition: { 
        duration: 0.2, 
        ease: "easeIn" 
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  const handleGitHubClick = () => {
    window.open("https://github.com/AdityaKodez/CHAT-SQUARE", "_blank", "noopener,noreferrer");
  };

  // Confetti particles
  const confettiParticles = Array.from({ length: 20 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-2 h-2 rounded-full"
      style={{
        backgroundColor: ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"][i % 5],
        left: `${20 + (i * 3)}%`,
        top: "20%"
      }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={showConfetti ? {
        y: [0, -100, 200],
        x: [0, Math.random() * 100 - 50],
        opacity: [1, 1, 0],
        rotate: [0, 360],
        scale: [1, 1.5, 0]
      } : {}}
      transition={{
        duration: 2,
        ease: "easeOut",
        delay: i * 0.1
      }}
    />
  ));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Confetti */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {confettiParticles}
              </div>
            )}

            {/* Popup Container */}
            <motion.div
              variants={popupVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-300 max-w-md w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-base-200 rounded-full transition-colors duration-200 z-20"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} className="text-base-content/60" />
              </motion.button>

              {/* Gradient header */}
              <motion.div 
                className="relative h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 overflow-hidden"
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                {/* Floating icons */}
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-white/20"
                      style={{
                        left: `${15 + (i * 12)}%`,
                        top: `${20 + (i % 3) * 20}%`
                      }}
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 360],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut"
                      }}
                    >
                      {i % 3 === 0 ? <Github size={16} /> : 
                       i % 3 === 1 ? <Star size={14} /> : 
                       <Heart size={12} />}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Main icon */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2 
                  }}
                >
                  <motion.div
                    className="p-4 bg-white/20 backdrop-blur-sm rounded-full"
                    whileHover={{ scale: 1.1 }}
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(255,255,255,0.3)",
                        "0 0 30px rgba(255,255,255,0.5)",
                        "0 0 20px rgba(255,255,255,0.3)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Github size={32} className="text-white" />
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Content */}
              <motion.div 
                className="p-6 space-y-6"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Title with sparkles */}
                <motion.div variants={itemVariants} className="text-center relative">
                  <motion.div
                    className="absolute -top-2 left-1/4 text-yellow-400"
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles size={16} />
                  </motion.div>
                  <motion.div
                    className="absolute -top-1 right-1/4 text-blue-400"
                    animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    <Sparkles size={12} />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-base-content mb-2">
                    🎉 We're Open Source!
                  </h2>
                  <p className="text-base-content/70 text-sm">
                    Chat Square is now available to the community
                  </p>
                </motion.div>

                {/* Description */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <p className="text-base-content/80 text-sm leading-relaxed">
                    We're excited to share that Chat Square is now open source! 
                    Join our community, contribute to the project, and help us make 
                    real-time communication even better.
                  </p>
                  
                  <motion.div 
                    className="flex items-center gap-2 text-xs text-base-content/60 bg-base-200 p-3 rounded-lg"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Heart size={14} className="text-red-400" />
                    <span>Star the repo • Report issues • Contribute features</span>
                  </motion.div>
                </motion.div>

                {/* Action buttons */}
                <motion.div variants={itemVariants} className="flex gap-3">
                  <motion.button
                    onClick={handleGitHubClick}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Github size={16} />
                    <span>Visit Repository</span>
                    <ExternalLink size={14} />
                  </motion.button>
                  
                  <motion.button
                    onClick={onClose}
                    className="px-4 py-3 bg-base-200 hover:bg-base-300 text-base-content rounded-lg transition-all duration-200 font-medium text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Maybe Later
                  </motion.button>
                </motion.div>

                {/* Footer note */}
                <motion.div 
                  variants={itemVariants}
                  className="text-center pt-2 border-t border-base-300"
                >
                  <p className="text-xs text-base-content/50">
                    This popup won't show again after visiting
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OpenSourcePopup;
