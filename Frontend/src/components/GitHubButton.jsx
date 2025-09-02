import { motion } from "framer-motion";
import { Github, Star, Code } from "lucide-react";
import { useState } from "react";

const GitHubButton = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.05, 
      rotate: [0, -2, 2, 0],
      transition: {
        duration: 0.4,
        ease: "easeInOut"
      }
    },
    tap: { scale: 0.95 }
  };

  const iconVariants = {
    initial: { rotate: 0 },
    hover: { 
      rotate: 360,
      transition: {
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  };

  const starVariants = {
    initial: { scale: 0, opacity: 0 },
    hover: { 
      scale: [0, 1.2, 1], 
      opacity: [0, 1, 1],
      transition: {
        duration: 0.5,
        times: [0, 0.6, 1],
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className="relative group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg border border-gray-600 hover:border-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl"
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        animate={isHovered ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      
      {/* Animated stars in background */}
      <motion.div
        variants={starVariants}
        className="absolute -top-1 -right-1 text-yellow-400"
      >
        <Star size={12} fill="currentColor" />
      </motion.div>
      
      <motion.div
        variants={starVariants}
        className="absolute -bottom-1 -left-1 text-blue-400"
        transition={{ delay: 0.1 }}
      >
        <Code size={10} />
      </motion.div>

      {/* Main content */}
      <div className="relative flex items-center gap-2 z-10">
        <motion.div variants={iconVariants}>
          <Github size={16} />
        </motion.div>
        <span className="text-sm font-medium">Open Source</span>
      </div>

      {/* Animated border */}
      <motion.div
        className="absolute inset-0 rounded-lg border-2 border-transparent"
        style={{
          background: isHovered 
            ? "linear-gradient(45deg, #3b82f6, #8b5cf6, #3b82f6) border-box" 
            : "transparent",
          mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          maskComposite: "subtract"
        }}
        animate={isHovered ? {
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.button>
  );
};

export default GitHubButton;
