const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    let user;

    // Check if we're using server-side storage or MongoDB
    if (global.usingServerStorage()) {
      // Using server-side storage
      user = global.serverStorage.findUserById(req.user.id);
    } else {
      // Using MongoDB
      user = await User.findById(req.user.id).select("-password");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a copy without password if using server-side storage
    let userResponse;
    if (global.usingServerStorage()) {
      userResponse = { ...user };
      delete userResponse.password;
    } else {
      // MongoDB already excluded password
      userResponse = user;
    }

    console.log("Profile requested for user:", req.user.email);

    res.json({ user: userResponse });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name } = req.body;
    let updatedUser;

    // Check if we're using server-side storage or MongoDB
    if (global.usingServerStorage()) {
      // Using server-side storage
      updatedUser = global.serverStorage.updateUser(req.user.id, { name });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create a copy without password
      const userResponse = { ...updatedUser };
      delete userResponse.password;

      console.log(
        "Profile updated for user (server storage):",
        updatedUser.email
      );

      res.json({ user: userResponse });
    } else {
      // Using MongoDB
      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { name },
        { new: true } // Return the updated document
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Profile updated for user (MongoDB):", req.user.email);

      res.json({ user: updatedUser });
    }
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
