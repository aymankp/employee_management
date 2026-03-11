const PerformanceReview = require('../models/PerformanceReview');
const User = require('../models/User');

// @desc    Create new review cycle (Manager/Admin)
// @route   POST /api/performance/cycle
// @access  Manager/Admin
const createReviewCycle = async (req, res) => {
  try {
    const { employeeId, reviewType, reviewCycle, year, quarter, startDate, endDate } = req.body;

    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if review already exists for this period
    const existingReview = await PerformanceReview.findOne({
      employee: employeeId,
      'period.year': year,
      ...(quarter && { 'period.quarter': quarter }),
      reviewType
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this period'
      });
    }

    // Create review
    const review = await PerformanceReview.create({
      employee: employeeId,
      reviewer: req.user._id,
      reviewType,
      reviewCycle,
      period: {
        year,
        quarter,
        startDate,
        endDate
      },
      goals: [],
      status: 'draft',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Review cycle created successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add goals to review
// @route   POST /api/performance/:reviewId/goals
// @access  Manager/Admin
const addGoals = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { goals } = req.body;

    const review = await PerformanceReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Add goals
    review.goals.push(...goals);
    await review.save();

    res.json({
      success: true,
      message: 'Goals added successfully',
      goals: review.goals
    });
  } catch (error) {
    console.error('Add goals error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit self assessment (Employee)
// @route   PUT /api/performance/:reviewId/self-assessment
// @access  Employee
const submitSelfAssessment = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { goals, employeeComments } = req.body;

    const review = await PerformanceReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if employee owns this review
    if (review.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Update goals with employee comments
    if (goals && goals.length) {
      goals.forEach((updatedGoal, index) => {
        if (review.goals[index]) {
          review.goals[index].employeeComments = updatedGoal.employeeComments;
          review.goals[index].status = updatedGoal.status || review.goals[index].status;
        }
      });
    }

    review.employeeComments = employeeComments;
    review.status = 'submitted';
    review.submittedAt = new Date();

    await review.save();

    res.json({
      success: true,
      message: 'Self assessment submitted',
      review
    });
  } catch (error) {
    console.error('Self assessment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit manager review
// @route   PUT /api/performance/:reviewId/manager-review
// @access  Manager/Admin
const submitManagerReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { ratings, strengths, improvements, reviewerComments, goals } = req.body;

    const review = await PerformanceReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update ratings
    if (ratings) {
      review.ratings = { ...review.ratings, ...ratings };
      
      // Calculate overall average
      const ratingValues = Object.values(review.ratings).filter(r => typeof r === 'number');
      if (ratingValues.length > 0) {
        review.ratings.overall = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
      }
    }

    // Update goals with manager ratings
    if (goals && goals.length) {
      goals.forEach((updatedGoal, index) => {
        if (review.goals[index]) {
          review.goals[index].rating = updatedGoal.rating;
          review.goals[index].managerComments = updatedGoal.managerComments;
        }
      });
    }

    review.strengths = strengths;
    review.improvements = improvements;
    review.reviewerComments = reviewerComments;
    review.status = 'reviewed';
    review.reviewedAt = new Date();

    await review.save();

    res.json({
      success: true,
      message: 'Manager review submitted',
      review
    });
  } catch (error) {
    console.error('Manager review error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Acknowledge review (Employee)
// @route   PUT /api/performance/:reviewId/acknowledge
// @access  Employee
const acknowledgeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { employeeComments } = req.body;

    const review = await PerformanceReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if employee owns this review
    if (review.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    review.employeeComments = employeeComments;
    review.status = 'acknowledged';
    review.acknowledgedAt = new Date();

    await review.save();

    res.json({
      success: true,
      message: 'Review acknowledged',
      review
    });
  } catch (error) {
    console.error('Acknowledge error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my reviews (Employee)
// @route   GET /api/performance/my
// @access  Private
const getMyReviews = async (req, res) => {
  try {
    const { year, status } = req.query;

    const filter = { employee: req.user._id };
    if (year) filter['period.year'] = parseInt(year);
    if (status) filter.status = status;

    const reviews = await PerformanceReview.find(filter)
      .populate('reviewer', 'name email')
      .sort({ 'period.year': -1, 'period.quarter': -1 });

    res.json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get team reviews (Manager)
// @route   GET /api/performance/team
// @access  Manager/Admin
const getTeamReviews = async (req, res) => {
  try {
    const { year, quarter, status } = req.query;

    let employeeFilter = {};
    
    // If manager, only show their team
    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ 
        team: req.user.team,
        role: 'employee'
      }).select('_id');
      employeeFilter = { employee: { $in: teamMembers.map(m => m._id) } };
    }

    const filter = {
      ...employeeFilter,
      ...(year && { 'period.year': parseInt(year) }),
      ...(quarter && { 'period.quarter': parseInt(quarter) }),
      ...(status && { status })
    };

    const reviews = await PerformanceReview.find(filter)
      .populate('employee', 'name email employeeId team')
      .populate('reviewer', 'name email')
      .sort({ 'period.year': -1, 'period.quarter': -1 });

    res.json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    console.error('Get team reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get review by ID
// @route   GET /api/performance/:id
// @access  Private (owner or manager)
const getReviewById = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id)
      .populate('employee', 'name email employeeId team')
      .populate('reviewer', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check authorization
    const isEmployee = review.employee._id.toString() === req.user._id.toString();
    const isReviewer = review.reviewer._id.toString() === req.user._id.toString();
    const isManager = req.user.role === 'manager' && review.employee.team === req.user.team;
    const isAdmin = req.user.role === 'admin';

    if (!isEmployee && !isReviewer && !isManager && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this review'
      });
    }

    res.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createReviewCycle,
  addGoals,
  submitSelfAssessment,
  submitManagerReview,
  acknowledgeReview,
  getMyReviews,
  getTeamReviews,
  getReviewById
};