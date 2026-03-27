const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { checkDepartmentAccess } = require('../middleware/departmentMiddleware');

const departmentController = require('../controllers/departmentController');

// CREATE (Admin only)
router.post('/', protect, isAdmin, departmentController.createDepartment);

// GET ALL (Admin + Manager)
router.get('/', protect, checkDepartmentAccess, departmentController.getAllDepartments);

// STATS (Admin only)
router.get('/stats/overview', protect, isAdmin, departmentController.getDepartmentStats);

// GET ONE
router.get('/:id', protect, checkDepartmentAccess, departmentController.getDepartmentById);

// UPDATE
router.put('/:id', protect, checkDepartmentAccess, departmentController.updateDepartment);

// DELETE (Admin only)
router.delete('/:id', protect, isAdmin, departmentController.deleteDepartment);

module.exports = router;