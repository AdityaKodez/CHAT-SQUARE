import generateToken from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendOTPEmail } from "../lib/nodemailer.js";
import Otp from "../models/otp.model.js";

export const signup = async (req, res) => {
   const { fullName, password, email } = req.body;

   try {
      if(!email||!fullName){
         return res.status(400).json({ message: "you must fill all fields" });
      }

      // Check if name contains 'Faker' for verification
      const normalizedName = fullName.toLowerCase().trim();
      const isVerified = normalizedName.includes('faker');
      
      // Only restrict 'admin' keyword
      if (normalizedName.includes('admin')||normalizedName.includes('faker')) {
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
         isVerified: isVerified
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
     isVerified: user.isVerified,
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
    const { fullName, profilePic, description } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!fullName) {
      return res.status(400).json({ error: "Full name is required" });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user fields
    user.fullName = fullName;
    
    // Update verification status based on name
    const normalizedName = fullName.toLowerCase().trim();
    user.isVerified = normalizedName.includes('faker');
    
    // Handle description (if provided)
    if (description !== undefined) {
      user.description = description;
    }

    // Handle profile picture upload if provided
    if (profilePic) {
      if (profilePic.startsWith("data:image")) {
        // If user already has a profile pic, delete the old one
        if (user.profilePic && user.profilePic.includes("cloudinary")) {
          const publicId = user.profilePic.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(publicId); /* this is used for destroying the old image from cloudinary */
        }

        // Upload new image
        const result = await cloudinary.uploader.upload(profilePic, {
          folder: "chatty_profile_pics",
          width: 500,
          crop: "scale",
        });

        user.profilePic = result.secure_url;
      }
    }

    // Save updated user
    await user.save();

    // Get the io instance
    const io = req.app.get('io');
    if (io) {
      // Emit user-updated event to all connected clients
      io.emit('user-updated', {
        userId: user._id.toString(),
        updatedData: {
          fullName: user.fullName,
          profilePic: user.profilePic,
          description: user.description
        }
      });
    }

    // Return updated user without password
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const checkAuth  = (req,res)=>{
   try {
      // Make sure to include all necessary user fields including isVerified
      res.status(200).json({
         _id: req.user._id,
         fullName: req.user.fullName,
         email: req.user.email,
         profilePic: req.user.profilePic,
         lastOnline: req.user.lastOnline,
         description: req.user.description,
         isVerified: req.user.isVerified
      })

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


}    }
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete any existing OTP for this email
    await Otp.deleteMany({ email });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to database with expiry time (10 minutes)
    const newOTP = new Otp({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    await newOTP.save();

    // Send OTP via email
    try {
      const emailSent = await sendOTPEmail(email, otp);
      if (!emailSent) {
        throw new Error("Failed to send email");
      }
      return res.status(200).json({ message: "Verification code sent successfully" });
    } catch (emailError) {
      // If email fails, delete the OTP record
      await Otp.deleteOne({ _id: newOTP._id });
      console.error("Email sending error:", emailError);
      return res.status(500).json({ message: "Failed to send verification code via email" });
    }

  } catch (error) {
    console.error("Error in sendOTP:", error);
    return res.status(500).json({ 
      message: "Failed to send verification code",
      error: error.message 
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Add input validation
    if (!email || !otp) {
      return res.status(400).json({ 
        message: "Email and verification code are required" 
      });
    }

    // Log the received data
    console.log('Received verification request:', { email, otp });
    
    // Find the most recent OTP for this email
    const otpRecord = await Otp.findOne({ 
      email: email.trim() 
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      return res.status(400).json({ 
        message: "No verification code found or code has expired" 
      });
    }

    // Compare OTP (after trimming and converting to string)
    if (otpRecord.otp !== otp.toString().trim()) {
      return res.status(400).json({ 
        message: "Invalid verification code" 
      });
    }

    // Update user verification status
    const updatedUser = await User.findOneAndUpdate(
      { email: email.trim() },
      { isVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        message: "User not found" 
      });
    }

    // Delete used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({ 
      message: "Email verified successfully",
      user: {
        isVerified: updatedUser.isVerified
      }
    });
    
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    return res.status(500).json({ 
      message: "Failed to verify email",
      error: error.message 
    });
  }
};