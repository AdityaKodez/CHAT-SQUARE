import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import axiosInstance from '@/lib/axios';

const BlockButton = ({ userId, isBlocked, onBlockChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuthStore();

  const handleBlockToggle = async () => {
    if (!authUser) return;

    setIsLoading(true);
    try {
      const endpoint = isBlocked ? '/auth/unblock-user' : '/auth/block-user';
      await axiosInstance.post(endpoint, { blockedUserId: userId });
      
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      if (onBlockChange) onBlockChange(!isBlocked);
    } catch (error) {
      toast.error('Failed to update block status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleBlockToggle}
      disabled={isLoading}
      className={`btn btn-sm gap-2 ${
        isBlocked ? 'btn-error' : 'btn-outline btn-error'
      }`}
    >
      <Shield size={16} />
      {isBlocked ? 'Unblock' : 'Block'}
    </button>
  );
};

export default BlockButton;