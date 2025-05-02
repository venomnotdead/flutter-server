const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chat");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  // Add these options for better connection handling
  transports: ["polling", "websocket"],
  allowUpgrades: true,
  pingTimeout: 30000,
  pingInterval: 25000,
  connectTimeout: 30000,
  allowEIO3: true, // Allow Engine.IO 3 compatibility
});

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
const options = {
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: "majority",
};

// Database connection
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/tic-tac-toe";

console.log("Attempting to connect to MongoDB...");

// Server-side storage for when MongoDB is not available
const serverStorage = {
  users: [
    {
      _id: "1",
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    },
  ],
  messages: [
    {
      _id: "1",
      userId: { _id: "1", email: "test@example.com", name: "Test User" },
      message: "Welcome to the chat!",
      timestamp: new Date(),
    },
  ],
  // Helper methods for server-side storage
  findUserByEmail: function (email) {
    return this.users.find((user) => user.email === email);
  },
  findUserById: function (id) {
    return this.users.find((user) => user._id === id);
  },
  addUser: function (user) {
    // Generate an ID if not provided
    if (!user._id) {
      user._id = (this.users.length + 1).toString();
    }
    this.users.push(user);
    return user;
  },
  updateUser: function (id, updates) {
    const index = this.users.findIndex((user) => user._id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      return this.users[index];
    }
    return null;
  },
  addMessage: function (message) {
    // Generate an ID if not provided
    if (!message._id) {
      message._id = (this.messages.length + 1).toString();
    }
    this.messages.push(message);
    return message;
  },
  getMessages: function (limit = 50) {
    return this.messages.slice(-limit);
  },
};

// Flag to track if we're using server-side storage
let usingServerStorage = false;

// Try to connect to MongoDB
mongoose
  .connect(MONGO_URI, options)
  .then(() => {
    console.log("MongoDB connected successfully");
    usingServerStorage = false;
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.log("Using server-side storage instead of MongoDB");
    usingServerStorage = true;
  });

// Export the storage mechanism for use in routes
global.serverStorage = serverStorage;
global.usingServerStorage = () => usingServerStorage;

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("API is running");
});

// Socket.io connection handling
const connectedUsers = new Map();

io.use((socket, next) => {
  // Authentication middleware for socket.io
  console.log("Socket auth middleware - headers:", socket.handshake.headers);

  // Try to get token from different possible locations
  let token = null;

  // Check Authorization header (Bearer token)
  if (socket.handshake.headers.authorization) {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = authHeader; // Maybe the 'Bearer ' prefix is missing
    }
  }

  // Check query parameter as fallback
  if (!token && socket.handshake.query && socket.handshake.query.token) {
    token = socket.handshake.query.token;
  }

  // Check auth data as another fallback
  if (!token && socket.handshake.auth && socket.handshake.auth.token) {
    token = socket.handshake.auth.token;
  }

  console.log("Socket auth middleware - token found:", !!token);

  if (!token) {
    console.log("Socket auth middleware - no token provided");

    // Check if email is provided in handshake data
    let guestEmail = "anonymous@example.com";

    if (socket.handshake.query && socket.handshake.query.email) {
      guestEmail = socket.handshake.query.email;
    } else if (socket.handshake.auth && socket.handshake.auth.email) {
      guestEmail = socket.handshake.auth.email;
    }

    // Use the provided email or default to anonymous
    socket.user = { id: "guest", email: guestEmail };
    console.log("Using guest account with email:", guestEmail);
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    socket.user = decoded;
    console.log(
      "Socket auth middleware - token verified for user:",
      decoded.email
    );
    next();
  } catch (error) {
    console.error(
      "Socket auth middleware - token verification failed:",
      error.message
    );
    // For development, allow connections with invalid tokens
    // In production, you would want to uncomment the next line
    // return next(new Error("Authentication error: Invalid token"));

    // Check if email is provided in handshake data
    let guestEmail = "anonymous@example.com";

    if (socket.handshake.query && socket.handshake.query.email) {
      guestEmail = socket.handshake.query.email;
    } else if (socket.handshake.auth && socket.handshake.auth.email) {
      guestEmail = socket.handshake.auth.email;
    }

    // Use the provided email or default to anonymous
    socket.user = { id: "guest", email: guestEmail };
    console.log("Invalid token, using guest account with email:", guestEmail);
    next();
  }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  try {
    const userId = socket.user.id;
    const userName = socket.user.email;

    console.log(`User connected: ${userName} (${userId})`);

    // Add user to connected users
    connectedUsers.set(socket.id, { userId, userName });

    // Broadcast to all clients that a new user has joined
    socket.broadcast.emit("user_joined", userName);

    // Send the list of online users to all clients
    const onlineUsers = Array.from(connectedUsers.values()).map(
      (user) => user.userName
    );
    console.log("Online users:", onlineUsers);
    io.emit("users_update", onlineUsers);

    // Handle chat messages
    socket.on("message", (data) => {
      try {
        console.log("Received message data:", data);

        // Extract message from data
        let message;
        if (typeof data === "string") {
          message = data;
        } else if (data && typeof data === "object") {
          message = data.message;
        }

        // Get user info
        const user = connectedUsers.get(socket.id);

        // If user not found in connectedUsers, use socket.user as fallback
        const userId = user ? user.userId : socket.user.id;
        const userName = user ? user.userName : socket.user.email;

        if (message) {
          // Create message object
          const chatMessage = {
            id: Date.now().toString(),
            userId: userId,
            userName: userName,
            message: message,
            timestamp: new Date().toISOString(),
          };

          console.log("Broadcasting message:", chatMessage);

          // Broadcast the message to all clients
          io.emit("message", chatMessage);

          // Also send an acknowledgment back to the sender
          socket.emit("message_sent", {
            success: true,
            messageId: chatMessage.id,
          });

          // Save the message to the database (optional)
          // You can implement this part later
        } else {
          console.log("Invalid message format:", data);
          socket.emit("message_sent", {
            success: false,
            error: "Invalid message format",
          });
        }
      } catch (error) {
        console.error("Error handling message:", error);
        socket.emit("message_sent", {
          success: false,
          error: "Server error processing message",
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

      const user = connectedUsers.get(socket.id);
      if (user) {
        // Remove user from connected users
        connectedUsers.delete(socket.id);

        // Broadcast to all clients that a user has left
        socket.broadcast.emit("user_left", user.userName);

        // Update the list of online users
        const onlineUsers = Array.from(connectedUsers.values()).map(
          (user) => user.userName
        );
        console.log("Updated online users after disconnect:", onlineUsers);
        io.emit("users_update", onlineUsers);
      }
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  } catch (error) {
    console.error("Error in connection handler:", error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
