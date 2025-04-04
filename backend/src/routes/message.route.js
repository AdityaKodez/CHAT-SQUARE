import express from "express";
import { getUserForSidebar, getMessages, sendMessage, DeleteMessage, getGlobalMessages, sendGlobalMessage, deleteGlobalMessage, UnseenMessage,markMessagesAsRead } from "../controller/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
const Messagerouter = express.Router();

// Global chat routes
Messagerouter.get("/global", protectRoute, getGlobalMessages); // Get global messages
Messagerouter.post("/global", protectRoute, sendGlobalMessage); // Send global message
Messagerouter.delete("/global/:messageId", protectRoute, deleteGlobalMessage); // Delete global message

// Private chat routes
Messagerouter.get("/users", protectRoute, getUserForSidebar);
Messagerouter.get("/:userId", protectRoute, getMessages);
Messagerouter.post("/send/:userId", protectRoute, sendMessage);
Messagerouter.delete("/:messageId", protectRoute, DeleteMessage);
// notification routes
Messagerouter.get("/unseen/:senderId", protectRoute, UnseenMessage);
Messagerouter.put("/markAsRead/:senderId", protectRoute, markMessagesAsRead);

export default Messagerouter;
