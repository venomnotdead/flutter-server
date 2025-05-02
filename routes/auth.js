const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Simple password check function for server-side storage
const comparePassword = async (inputPassword, userPassword) => {
  // If the password is already hashed (from MongoDB), use bcrypt
  if (userPassword.startsWith("$2a$") || userPassword.startsWith("$2b$")) {
    return await bcrypt.compare(inputPassword, userPassword);
  }
  // For plain text passwords in server-side storage
  return inputPassword === userPassword;
};

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if we're using server-side storage or MongoDB
    if (global.usingServerStorage()) {
      // Using server-side storage

      // Check if email already exists
      const existingUser = global.serverStorage.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create new user
      const newUser = {
        email,
        password, // Store password as plain text in server-side storage
        name: email.split("@")[0],
      };

      // Add to server-side storage
      global.serverStorage.addUser(newUser);

      console.log("New user registered (server storage):", newUser.email);

      res.status(201).json({ message: "User registered successfully" });
    } else {
      // Using MongoDB

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create new user with Mongoose model (password will be hashed by pre-save hook)
      const newUser = new User({
        email,
        password,
        name: email.split("@")[0],
      });

      // Save to MongoDB
      await newUser.save();

      console.log("New user registered (MongoDB):", newUser.email);

      res.status(201).json({ message: "User registered successfully" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user;
    let isMatch = false;

    // Check if we're using server-side storage or MongoDB
    if (global.usingServerStorage()) {
      // Using server-side storage

      // Find user by email
      user = global.serverStorage.findUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      isMatch = await comparePassword(password, user.password);
    } else {
      // Using MongoDB

      // Find user by email
      user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password using the model's method
      isMatch = await user.comparePassword(password);
    }

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
        name: user.name || email.split("@")[0],
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
