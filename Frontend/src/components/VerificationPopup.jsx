import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useVerification } from "../context/VerificationContext";
import toast from "react-hot-toast";

const VerificationPopup = () => {
  const { showVerification, closeVerification } = useVerification();
  const { verifyOTP } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("pending");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error("Please enter verification code");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const success = await verifyOTP(otp);
      if (success) {
        toast.success("Email verified successfully");
        setStatus("success");
        setTimeout(() => {
          closeVerification();
        }, 2000);
      } else {
        setStatus("error");
        setError("Invalid verification code. Please try again.");
        toast.error("Invalid verification code");
      }
    } catch (error) {
      setStatus("error");
      setError("Invalid verification code. Please try again.");
      toast.error("Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {showVerification && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && closeVerification()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-base-100 p-8 rounded-2xl shadow-2xl max-w-md w-[90%] mx-4 relative border border-base-300 font-work-sans"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeVerification}
              className="absolute top-4 right-4 p-2 hover:bg-base-200 rounded-full transition-colors duration-200"
            >
              <X size={20} className="text-base-content/70 hover:text-base-content" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-base-content">Verify Your Email</h3>
              <p className="text-base text-base-content/80">
                We've sent a verification code to your email address. Please enter it below.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <input
                  type="text"
                  onChange={(e) => {
                    setError("");
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }}
                  placeholder="000000"
                  className={`input input-bordered w-full text-center text-3xl tracking-[0.5em] font-mono h-16 text-base-content placeholder:text-base-content/30 ${error ? 'border-error' : ''}`}
                  maxLength={6}
                />
                {error ? (
                  <p className="text-[13px] text-error text-center mt-2">
                    {error}
                  </p>
                ) : (
                  <p className="text-[13px] text-base-content/60 text-center mt-2">
                    Enter the 6-digit verification code
                  </p>
                )}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="btn btn-primary w-full h-12 text-[15px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  "Verify Email"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VerificationPopup;
