import { create } from "zustand";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// Define base URLs correctly
const API_BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api";
const SOCKET_BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

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
  DeleteAccount: async function() {
    try {
        const userId = get().authUser?._id;
        await axiosInstance.delete(`/auth/delete?userId=${userId}`);
        toast.success("Account deleted successfully!");
        set({authUser: null});
        get().disconnectSocket();
    } catch(error) {
        console.error("Delete account error:", error);
        toast.error(error.response?.data?.message || "Delete account failed");
    }
}
  ,
  // Fix the socket connection function
  connectSocket: async function() {
    const { authUser, socket } = get();
    if (!authUser) return;
    if (socket?.connected) return; // Only return if already connected

    try {
      const newSocket = io(SOCKET_BASE_URL, {
        reconnectionAttempts: 10, // Increase reconnection attempts
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
        autoConnect: true, // Ensure auto-connect is enabled
        forceNew: false // Don't force a new connection each time
      });
      
      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        // Emit the setup event
        newSocket.emit("setup", authUser._id);
        set({ socket: newSocket });
      });
  
      // Add a ping mechanism to keep the connection alive
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit("ping");
        }
      }, 25000); // Ping every 25 seconds
  
      newSocket.on("disconnect", () => {
        console.log("Disconnected from socket server");
        // Don't set socket to null here, let it reconnect
        // set({ socket: null });
        
        // Try to reconnect manually after a short delay
        setTimeout(() => {
          if (!newSocket.connected) {
            newSocket.connect();
          }
        }, 2000);
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
      });
      
      // Add additional event listeners for better debugging
      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      newSocket.on("reconnect_attempt", (attempt) => {
        console.log(`Socket reconnection attempt ${attempt}`);
      });

      newSocket.on("reconnect", () => {
        console.log("Socket reconnected successfully");
        // Re-emit setup event after reconnection
        if (authUser) {
          newSocket.emit("setup", authUser._id);
        }
      });
      
    } catch (error) {
      console.error("Error connecting to socket server:", error);
      toast.error("Failed to connect to socket server");
    }
  },

  disconnectSocket: function() {
    const { socket, socketPingInterval } = get();
    
    // Clear the ping interval if it exists
    if (socketPingInterval) {
      clearInterval(socketPingInterval);
    }
    
    if (socket) {
      socket.off(); // Remove all listeners first
      socket.disconnect();
      set({ socket: null, socketPingInterval: null });
    }
  },

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

  updateProfile: async function({profilePic, fullName, description}) {
    set({isUpdatingProfile: true})
    try {
      const res = await axiosInstance.patch("/auth/updateProfile", {
        profilePic,
        fullName,
        description
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

  updateLastOnline: async function() {
    try {
      const response = await axiosInstance.post("/auth/lastOnline");
      console.log("Last online updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error updating last online:", error);
    }
  },

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
}));
