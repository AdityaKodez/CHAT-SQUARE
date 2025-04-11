// VerifyEmailButton.jsx
import { useState } from "react";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";

const VerifyEmailButton = ({ className, onClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { verifyEmail } = useAuthStore();

  const handleVerifyEmail = async () => {
    setIsLoading(true);
    try {
      const success = await verifyEmail();
      if (success) {
        toast.success("Verification code sent to your email");
        onClick?.();
      }
    } catch (error) {
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleVerifyEmail} disabled={isLoading} className={className}>
      <div className="flex items-center gap-3">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1.5 rounded-md">
          <ShieldCheck size="0.9rem" className="text-yellow-500" />
        </div>
        <span>{isLoading ? "Sending..." : "Verify Email"}</span>
      </div>
      <ChevronRight size="0.9rem" className="text-base-content/50" />
    </button>
  );
};

export default VerifyEmailButton;