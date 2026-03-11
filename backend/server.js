require("dotenv").config();
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const adminRoutes = require("./routes/adminRoutes");
const statusRoutes = require("./routes/statusRoutes");
const mongoose = require("mongoose"); // missing
const { onlineUsers } = require("./socketStore");
const User = require("./models/User");
// Add these with other routes
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
// Add with other routes
const attendanceRoutes = require('./routes/attendanceRoutes');
// Add with other routes
const performanceRoutes = require('./routes/performanceRoutes');
// Add with other routes
const documentRoutes = require('./routes/documentRoutes');
// Add with other routes
const dashboardRoutes = require('./routes/dashboardRoutes');
// Add with other routes
const reportRoutes = require('./routes/reportRoutes');
dotenv.config();
connectDB();
const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/status", statusRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/documents', documentRoutes);
// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);


app.get("/", (req, res) => {
  res.send("Server running");
});

// 🔥 SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  
  socket.on("user-online", (userId) => {
    userId = String(userId);
    console.log("SERVER RECEIVED ONLINE:", userId);
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    
    onlineUsers.get(userId).add(socket.id);
    
    io.emit("status-update", {
      userId,
      online: true,
      idle: false,
    });
  });
  //useless code
  socket.on("user-offline", async (userId) => {
    userId = String(userId);
    
    onlineUsers.delete(userId);
    
    const lastSeen = new Date();
    await User.findByIdAndUpdate(userId, { lastSeen });
    
    io.emit("status-update", {
      userId,
      online: false,
      lastSeen,
    });
  });
  
  socket.on("user-idle", (userId) => {
    userId = String(userId);
    console.log("SERVER RECEIVED IDLE:", userId);
    io.emit("status-update", {
      userId,
      online: false,
      idle: true,
    });
  });
  
  socket.on("user-logout", async (userId) => {
    userId = String(userId);
    
    onlineUsers.delete(userId);
    
    const lastSeen = new Date();
    await User.findByIdAndUpdate(userId, { lastSeen });
    
    io.emit("status-update", {
      userId,
      online: false,
      idle: false,
      lastSeen,
    });
  });
  
  socket.on("disconnect", async () => {
    try {
      let disconnectedUserId = null;
      
      // Find which user this socket belongs to
      for (let [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          // Remove this socket from user's socket set
          sockets.delete(socket.id);
          
          // If user has no more sockets, they're completely offline
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            disconnectedUserId = userId;
            
            // Update lastSeen in database
            const lastSeen = new Date();
            await User.findByIdAndUpdate(userId, { lastSeen });
            
            // Broadcast offline status to all clients
            io.emit("status-update", {
              userId,
              online: false,
              lastSeen,
              timestamp: new Date()
            });
            
            console.log(`📴 User ${userId} is now offline`);
          } else {
            console.log(`📱 User ${userId} closed one tab, still online`);
          }
          break; // Found the user, exit loop
        }
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  });
  
});


// ✅ SINGLE server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend + Socket running on port ${PORT}`);
});

