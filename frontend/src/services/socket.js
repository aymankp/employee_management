import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  connect(userId) {
    // If already connected with same user, reuse
    if (this.socket?.connected && this.userId === userId) {
      console.log("Already connected, reusing socket");
      return this.socket;
    }

    // Clean up existing socket
    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;
    
    console.log("🔌 Creating new socket connection for user:", userId);
    
    this.socket = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected with ID:", this.socket.id);
      if (this.userId) {
        this.socket.emit("user-online", this.userId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.userId) {
        this.socket.emit("user-offline", this.userId);
      }
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      console.log("🔌 Socket disconnected and cleaned up");
    }
  }

  // Helper methods for components to use
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create a single instance (singleton)
const socketService = new SocketService();
export default socketService;