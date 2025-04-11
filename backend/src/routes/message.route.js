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
Messagerouter.post("/mark-seen", protectRoute, markMessagesAsSeen);

export default Messagerouter;
