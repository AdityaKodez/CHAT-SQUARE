import express from "express";
import { 
  getUnreadNotifications, 
  markAsRead, 
  markAsDelivered, 
  deleteNotifications,
  getVapidKey,
  subscribe,
  unsubscribe
} from "../controller/notification.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const notificationRouter = express.Router();

// Push notification endpoints
notificationRouter.get("/vapid-public-key", getVapidKey);
notificationRouter.post("/subscribe", protectRoute, subscribe);
notificationRouter.post("/unsubscribe", protectRoute, unsubscribe);

// Regular notification endpoints
notificationRouter.get("/unread", protectRoute, getUnreadNotifications);
notificationRouter.post("/mark-read", protectRoute, markAsRead);
notificationRouter.post("/mark-delivered", protectRoute, markAsDelivered);
notificationRouter.post("/delete", protectRoute, deleteNotifications);

export default notificationRouter;