const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAdmin, isManager } = require('../middleware/roleMiddleware');
const dashboardController = require('../controllers/dashboardController');

// Employee Dashboard
router.get('/employee', protect, dashboardController.getEmployeeDashboard);

// Manager Dashboard
router.get('/manager', protect, isManager, dashboardController.getManagerDashboard);

// Admin Dashboard
router.get('/admin', protect, isAdmin, dashboardController.getAdminDashboard);

module.exports = router;