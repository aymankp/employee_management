const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const attendanceController = require('../controllers/attendanceController');
const { isManagerOrAdmin, isAdmin } = require('../middleware/roleMiddleware');
// EMPLOYEE
router.post('/checkin', protect, attendanceController.checkIn);
router.put('/checkout', protect, attendanceController.checkOut);
router.get('/today', protect, attendanceController.getTodayStatus);
router.get('/my', protect, attendanceController.getMyAttendance);

// MANAGER / ADMIN
router.get('/team', protect, (req, res, next) => {
    if (req.user.role === 'manager' || req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: "Access denied" });
}, attendanceController.getTeamAttendance);

// ADMIN
router.get('/report', protect, isAdmin, attendanceController.getAttendanceReport);
router.post('/manual', protect, isAdmin, attendanceController.manualAttendance);
router.get('/today-summary', protect, isAdmin, attendanceController.getTodayAttendanceSummary);

module.exports = router;