const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getManagerProfile,
  updateManagerProfile,
  uploadManagerAvatar,
  getTeamMembers,
  getTeamMemberDetails,
  getTeamStats,
  getTeamEmployees  
} = require('../controllers/managerController.js');

// Import both protect and authorize
const { protect, authorize } = require('../middleware/authMiddleware.js');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'manager-avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = express.Router();

// Apply protect middleware to all routes first
router.use(protect);

// Profile routes - only accessible by managers and admins
router.get('/me', authorize('manager', 'admin'), getManagerProfile);
router.put('/me', authorize('manager', 'admin'), updateManagerProfile);
router.put('/me/avatar', authorize('manager', 'admin'), upload.single('avatar'), uploadManagerAvatar);


// IMPORTANT: Team employees endpoint 
router.get('/employees/team', authorize('manager', 'admin'), getTeamEmployees);
router.get('/team/members', authorize('manager', 'admin'), getTeamEmployees); // Backup
router.get('/team/list', authorize('manager', 'admin'), getTeamEmployees);    // Backup

// Team routes - only accessible by managers and admins
router.get('/team', authorize('manager', 'admin'), getTeamMembers);
router.get('/team/stats', authorize('manager', 'admin'), getTeamStats);
router.get('/team/:employeeId', authorize('manager', 'admin'), getTeamMemberDetails);

module.exports = router;