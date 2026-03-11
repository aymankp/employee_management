const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin, isManager } = require('../middleware/roleMiddleware');
const documentController = require('../controllers/documentController');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image, pdf, doc, and excel files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// ========== EMPLOYEE ROUTES ==========
router.post('/upload', 
  protect, 
  upload.single('document'), 
  documentController.uploadDocument
);

router.get('/my', 
  protect, 
  documentController.getMyDocuments
);

router.get('/requests', 
  protect, 
  documentController.getDocumentRequests
);

router.put('/:id', 
  protect, 
  upload.single('document'), 
  documentController.updateDocument
);

router.delete('/:id', 
  protect, 
  documentController.deleteDocument
);

// ========== MANAGER/ADMIN ROUTES ==========
router.get('/employee/:employeeId', 
  protect, 
  isManager, 
  documentController.getEmployeeDocuments
);

router.post('/request', 
  protect, 
  isManager, 
  documentController.requestDocument
);

router.get('/expiring/all', 
  protect, 
  isManager, 
  documentController.getExpiringDocuments
);

// ========== ADMIN ONLY ROUTES ==========
router.put('/:id/verify', 
  protect, 
  isAdmin, 
  documentController.verifyDocument
);

module.exports = router;