const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isManager, isAdmin } = require('../middleware/roleMiddleware');
const performanceController = require('../controllers/performanceController');

// ========== EMPLOYEE ROUTES ==========
router.get('/my', protect, performanceController.getMyReviews);
router.put('/:reviewId/self-assessment', protect, performanceController.submitSelfAssessment);
router.put('/:reviewId/acknowledge', protect, performanceController.acknowledgeReview);

// ========== MANAGER/ADMIN ROUTES ==========
router.get('/team', protect, isManager, performanceController.getTeamReviews);
router.post('/cycle', protect, isManager, performanceController.createReviewCycle);
router.post('/:reviewId/goals', protect, isManager, performanceController.addGoals);
router.put('/:reviewId/manager-review', protect, isManager, performanceController.submitManagerReview);

// ========== COMMON ROUTES ==========
router.get('/:id', protect, performanceController.getReviewById);

module.exports = router;