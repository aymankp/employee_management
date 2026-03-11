const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true
  },
  
  description: String,
  
  head: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  location: String,
  
  budget: {
    type: Number,
    default: 0
  },
  
  employeeCount: {
    type: Number,
    default: 0
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Update employee count
departmentSchema.methods.updateEmployeeCount = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({ 
    'employmentDetails.department': this._id,
    isActive: true 
  });
  this.employeeCount = count;
  await this.save();
  return count;
};

module.exports = mongoose.model('Department', departmentSchema);