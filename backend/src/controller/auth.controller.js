import generateToken from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
   const { fullName, password, email } = req.body;

   try {
      if(!email||!fullName){
         return res.status(400).json({ message: "you must fill all fields" });
      }

      // Improved name validation
      const normalizedName = fullName.toLowerCase().trim();
      const restrictedWords = ['admin', 'faker'];
      
      if (restrictedWords.some(word => normalizedName.includes(word))) {
         return res.status(400).json({ message: "This name is not allowed" });
      }

      if (password.length < 6) {
         return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if the user already exists
      const userExists = await User.findOne({ email });
      if (userExists) {
         return res.status(409).json({ message: "User already exists" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const newUser = new User({
         fullName,
         email,
         password: hashedPassword,
         lastOnline: Date.now(),
      });

      if (newUser) {
         await newUser.save();
         // Generate JWT token and attach to response
        generateToken(newUser._id,res);
         return res.status(201).json({
            _id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            profilePic: newUser.profilePic,
         });
      } else {
         return res.status(400).json({ message: "User data is invalid" });
      }
   } catch (error) {
      console.error("Error in signup controller:", error.message);
      return res.status(500).json({ message: "Internal server error" });
   }
};
export const login = async (req, res) => {
   const {email,password} = req.body
   try {
     // Find the user by email
     const user = await User.findOne({email});
      
     if(req.body.email.trim().length === 0 || req.body.password.trim().length === 0){
      return res.status(400).json({ message: "you must fill all fields" });
     }
     // If user is not found, return error
     if (!user) {
       return res.status(404).json({ message: "Invalid password or email" });
     }
       
     // Compare entered password with stored hashed password
     const isMatch = await bcrypt.compare(password, user.password);
 
     // If password doesn't match, return error
     if (!isMatch) {
       return res.status(401).json({ message: "Invalid credentials" });
     }
 
     // If everything is correct, generate JWT token and return success response
   //   return res.json({ message: "User found, login successful!" });
   generateToken(user._id, res);
   return res.status(200).json({
     _id: user._id,
     fullName: user.fullName,
     email: user.email,
     profilePic: user.profilePic,
     lastOnline: user.lastOnline,
   })

   }

    catch (error) {
     // If there's an error, log it and return error response
     console.error(error);
     res.status(500).json({ message: "Internal server error" });
   }
 };
 
export const logout = async (req,res) => {
    try {
    
     
        // Clear the cookie
        res.cookie("jwt", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 0,
        });
        
        return res.status(200).json({ message: "User logged out successfully",
         lastOnline: Date.now(),
        });
    } catch (error) {
        console.error("Error in logout:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


export const updateProfile = async (req, res) => {
   try {
     const { profilePic, fullName } = req.body;
     const userId = req.user._id;
     if (!profilePic || !fullName) {
       return res.status(400).json({ message: "Profile picture and full name are required" });
     }
 
     // Find user
     const user = await User.findById(userId);
     if (!user) {
       return res.status(404).json({ message: "User not found" });
     }
 
     // Upload to Cloudinary
     const uploadResponse = await cloudinary.uploader.upload(profilePic, {
       folder: 'profile_pictures',
     });
 
     // Update user
     user.profilePic = uploadResponse.secure_url;
     user.fullName = fullName;
     await user.save();
 
     // Get the updated user data
     const updatedUser = await User.findById(userId).select("-password");
     
     // Emit a socket event to notify other users
     const io = req.app.get('io');
     if (io) {
       io.emit('user-updated', {
         userId: updatedUser._id,
         updatedData: {
           fullName: updatedUser.fullName,
           profilePic: updatedUser.profilePic
         }
       });
       console.log("Emitted user-updated event for user:", updatedUser._id);
     }
     
     // Send response (only once)
     return res.status(200).json({
       _id: updatedUser._id,
       fullName: updatedUser.fullName,
       email: updatedUser.email,
       profilePic: updatedUser.profilePic,
       lastOnline: updatedUser.lastOnline,
     });
   } catch (error) {
     console.error("Error updating profile:", error);
     return res.status(500).json({ message: "Internal server error" });
   }
};
export const checkAuth  = (req,res)=>{
   try {
      res.status(200).json(req.user)

   } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal server error" })
   }
}
export const lastOnline = async(req,res)=>{
  try {
    // No need to check for lastOnline in the request body
    // Just update with the current timestamp
    const userId = req.user._id;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { lastOnline: Date.now() },
      { new: true } // Returns the updated document
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      message: 'Last online updated',
      lastOnline: updatedUser.lastOnline,
    });
  } catch (error) {
    console.log("ERROR IN LAST ONLINE ROUTE", error);
    // Make sure to return a response in the catch block
    return res.status(500).json({ message: "Error updating last online status" });
  }
}

export const CheckEmail = async (req, res) => {
   try {
     const { email } = req.query;

     if (!email) {
       return res.status(400).json({ message: "Email is required" }); 
     }
     
     const user = await User.findOne({ email });
     if (user) {
       return res.status(200).json({ exists: true, message: "Email already registered" });
     }

     return res.status(200).json({ exists: false, message: "Email is available" });
   } catch (error) {
     console.error("Error in CheckEmail:", error);
     return res.status(500).json({ message: "Internal server error" });
   }
}
export const Delete = async (req, res) => {
    try {
        const userId = req.user._id; // From JWT
        const userToDelete = await User.findById(userId);
        
        if (!userToDelete) {
            return res.status(404).json({ message: "User not found" });
        }

        await User.findByIdAndDelete(userId);
        
        // Emit socket event if needed
        const io = req.app.get('io');
        if (io) {
            io.emit('user-deleted', { userId });
        }

        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error in Delete controller:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}