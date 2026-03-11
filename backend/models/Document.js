const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  category: {
    type: String,
    enum: {
      values: [
        'personal',      // Aadhar, PAN, Passport, Voter ID
        'education',     // Degrees, Certificates, Marksheets
        'work',          // Experience letters, Offer letters, Salary slips
        'id-proof',      // Driver license, ID card
        'medical',       // Health records, Insurance
        'bank',          // Bank statements, Cancel cheque
        'tax',           // Form 16, IT returns
        'other'
      ],
      message: '{VALUE} is not a valid category'
    },
    required: true
  },
  
  documentType: {
    type: String,
    required: true,
    enum: [
      'aadhar', 'pan', 'passport', 'voter-id', 'driving-license',
      '10th-marksheet', '12th-marksheet', 'graduation-degree', 'post-graduation-degree',
      'experience-letter', 'offer-letter', 'salary-slip', 'relieving-letter',
      'resume', 'photograph', 'bank-statement', 'form-16', 'medical-certificate',
      'other'
    ]
  },
  
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: String,
  
  // File details
  fileName: {
    type: String,
    required: true
  },
  
  fileUrl: {
    type: String,
    required: true
  },
  
  fileSize: Number, // in bytes
  mimeType: String,
  
  // Document metadata
  documentNumber: String, // e.g., Aadhar number, PAN number
  issuedBy: String,
  issuedDate: Date,
  expiryDate: Date,
  
  // Verification
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  verifiedAt: Date,
  
  verificationNotes: String,
  rejectionReason: String,
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  previousVersions: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: Number
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isConfidential: {
    type: Boolean,
    default: false
  },
  
  // Audit
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
documentSchema.index({ employee: 1, category: 1 });
documentSchema.index({ employee: 1, documentType: 1 });
documentSchema.index({ expiryDate: 1 }, { sparse: true });
documentSchema.index({ verificationStatus: 1 });
documentSchema.index({ 'employee': 1, 'verificationStatus': 1 });

// Virtual for checking if document is expired
documentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual for days until expiry
documentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const diff = this.expiryDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
documentSchema.pre('save', function(next) {
  // If document is expired, update status
  if (this.expiryDate && new Date() > this.expiryDate) {
    this.verificationStatus = 'expired';
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);