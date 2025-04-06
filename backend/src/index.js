import express from "express"
import router from "./routes/auth.route.js"
import dotenv from "dotenv"
dotenv.config();
import path from "path"
import cors from "cors"
import { app, server, io } from "./lib/socket.js"; // Import io from socket.js
import { connectDB } from "./lib/lib.js";
const __dirname = path.resolve();
import cookieParser from "cookie-parser";
import Messagerouter from "./routes/message.route.js";
import notificationRouter from "./routes/notification.route.js";
import axios from "axios";

app.use(cookieParser());

// Define PORT only once
const PORT = process.env.PORT || 3000;
const googleFormEndpoint = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSdhUTcCeal6LPIDymhFsKS67SULgOe9bwxZQqx8q2WYW30ZGQ/formResponse";

// Map your form fields to Google Forms entry IDs
const entryMapping = {
  name: "entry.1806094173",
  email: "entry.487256984",
  feedback: "entry.1645771783",
  rating: "entry.1220413980",
};

// allow you to get Json data from db 
app.use(express.json({ limit: '10mb' })); // Adjust the limit as needed
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors(
  {
    origin: process.env.NODE_ENV === "production" 
      ? true  // Allow requests from any origin in production
      : "http://localhost:5173",
    credentials: true,
  }
))

// API routes
app.use("/api/auth", router)
app.use("/api/message", Messagerouter)
app.use("/api/notification", notificationRouter)

// Add feedback route BEFORE the production/development conditional
app.post("/api/submit-feedback", async (req, res) => {
  const { name, email, feedback, rating } = req.body;

  try {
    const formData = new URLSearchParams();
    formData.append(entryMapping.name, name);
    formData.append(entryMapping.email, email);
    formData.append(entryMapping.feedback, feedback);
    formData.append(entryMapping.rating, rating);

    // Send data to Google Forms
    await axios.post(googleFormEndpoint, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    res.status(200).json({ message: "Feedback submitted successfully!" });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Failed to submit feedback." });
  }
});

// Serve static files in production
if(process.env.NODE_ENV === "production"){
  // Serve static files
  app.use(express.static(path.join(__dirname, "../Frontend/dist")))
  
  // Handle all other routes by serving the index.html
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../Frontend", "dist", "index.html"))
  })
} else {
  // Only use the 404 handler in development
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found", message: "The requested resource could not be found." });
  });
}

// Make io available to routes
app.set('io', io);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to database
connectDB();
