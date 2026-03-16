const express = require("express");
const router = express.Router();

const { registerUser, loginUser, getMe, changePassword } = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

// ADMIN registers users
router.post("/register", protect, isAdmin, registerUser);

// LOGIN
router.post("/login", loginUser);

// CURRENT USER
router.get("/me", protect, getMe);

// CHANGE PASSWORD
router.put("/change-password", protect, changePassword);

module.exports = router;