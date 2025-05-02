const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
// const User = require('../models/User');

// Mock users for testing without MongoDB
const mockUsers = [
  {
    _id: "1",
    email: "test@example.com",
    password: "password123",
    name: "Test User",
  },
];

// Simple password check function
const comparePassword = (inputPassword, userPassword) => {
  return inputPassword === userPassword;
};

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email already exists
    const existingUser = mockUsers.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create new user
    const newUser = {
      _id: (mockUsers.length + 1).toString(),
      email,
      password,
      name: email.split("@")[0],
    };

    // Add to mock users
    mockUsers.push(newUser);

    console.log("New user registered:", newUser.email);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = mockUsers.find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    console.log("User logged in:", user.email);

    // Return user info and token
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
