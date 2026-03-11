const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isManager, isAdmin } = require('../middleware/roleMiddleware');
const employeeController = require('../controllers/employeeController');

// ========== EMPLOYEE SELF ROUTES ==========
// Any logged in user can access these
router.get('/me', protect, employeeController.getMyProfile);
router.put('/me', protect, employeeController.updateMyProfile);

// ========== MANAGER/ADMIN ROUTES ==========
// Employee directory (managers can see their team, admins can see all)
router.get('/', protect, isManager, employeeController.getEmployeeDirectory);
router.get('/stats/summary', protect, isManager, employeeController.getEmployeeStats);
router.get('/:id', protect, isManager, employeeController.getEmployeeById);

// ========== ADMIN ONLY ROUTES ==========
// Only admin can update employee roles, department, etc.
router.put('/:id', protect, isAdmin, employeeController.updateEmployee);

module.exports = router;