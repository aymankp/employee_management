const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  documentType: {
    type: String,
    enum: [
      'aadhar', 'pan', 'passport', 'voter-id', 'driving-license',
      '10th-marksheet', '12th-marksheet', 'graduation-degree', 'post-graduation-degree',
      'experience-letter', 'offer-letter', 'salary-slip', 'relieving-letter',
      'resume', 'photograph', 'bank-statement', 'form-16', 'medical-certificate',
      'other'
    ],
    required: true
  },
  
  category: {
    type: String,
    enum: ['personal', 'education', 'work', 'id-proof', 'medical', 'bank', 'tax', 'other'],
    required: true
  },
  
  description: String,
  
  deadline: Date,
  
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  submittedDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  
  submittedAt: Date,
  
  notes: String,
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);