import express from "express"
import { checkAuth, login, logout, signup, updateProfile, lastOnline, CheckEmail } from "../controller/auth.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

// Remove this line
// router.use("/lastOnline",lastOnline)

// Keep only this one
router.post("/lastOnline", protectRoute, lastOnline)
router.post("/signup", signup)
router.post("/login", login)
router.post("/logout", logout)
router.patch("/updateProfile", protectRoute, updateProfile)
router.get("/check", protectRoute, checkAuth)
// Add this route to your existing routes
router.get("/check-email", CheckEmail);

export default router;