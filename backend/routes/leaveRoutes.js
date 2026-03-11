const express = require("express");
const router = express.Router();

const {
  applyLeave,
  getMyLeaves,
  updateLeaveStatus,
  getPendingLeaves,
  getLeaveRecommendation,
} = require("../controllers/leaveController");

const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");

// ================= EMPLOYEE =================

router.post("/apply", verifyToken, applyLeave);

router.get("/my", verifyToken, getMyLeaves);

// ================= MANAGER / ADMIN =================

router.put(
  "/:id/status",
  verifyToken,
  checkRole("manager", "admin"),
  updateLeaveStatus
);

router.get(
  "/pending",
  verifyToken,
  checkRole("manager", "admin"),
  getPendingLeaves
);

// AI Recommendation
router.post(
  "/:id/analyze",
  verifyToken,
  checkRole("manager", "admin"),
  getLeaveRecommendation
);

module.exports = router;
