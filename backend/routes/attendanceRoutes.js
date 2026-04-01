const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const attendanceController = require('../controllers/attendanceController');
const { isAdmin } = require('../middleware/roleMiddleware');

// EMPLOYEE
router.post('/checkin', protect, attendanceController.checkIn);
router.put('/checkout', protect, attendanceController.checkOut);
router.get('/today', protect, attendanceController.getTodayStatus);
router.get('/my', protect, attendanceController.getMyAttendance);

// MANAGER / ADMIN
router.get(
  '/team',
  protect,
  authorize('manager', 'admin'),
  attendanceController.getTeamAttendance
);

router.get(
  "/team/month",
  protect,
  authorize("manager", "admin"),
  attendanceController.getMonthlyTeamAttendance
);

// ADMIN
router.get('/report', protect, isAdmin, attendanceController.getAttendanceReport);
router.post('/manual', protect, isAdmin, attendanceController.manualAttendance);
router.get('/today-summary', protect, isAdmin, attendanceController.getTodayAttendanceSummary);

module.exports = router;