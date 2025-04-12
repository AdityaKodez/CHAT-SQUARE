import express from "express";
import { getUserForSidebar, getMessages, sendMessage, DeleteMessage, getGlobalMessages, sendGlobalMessage, deleteGlobalMessage, UnseenMessage, markMessagesAsRead, EditMessage, markMessagesAsSeen } from "../controller/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
const Messagerouter = express.Router();

// Global chat routes
Messagerouter.get("/global", protectRoute, getGlobalMessages);
Messagerouter.post("/global", protectRoute, sendGlobalMessage);
Messagerouter.delete("/global/:messageId", protectRoute, deleteGlobalMessage);

// Private chat routes  
Messagerouter.get("/users", protectRoute, getUserForSidebar);
Messagerouter.get("/:userId", protectRoute, getMessages);
Messagerouter.post("/send/:userId", protectRoute, sendMessage);
Messagerouter.delete("/:messageId", protectRoute, DeleteMessage);

// Message editing and status routes
Messagerouter.put("/edit/:messageId", protectRoute, EditMessage); // Changed route path
Messagerouter.get("/unseen/:senderId", protectRoute, UnseenMessage);
Messagerouter.put("/mark-read/:senderId", protectRoute, markMessagesAsRead);

// Route for marking messages as seen by the receiver
Messagerouter.post("/mark-seen", protectRoute, (req, res, next) => {
  console.log(`Backend: Received request for POST /mark-seen`); // Log route match
  next(); // Pass control to the actual controller
}, markMessagesAsSeen);

export default Messagerouter;
