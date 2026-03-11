const Document = require('../models/Document');
const DocumentRequest = require('../models/DocumentRequest');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    const { 
      category, 
      documentType, 
      title, 
      description, 
      documentNumber, 
      issuedBy, 
      issuedDate, 
      expiryDate,
      isConfidential 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Create document URL (adjust based on your file storage)
    const fileUrl = `/uploads/${req.file.filename}`;

    const document = await Document.create({
      employee: req.user._id,
      category,
      documentType,
      title,
      description,
      fileName: req.file.originalname,
      fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      documentNumber,
      issuedBy,
      issuedDate,
      expiryDate,
      isConfidential: isConfidential === 'true',
      uploadedBy: req.user._id,
      version: 1
    });

    // If this was requested, update request status
    if (req.body.requestId) {
      await DocumentRequest.findByIdAndUpdate(req.body.requestId, {
        status: 'submitted',
        submittedDocument: document._id,
        submittedAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my documents
// @route   GET /api/documents/my
// @access  Private
const getMyDocuments = async (req, res) => {
  try {
    const { category, documentType, verificationStatus } = req.query;

    const filter = { 
      employee: req.user._id,
      isActive: true 
    };
    
    if (category) filter.category = category;
    if (documentType) filter.documentType = documentType;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 });

    // Group by category
    const grouped = documents.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    }, {});

    res.json({
      success: true,
      total: documents.length,
      grouped,
      documents
    });
  } catch (error) {
    console.error('Get my documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get employee documents (Admin/Manager)
// @route   GET /api/documents/employee/:employeeId
// @access  Admin/Manager
const getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { category, verificationStatus } = req.query;

    // Check if manager can view this employee
    if (req.user.role === 'manager') {
      const employee = await User.findById(employeeId);
      if (!employee || employee.team !== req.user.team) {
        return res.status(403).json({
          success: false,
          message: 'You can only view documents of your team members'
        });
      }
    }

    const filter = { 
      employee: employeeId,
      isActive: true 
    };
    
    if (category) filter.category = category;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    // Get employee info
    const employee = await User.findById(employeeId)
      .select('name email employeeId team');

    res.json({
      success: true,
      employee,
      total: documents.length,
      documents
    });
  } catch (error) {
    console.error('Get employee documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify document (Admin only)
// @route   PUT /api/documents/:id/verify
// @access  Admin
const verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be verified or rejected'
      });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.verificationStatus = status;
    document.verifiedBy = req.user._id;
    document.verifiedAt = new Date();
    
    if (status === 'rejected') {
      document.rejectionReason = notes || 'Document rejected';
    } else {
      document.verificationNotes = notes;
    }

    await document.save();

    res.json({
      success: true,
      message: `Document ${status} successfully`,
      document
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Request document from employee (Admin/Manager)
// @route   POST /api/documents/request
// @access  Admin/Manager
const requestDocument = async (req, res) => {
  try {
    const { employeeId, documentType, category, description, deadline } = req.body;

    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if manager can request to this employee
    if (req.user.role === 'manager' && employee.team !== req.user.team) {
      return res.status(403).json({
        success: false,
        message: 'You can only request documents from your team members'
      });
    }

    const request = await DocumentRequest.create({
      employee: employeeId,
      requestedBy: req.user._id,
      documentType,
      category,
      description,
      deadline,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Document request sent',
      request
    });
  } catch (error) {
    console.error('Request document error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get document requests (Employee sees their requests)
// @route   GET /api/documents/requests
// @access  Private
const getDocumentRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { 
      employee: req.user._id,
      isActive: true 
    };
    
    if (status) filter.status = status;

    const requests = await DocumentRequest.find(filter)
      .populate('requestedBy', 'name email')
      .populate('submittedDocument')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update document (new version)
// @route   PUT /api/documents/:id
// @access  Private (Owner only)
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user owns this document
    if (document.employee.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Save current version to history
    document.previousVersions.push({
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      uploadedAt: document.updatedAt,
      uploadedBy: document.uploadedBy,
      version: document.version
    });

    // Update with new file
    document.fileName = req.file.originalname;
    document.fileUrl = `/uploads/${req.file.filename}`;
    document.fileSize = req.file.size;
    document.mimeType = req.file.mimetype;
    document.version += 1;
    document.verificationStatus = 'pending'; // Reset verification
    document.uploadedBy = req.user._id;

    await document.save();

    res.json({
      success: true,
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete document (soft delete)
// @route   DELETE /api/documents/:id
// @access  Private (Owner or Admin)
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check authorization
    const isOwner = document.employee.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this document'
      });
    }

    document.isActive = false;
    await document.save();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get expiring documents (Admin/Manager)
// @route   GET /api/documents/expiring
// @access  Admin/Manager
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + parseInt(days));

    let filter = {
      expiryDate: { 
        $exists: true, 
        $ne: null,
        $lte: expiryThreshold,
        $gte: new Date()
      },
      isActive: true
    };

    // If manager, only show their team
    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ team: req.user.team }).select('_id');
      filter.employee = { $in: teamMembers.map(m => m._id) };
    }

    const documents = await Document.find(filter)
      .populate('employee', 'name email employeeId team')
      .sort({ expiryDate: 1 });

    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('Get expiring documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  getEmployeeDocuments,
  verifyDocument,
  requestDocument,
  getDocumentRequests,
  updateDocument,
  deleteDocument,
  getExpiringDocuments
};