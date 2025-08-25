import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for global messages
    },
    isGlobal: {
      type: Boolean,
      default: false, // Default to private messages
    },
    content: {
      type: String,
      required: true,
      trim: true, // Removes extra spaces
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"], // Supports different message types
      default: "text",
    },
    fileUrl: {
      type: String, // Stores URL of uploaded file if messageType is not text
    },
    isRead: {
      type: Boolean,
      default: false, // Tracks if the receiver has read the message
    },
    edited: {
      type: Boolean,
      default: false, // Tracks if the message has been edited
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
