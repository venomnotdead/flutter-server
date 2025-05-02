const express = require("express");
const router = express.Router();
// const Message = require('../models/Message');
// const User = require('../models/User');
const auth = require("../middleware/auth");

// Mock users from auth.js
const mockUsers = [
  {
    _id: "1",
    email: "test@example.com",
    name: "Test User",
  },
];

// Mock messages
const mockMessages = [
  {
    _id: "1",
    userId: { _id: "1", email: "test@example.com", name: "Test User" },
    message: "Welcome to the chat!",
    timestamp: new Date("2023-05-01T10:00:00Z"),
  },
  {
    _id: "2",
    userId: { _id: "1", email: "test@example.com", name: "Test User" },
    message: "This is a test message.",
    timestamp: new Date("2023-05-01T10:05:00Z"),
  },
];

// Get chat messages
router.get("/messages", auth, async (req, res) => {
  try {
    // Format messages for the client
    const formattedMessages = mockMessages.map((msg) => ({
      id: msg._id,
      userId: msg.userId._id,
      userName: msg.userId.email,
      message: msg.message,
      timestamp: msg.timestamp,
    }));

    console.log("Returning", formattedMessages.length, "messages");

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send a chat message
router.post("/messages", auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Find user
    const user = mockUsers.find((user) => user._id === req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create new message
    const newMessage = {
      _id: (mockMessages.length + 1).toString(),
      userId: { _id: user._id, email: user.email, name: user.name },
      message: message.trim(),
      timestamp: new Date(),
    };

    // Add to mock messages
    mockMessages.push(newMessage);

    // Format message for the response
    const formattedMessage = {
      id: newMessage._id,
      userId: newMessage.userId._id,
      userName: newMessage.userId.email,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
    };

    console.log("New message added:", formattedMessage.message);

    res.status(201).json({ message: formattedMessage });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
