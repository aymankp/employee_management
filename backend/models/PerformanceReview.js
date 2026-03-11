const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['technical', 'behavioral', 'leadership', 'communication', 'other'],
    default: 'technical'
  },
  targetDate: Date,
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  managerComments: String,
  employeeComments: String
});

const reviewSchema = new mongoose.Schema({
  // Review Details
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewType: {
    type: String,
    enum: ['self', 'manager', 'peer', '360'],
    required: true
  },
  
  // Review Period
  reviewCycle: {
    type: String,
    enum: ['quarterly', 'half-yearly', 'annual'],
    required: true
  },
  period: {
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 }, // For quarterly
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  
  // Goals
  goals: [goalSchema],
  
  // Ratings & Feedback
  ratings: {
    overall: { type: Number, min: 1, max: 5 },
    technical: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    teamwork: { type: Number, min: 1, max: 5 },
    leadership: { type: Number, min: 1, max: 5 },
    productivity: { type: Number, min: 1, max: 5 }
  },
  
  // Comments
  strengths: String,
  improvements: String,
  reviewerComments: String,
  employeeComments: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'acknowledged', 'completed'],
    default: 'draft'
  },
  
  // Dates
  submittedAt: Date,
  reviewedAt: Date,
  acknowledgedAt: Date,
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure unique review per employee per period
reviewSchema.index({ employee: 1, 'period.year': 1, 'period.quarter': 1, reviewType: 1 }, { 
  unique: true,
  partialFilterExpression: { 'period.quarter': { $exists: true } }
});

reviewSchema.index({ employee: 1, 'period.year': 1, reviewType: 1 });

module.exports = mongoose.model('PerformanceReview', reviewSchema);