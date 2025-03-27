import express from "express";
import { signup, login, logout, updateProfile, checkAuth, checkEmail } from "../controller/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", protectRoute, logout); // Use protectRoute middleware
router.patch("/updateProfile", protectRoute, updateProfile);
router.get("/checkAuth", protectRoute, checkAuth);
router.get("/checkEmail", checkEmail);

export default router;