const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isManager, isAdmin } = require('../middleware/roleMiddleware');
const reportController = require('../controllers/reportController');

// ========== EMPLOYEE REPORTS ==========
router.get('/employees/excel', protect, isManager, reportController.exportEmployeesExcel);
router.get('/employees/pdf', protect, isManager, reportController.exportEmployeesPDF);

// ========== LEAVE REPORTS ==========
router.get('/leaves/excel', protect, isManager, reportController.exportLeavesExcel);

// ========== ATTENDANCE REPORTS ==========
router.get('/attendance/excel', protect, isManager, reportController.exportAttendanceExcel);

// ========== DOCUMENT REPORTS ==========
router.get('/documents/excel', protect, isManager, reportController.exportDocumentsExcel);

// ========== PERFORMANCE REPORTS ==========
router.get('/performance/excel', protect, isManager, reportController.exportPerformanceExcel);

// ========== SUMMARY REPORT (Admin only) ==========
router.get('/summary/excel', protect, isAdmin, reportController.exportSummaryExcel);

module.exports = router;