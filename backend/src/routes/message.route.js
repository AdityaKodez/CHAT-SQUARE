import express from "express";
import { getUserForSidebar, getMessages, sendMessage, DeleteMessage } from "../controller/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
const Messagerouter = express.Router();

Messagerouter.get("/users", protectRoute, getUserForSidebar);
Messagerouter.get("/:userId", protectRoute, getMessages); // Now supports query params for pagination
Messagerouter.post("/send/:userId", protectRoute, sendMessage);
Messagerouter.delete("/:messageId", protectRoute, DeleteMessage);

export default Messagerouter;
