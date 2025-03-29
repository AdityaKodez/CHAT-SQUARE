import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Camera, Loader2, LogOutIcon, Mail, User } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ChatStore from '@/store/useChatStore';

const Profile = () => {
  const { authUser, isUpdatingProfile, updateProfile, logout } = useAuthStore();


  const [profileUpdate, setProfileUpdate] = useState({
    fullName: authUser?.fullName,
    profilePic: null,
    status: authUser?.status || "offline" // Default to offline
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
    // Use the user ID to get a consistent color for each user
    const index = userId.charCodeAt(0) % Colors.length;
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

      // Send fullName, profilePic, and status
      await updateProfile({
        fullName: profileUpdate.fullName,
        profilePic: profileImage.previewUrl,
        status: profileUpdate.status // Include status in the update
      });
      
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-8 md:px-8">
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
      
      <div className="max-w-4xl mx-auto rounded-2xl p-6 md:p-8">
        <div className='w-full flex justify-between items-center mb-6'>
          <h1 className="text-2xl font-bold mb-6 font-work-sans">Profile Settings</h1>
          <button onClick={logout} className="btn btn-sm btn-soft btn-error mb-6"><LogOutIcon size="1rem"/>Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className={ `w-44 h-44 rounded-full overflow-hidden flex items-center justify-center ${getRandomColor(authUser._id)}`}>
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
          <form onSubmit={handleSubmit} className="space-y-6 justify-center flex flex-col items-center">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 font-work-sans">Full Name</label>
                <div className="input validator w-[20rem]">
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
                <div className="input validator">
                  <Mail className="h-[1.1em] opacity-50" />
                  <input
                    type="email"
                    defaultValue={authUser?.email}
                    className="font-poppins"
                    disabled
                  />
                </div>
              </div>

              {/* Status Section */}
             
            </div>

            <button
              type="submit"
              className="btn btn-info w-full md:w-[70%] px-10"
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

