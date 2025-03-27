import express from "express"
import router from "./routes/auth.route.js"
import dotenv from "dotenv"
dotenv.config();
import path from "path"
import cors from "cors"
import { io, app, server } from "./lib/socket.js";
import { connectDB } from "./lib/lib.js";
const __dirname = path.resolve();
import cookieParser from "cookie-parser";
import Messagerouter from "./routes/message.route.js";
import { Server } from "socket.io";
app.use(cookieParser());

const PORT = process.env.PORT
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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB()
});
