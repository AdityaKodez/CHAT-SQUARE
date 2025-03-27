import express from "express";
import { getUserForSidebar, getMessages,sendMessage,DeleteMessage } from "../controller/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
const Messagerouter = express.Router();

Messagerouter.get("/users", protectRoute,getUserForSidebar); // Send message
Messagerouter.get("/:userId", protectRoute, getMessages); // Get message // Mark message as read
Messagerouter.post("/send/:userId", protectRoute, sendMessage); // Send message
Messagerouter.delete("/:messageId", protectRoute,DeleteMessage ); // Delete message
export default Messagerouter;
