const express = require("express");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");
const { isManager, isAdmin } = require("../middleware/roleMiddleware");
const employeeController = require("../controllers/employeeController");
const User = require("../models/User");

const router = express.Router();

// ========== SELF ROUTES (no params) ==========
router.get("/me", protect, employeeController.getMyProfile);
router.put("/me", protect, employeeController.updateMyProfile);

// ========== AVATAR ROUTE ==========
router.put("/me/avatar", protect, upload.single("avatar"), async (req, res) => {
  console.log("Avatar route hit");

  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: "No file uploaded" 
    });
  }

  const avatarPath = `/uploads/${req.file.filename}`;

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarPath },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar: user.avatar,
      profile: user
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to upload avatar" 
    });
  }
});

// ========== MANAGER/ADMIN ROUTES ==========
router.get("/", protect, isManager, employeeController.getEmployeeDirectory);
router.get("/stats/summary", protect, isManager, employeeController.getEmployeeStats);

// ========== PARAM ROUTES (must come last) ==========
router.get("/:id", protect, isManager, employeeController.getEmployeeById);
router.put("/:id", protect, isAdmin, employeeController.updateEmployee);

module.exports = router;