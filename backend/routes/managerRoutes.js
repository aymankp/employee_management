const express = require('express');
const multer = require('multer');
const path = require('path');

const {
  getManagerProfile,
  updateManagerProfile,
  uploadManagerAvatar,
  getTeamMembers,
  getTeamMemberDetails,
  getTeamStats
} = require('../controllers/managerController.js');

const attendanceController = require('../controllers/attendanceController');

const { protect, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Apply auth globally
router.use(protect);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'manager-avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// PROFILE
router.get('/me', authorize('manager', 'admin'), getManagerProfile);
router.put('/me', authorize('manager', 'admin'), updateManagerProfile);
router.put('/me/avatar', authorize('manager', 'admin'), upload.single('avatar'), uploadManagerAvatar);

// TEAM
router.get('/team', authorize('manager', 'admin'), getTeamMembers);
router.get('/team/stats', authorize('manager', 'admin'), getTeamStats);
router.get('/team/:employeeId', authorize('manager', 'admin'), getTeamMemberDetails);

// 🔥 ATTENDANCE (NEW)
router.get('/team/attendance', authorize('manager', 'admin'), attendanceController.getTeamAttendance);

module.exports = router;