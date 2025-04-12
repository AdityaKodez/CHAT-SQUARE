import express from "express"
import { checkAuth, login, logout, signup, updateProfile, lastOnline, CheckEmail,Delete, sendOTP, verifyOTP,blockUser, unblockUser, getBlockedUsers} from "../controller/auth.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

router.post("/lastOnline", protectRoute, lastOnline)
router.post("/signup", signup)
router.post("/login", login)
router.post("/logout", logout)
router.patch("/updateProfile", protectRoute, updateProfile)
router.get("/check", protectRoute, checkAuth)
router.get("/check-email", CheckEmail);
router.delete("/delete",protectRoute,Delete)
router.post("/send-otp",protectRoute, sendOTP);
router.post("/verify-otp",protectRoute, verifyOTP);
router.post("/block-user", protectRoute, blockUser);
router.post("/unblock-user", protectRoute, unblockUser);
router.get("/blocked-users", protectRoute,getBlockedUsers)
export default router;