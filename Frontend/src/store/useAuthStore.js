import { create } from "zustand";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
const BASE_URL =   import.meta.env.MODE==="development"?"http://localhost:3000/api":"/";
export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningIn: false,
  isLoggingin: false,
isUpdatingProfile: false,
  socket: null,

  // Add the missing checkAuth function
  checkAuth: async function() {
    try {
      const res = await axiosInstance.get("/auth/check");   
      set({authUser: res.data});
      get().connectSocket();
    } catch (error) {
      console.log("error in check auth", error);
      set({authUser: null});  
    } finally {
      set({isCheckingAuth: false});
    }
  },
 login: async function({email, password}) {
    set({isLoggingin: true})
    try {
      const res = await axiosInstance.post("/auth/login", {
        email,
        password
      });
      toast.success("Logged In Successfully");
      set({authUser: res.data})
      get().connectSocket();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "Login failed");
      throw error; // Re-throw to be caught by the component
    }
    finally {
      set({isLoggingin: false}) 
    }
  },
  // Fix the socket connection check
  connectSocket: async function() {
    const { authUser, socket } = get();
    if (!authUser) return;
    if (socket?.connected) return;

    try {
      const newSocket = io(BASE_URL);
      
      newSocket.on("connect", () => {
        console.log("Connected to socket server");
  
        // Emit the setup even
        newSocket.emit("setup", authUser._id);
        set({ socket: newSocket });
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from socket server");
        set({ socket: null });
       
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    } catch (error) {
      console.error("Error connecting to socket server:", error);
      toast.error("Failed to connect to socket server");
    }
  },

  // Fix the disconnect socket function
  disconnectSocket: function() {
    const { socket } = get();
    if (socket) {
      socket.off(); // Remove all listeners first
      socket.disconnect();
        set({ socket: null });
    }
  },

  // Fix the logout function
  logout: async function() {
    try {
        // Update lastOnline first before disconnecting
        try {
          await get().updateLastOnline();
          console.log("Last online timestamp updated");
        } catch (error) {
          console.error("Error updating last online timestamp:", error);
        }
          
        // Disconnect socket
        get().disconnectSocket();
          
        // Make logout API call
        await axiosInstance.post("/auth/logout", {}, {
          withCredentials: true
        });
          
        // Clear auth state
        set({ authUser: null });
        toast.success("Logged Out Successfully");
    } catch (error) {
        console.error("Logout error:", error);
        toast.error("Failed to log out");
    }
},
  updateProfile: async function({profilePic, fullName}) {
    set({isUpdatingProfile: true})
    try {
      const res = await axiosInstance.patch("/auth/updateProfile", {
        profilePic,
        fullName
      });
  
      set({authUser: res.data})
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error(error.response?.data?.message || "Update profile failed");
      throw error; // Re-throw to be caught by the component
    } finally {
      set({isUpdatingProfile: false})
    }
  },



// Add this function to your useAuthStore
// Update this function
updateLastOnline: async function() {
  try {
    const response = await axiosInstance.post("/auth/lastOnline");
    console.log("Last online updated successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating last online:", error);
  }
},
// Make sure your useAuthStore has a signup function like this:

signup: async function(userData) {
  set({isSigningIn: true});
  try {
    const res = await axiosInstance.post("/auth/signup", userData);
    toast.success("Account created successfully!");
    set({authUser: res.data});
    get().connectSocket();
  } catch (error) {
    console.error("Signup error:", error);
    toast.error(error.response?.data?.message || "Signup failed");
    throw error; // Re-throw to be caught by the component
  } finally {
    set({isSigningIn: false});
  }
}
}))