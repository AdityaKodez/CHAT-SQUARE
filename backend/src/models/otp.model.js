import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Automatically delete docs after 10 minutes
  },
});

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;