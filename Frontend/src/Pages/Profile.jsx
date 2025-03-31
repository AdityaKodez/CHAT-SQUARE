import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { AlertCircle, BadgeCheck, Camera, Loader2, LogOutIcon, Mail, User, User2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const Profile = () => {
  const { authUser, isUpdatingProfile, updateProfile, logout, DeleteAccount } = useAuthStore();
  const [charCount, setCharCount] = useState(authUser?.description?.length || 0);
  const MAX_CHARS = 100;
  
  const handleTextareaChange = (e) => {
    const text = e.target.value;
    
    if (text.length <= MAX_CHARS) {
      setCharCount(text.length);
      setProfileUpdate(prev => ({
        ...prev,
        description: text
      }));
    }
  };
  
  // State to control delete account confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [profileUpdate, setProfileUpdate] = useState({
    fullName: authUser?.fullName,
    profilePic: null,
    status: authUser?.status || "offline", // Default to offline
    description: authUser?.description || ""
  });

  const [profileImage, setProfileImage] = useState({
    previewUrl: authUser?.profilePic
  });

  const Colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  function getRandomColor(userId) {
    // If no userId is provided, return the first color
    if (!userId) return Colors[0];
    
    // Simple string hash function for better distribution
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      // Multiply by 31 (common in hash functions) and add character code
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use absolute value to ensure positive index
    const index = Math.abs(hash) % Colors.length;
    
    return Colors[index];
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfileImage({
          previewUrl: base64String
        });
        setProfileUpdate(prev => ({
          ...prev,
          profilePic: base64String
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isUpdatingProfile) {
        toast.error("Profile update is in progress...");
        return;
      }

      await updateProfile({
        fullName: profileUpdate.fullName,
        profilePic: profileImage.previewUrl,
        status: profileUpdate.status,
        description: profileUpdate.description
      });
      
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  // Animation variants for the modal
  const modalVariants = {
    initial: {
      opacity: 0,
      y: 20, // Slide up effect
      scale: 0.98, // Subtle scale for depth
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20, // Slide down on exit
      scale: 0.98,
      transition: {
        duration: 0.4,
        ease: "easeIn",
      },
    },
  };

  return (
    <div className="min-h-screen pt-20 px-4 max-w-full overflow-x-hidden">
      <Toaster
        position="top-right"
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            className: '!bg-blue-500 !text-white text-sm font-poppins',
          },
          error: {
            className: '!bg-red-500 !text-white text-sm font-poppins',
          },
        }}
      />
      
      <div className="max-w-4xl mx-auto rounded-2xl p-6 md:p-8 w-full">
        <div className='w-full flex flex-col sm:flex-row justify-between items-center sm:items-start mb-8'>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold font-work-sans mb-4 sm:mb-5">Profile</h1>
            
          </div>
          <div className='flex gap-3'>
            <button onClick={logout} className="btn btn-sm btn-outline btn-info flex items-center gap-1 px-3">
              <LogOutIcon size="1rem"/>
              <span>Logout</span>
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="btn btn-sm btn-soft btn-error flex items-center gap-1 px-3">
              <User2 size="1rem"/>
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className={`w-44 h-44 rounded-full overflow-hidden flex items-center justify-center ${getRandomColor(authUser._id)}`}>
                {profileImage.previewUrl || authUser?.profilePic ? (
                  <img
                    src={profileImage.previewUrl || authUser?.profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-white">
                    {authUser?.fullName?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <label
                htmlFor="profile-picture"
                className="absolute bottom-2 right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
              >
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  id="profile-picture"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="text-sm text-center font-work-sans">
              Click the camera icon to change your profile picture
            </p>
          </div>

          {/* Profile Details Section */}
          <form onSubmit={handleSubmit} className="space-y-6 justify-center flex flex-col items-center w-full">
            <div className="space-y-4 w-full">
              <div>
                <label className="block text-sm font-medium mb-2 font-work-sans">Full Name</label>
                <div className="input validator w-full">
                  <User className="h-[1.1em] opacity-50" />
                  <input
                    type="text"
                    defaultValue={profileUpdate.fullName || authUser?.fullName}
                    onChange={(e) => setProfileUpdate({
                      ...profileUpdate,
                      fullName: e.target.value,
                    })}
                    className="font-poppins"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 font-work-sans">Email</label>
                <div className="input validator w-full">
                  <Mail className="h-[1.1em] opacity-50" />
                  <input
                    type="email"
                    defaultValue={authUser?.email}
                    className="font-poppins"
                    disabled
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2 font-work-sans'>Description</label>
                <textarea
                  defaultValue={authUser.description}
                  onChange={handleTextareaChange}
                  className="textarea resize-none textarea-bordered w-full h-20 font-work-sans"
                  placeholder="Tell us about yourself..."
                  maxLength={MAX_CHARS}
                ></textarea>
                <div className="flex justify-end mt-2 font-poppins">
                  <p className={`text-xs ${charCount >= MAX_CHARS ? 'text-error' : 'text-base-content/60'}`}>
                    {charCount}/{MAX_CHARS} characters
                  </p>
                </div>
              </div>
            </div> 

          
            <div className="flex flex-col w-full gap-4">
              <button
                type="submit"
                className="btn btn-info w-full"
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              variants={modalVariants} // Nested animation for the inner card
              className="bg-base-100 rounded-lg shadow-lg max-w-md w-full p-6 relative"
            >
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="text-red-500" size={24} />
                </div>
                <h3 className="text-xl font-bold font-work-sans">Delete Account</h3>
                <p className="text-gray-600 font-poppins">
                  Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    DeleteAccount();
                    setShowDeleteModal(false);
                  }} 
                  className="btn btn-error"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;