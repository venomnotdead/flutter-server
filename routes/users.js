const express = require("express");
const router = express.Router();
// const User = require('../models/User');
const auth = require("../middleware/auth");

// Mock users from auth.js
const mockUsers = [
  {
    _id: "1",
    email: "test@example.com",
    password: "password123",
    name: "Test User",
    messageCount: 5,
    friendCount: 2,
    achievementCount: 3,
    joinDate: new Date("2023-01-01"),
  },
];

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    // Find user by id
    const user = mockUsers.find((user) => user._id === req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a copy without password
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    console.log("Profile requested for user:", user.email);

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name } = req.body;

    // Find user index
    const userIndex = mockUsers.findIndex((user) => user._id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user
    mockUsers[userIndex].name = name;

    // Create a copy without password
    const userWithoutPassword = { ...mockUsers[userIndex] };
    delete userWithoutPassword.password;

    console.log("Profile updated for user:", mockUsers[userIndex].email);

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
