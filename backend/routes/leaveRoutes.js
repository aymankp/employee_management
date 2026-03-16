const express = require("express");
const router = express.Router();

const {
  applyLeave,
  getMyLeaves,
  updateLeaveStatus,
  getPendingLeaves,
  getLeaveRecommendation,
  getTeamPendingLeaves,  // Make sure this is exported from controller
  getLeaveAnalysis,      // Make sure this is exported from controller
  bulkUpdateLeaveStatus  // Make sure this is exported from controller
} = require("../controllers/leaveController");

const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");

// ================= EMPLOYEE ROUTES =================
router.post("/apply", verifyToken, applyLeave);
router.get("/my", verifyToken, getMyLeaves);

// ================= MANAGER/ADMIN ROUTES =================

// FIXED: Get team-specific pending leaves (matches frontend)
router.get(
  "/team/pending",
  verifyToken,
  checkRole("manager", "admin"),
  getTeamPendingLeaves
);

// FIXED: Update leave status (matches frontend pattern)
router.put(
  "/:leaveId/status",  // Changed from :id to :leaveId to match frontend
  verifyToken,
  checkRole("manager", "admin"),
  updateLeaveStatus
);

// FIXED: Get AI analysis (GET instead of POST, matches frontend)
router.get(
  "/:leaveId/analyze",  // Changed from POST to GET, and :id to :leaveId
  verifyToken,
  checkRole("manager", "admin"),
  getLeaveAnalysis
);

// NEW: Bulk status update (matches frontend)
router.post(
  "/bulk-status",
  verifyToken,
  checkRole("manager", "admin"),
  bulkUpdateLeaveStatus
);

// ================= KEEP EXISTING ROUTES FOR BACKWARD COMPATIBILITY =================

// Keep this for general pending leaves (maybe used elsewhere)
router.get(
  "/pending",
  verifyToken,
  checkRole("manager", "admin"),
  getPendingLeaves
);

// Keep this for backward compatibility
router.post(
  "/:id/analyze",
  verifyToken,
  checkRole("manager", "admin"),
  getLeaveRecommendation
);

// Keep this for backward compatibility
router.put(
  "/:id/status",
  verifyToken,
  checkRole("manager", "admin"),
  updateLeaveStatus
);

module.exports = router;