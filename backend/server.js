const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const adminRoutes = require("./routes/adminRoutes");
const statusRoutes = require("./routes/statusRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const managerRoutes = require('./routes/managerRoutes.js');
const attendanceRoutes = require("./routes/attendanceRoutes");
const performanceRoutes = require("./routes/performanceRoutes");
const documentRoutes = require("./routes/documentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");

const { onlineUsers } = require("./socketStore");
const User = require("./models/User");

connectDB();

const app = express();
const server = http.createServer(app);

require("./jobs/attendanceJobs");

// middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use('/api/managers', managerRoutes);

// serve uploaded files
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Server running");
});

// SOCKET.IO with better configuration
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Track connected sockets
const userSockets = new Map(); // userId -> Set of socket ids

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("user-online", async (userId) => {
    try {
      userId = String(userId);
      
      // Store socket mapping
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      
      // Store in onlineUsers for backward compatibility
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      // Update user status in database
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: null
      });

      // Broadcast to all clients
      io.emit("status-update", {
        userId,
        online: true,
        idle: false,
      });

      console.log(`✅ User ${userId} is now online (${userSockets.get(userId).size} connections)`);
    } catch (error) {
      console.error("Error in user-online:", error);
    }
  });

  socket.on("user-offline", async (userId) => {
    try {
      userId = String(userId);
      
      // Remove from mappings
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId);
        }
      }
      
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
        }
      }

      // If no more connections, update last seen
      if (!userSockets.has(userId)) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { 
          isOnline: false,
          lastSeen 
        });

        io.emit("status-update", {
          userId,
          online: false,
          lastSeen,
        });

        console.log(`📴 User ${userId} is now offline`);
      }
    } catch (error) {
      console.error("Error in user-offline:", error);
    }
  });

  socket.on("user-idle", (userId) => {
    try {
      userId = String(userId);
      io.emit("status-update", {
        userId,
        online: true,
        idle: true,
      });
    } catch (error) {
      console.error("Error in user-idle:", error);
    }
  });

  socket.on("user-logout", async (userId) => {
    try {
      userId = String(userId);
      
      // Remove all socket connections for this user
      userSockets.delete(userId);
      onlineUsers.delete(userId);

      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { 
        isOnline: false,
        lastSeen 
      });

      io.emit("status-update", {
        userId,
        online: false,
        idle: false,
        lastSeen,
      });

      console.log(`🚪 User ${userId} logged out`);
    } catch (error) {
      console.error("Error in user-logout:", error);
    }
  });

  socket.on("disconnect", async () => {
    try {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      // Find which user had this socket
      let disconnectedUserId = null;
      
      for (let [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          disconnectedUserId = userId;
          
          if (sockets.size === 0) {
            userSockets.delete(userId);
            onlineUsers.delete(userId);

            const lastSeen = new Date();
            await User.findByIdAndUpdate(userId, { 
              isOnline: false,
              lastSeen 
            });

            io.emit("status-update", {
              userId,
              online: false,
              lastSeen,
              timestamp: new Date(),
            });

            console.log(`📴 User ${userId} is now offline (all connections closed)`);
          }
          break;
        }
      }
      
      if (!disconnectedUserId) {
        // Also check onlineUsers for backward compatibility
        for (let [userId, sockets] of onlineUsers.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              onlineUsers.delete(userId);
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Add health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    connections: userSockets.size,
    onlineUsers: onlineUsers.size 
  });
});

// start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Backend + Socket running on port ${PORT}`);
});