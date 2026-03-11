const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const departmentController = require('../controllers/departmentController');

// All routes require authentication and admin access
router.use(protect);
router.use(isAdmin);

// Department routes
router.post('/', departmentController.createDepartment);
router.get('/', departmentController.getAllDepartments);
router.get('/stats/overview', departmentController.getDepartmentStats);
router.get('/:id', departmentController.getDepartmentById);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;