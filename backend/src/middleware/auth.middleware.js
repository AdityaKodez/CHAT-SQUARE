import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
export const protectRoute=async (req, res, next) => {
    try {
      const token = req.cookies.jwt;
      if (!token) {
          return res.status(401).json({ message: "Unauthorized: No token provided" });
      }
      // Verify the token using jwt.verify()
      const decoded=jwt.verify(token,process.env.JWT_SECRET_KEY);
      console.log(decoded)
      if (!decoded) {
       return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
 
      }
       const user = await User.findById(decoded._id);
       console.log(user)
     if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      
      req.user = user
      // Attach user information to the request object

      // Call next() to proceed to the next middleware or route handler
      next();
    } catch (error) {
      console.error("Error in protectRoute middleware:", error);
      return res.status(401).json({ message: "Unauthorized  Invalid token" }); // Return 401 for authentication failures
    }
  };
