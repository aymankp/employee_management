const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isManager, isAdmin } = require('../middleware/roleMiddleware');
const attendanceController = require('../controllers/attendanceController');

// ========== EMPLOYEE ROUTES ==========
router.post('/checkin', protect, attendanceController.checkIn);
router.put('/checkout', protect, attendanceController.checkOut);
router.get('/today', protect, attendanceController.getTodayStatus);
router.get('/my', protect, attendanceController.getMyAttendance);

// ========== MANAGER/ADMIN ROUTES ==========
router.get('/team', protect, isManager, attendanceController.getTeamAttendance);

// ========== ADMIN ONLY ROUTES ==========
router.get('/report', protect, isAdmin, attendanceController.getAttendanceReport);
router.post('/manual', protect, isAdmin, attendanceController.manualAttendance);

module.exports = router;