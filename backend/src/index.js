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
app.use("/api/auth",router)
app.use("/api/message",Messagerouter)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", message: "The requested resource could not be found." }); // or res.render('404.ejs'); or res.send('404 Not Found');
});
if(process.env.NODE_ENV === "production"){
  app.use(express.static(path.join(__dirname,"../../Frontend/dist")))
  app.get("*",(req,res)=>{
    res.sendFile(path.resolve(__dirname,"../../Frontend","dist","index.html"))
  })
}
// Make io available to routes
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB()
  });
