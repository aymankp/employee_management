
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const { getUserById } = require("../controllers/employeeController");
const {
  addEmployee,
  getAllUsers,
  updateUserRole,
  getAllLeaves,
  assignManager,
  updateUserStatus,
  updateUser,
  deleteUser
} = require("../controllers/adminController");

// 🔥 THIS ROUTE
router.post("/add-employee", protect, isAdmin, addEmployee);

// existing routes
router.get("/users", protect, isAdmin, getAllUsers);
router.get("/user/:id", protect, isAdmin, getUserById);
router.put("/user/:id/role", protect, isAdmin, updateUserRole);

// routes/adminRoutes.js
router.put("/assign-manager", protect, isAdmin, assignManager);

router.get("/leaves", protect, isAdmin, getAllLeaves);

router.get("/test", (req, res) => {
  res.send("ADMIN ROUTE OK");
});

router.put("/user/:id/status", protect, isAdmin, updateUserStatus);
router.put("/user/:id", protect, isAdmin, updateUser);



router.delete("/user/:id", protect, isAdmin, deleteUser);

module.exports = router;
