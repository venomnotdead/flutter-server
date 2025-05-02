const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Get chat messages
router.get("/messages", auth, async (req, res) => {
  try {
    let messages = [];

    // Check if we're using server-side storage or MongoDB
    if (global.usingServerStorage()) {
      // Using server-side storage
      messages = global.serverStorage.getMessages();

      // Format messages for the client
      const formattedMessages = messages.map((msg) => ({
        id: msg._id,
        userId: msg.userId._id,
        userName: msg.userId.email,
        message: msg.message,
        timestamp: msg.timestamp,
      }));

      console.log(
        "Returning",
        formattedMessages.length,
        "messages (server storage)"
      );

      res.json({ messages: formattedMessages });
    } else {
      // Using MongoDB
      messages = await Message.find()
        .populate("userId", "email name")
        .sort({ timestamp: 1 })
        .limit(50);

      // Format messages for the client
      const formattedMessages = messages.map((msg) => ({
        id: msg._id,
        userId: msg.userId._id,
        userName: msg.userId.email,
        message: msg.message,
        timestamp: msg.timestamp,
      }));

      console.log("Returning", formattedMessages.length, "messages (MongoDB)");

      res.json({ messages: formattedMessages });
    }
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

    let user;
    let newMessage;
    let formattedMessage;

    // Check if we're using server-side storage or MongoDB
    if (global.usingServerStorage()) {
      // Using server-side storage
      user = global.serverStorage.findUserById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create new message
      newMessage = {
        userId: { _id: user._id, email: user.email, name: user.name },
        message: message.trim(),
        timestamp: new Date(),
      };

      // Add to server-side storage
      newMessage = global.serverStorage.addMessage(newMessage);

      // Format message for the response
      formattedMessage = {
        id: newMessage._id,
        userId: newMessage.userId._id,
        userName: newMessage.userId.email,
        message: newMessage.message,
        timestamp: newMessage.timestamp,
      };

      console.log(
        "New message added (server storage):",
        formattedMessage.message
      );
    } else {
      // Using MongoDB
      user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create new message with Mongoose model
      newMessage = new Message({
        userId: user._id,
        message: message.trim(),
        timestamp: new Date(),
      });

      // Save to MongoDB
      await newMessage.save();

      // Format message for the response
      formattedMessage = {
        id: newMessage._id,
        userId: user._id,
        userName: user.email,
        message: newMessage.message,
        timestamp: newMessage.timestamp,
      };

      console.log("New message added (MongoDB):", formattedMessage.message);
    }

    res.status(201).json({ message: formattedMessage });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
