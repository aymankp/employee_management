const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    // Role & Team
    role: {
      type: String,
      enum: ["employee", "manager", "admin"],
      default: "employee",
    },
    team: {
      type: String,
      default: "general",
    },
    avatar: {
      type: String,
      default: ""
    },
    // Status
    isActive: { type: Boolean, default: true },
    // Status
    // Status
    lastLogin: { type: Date },     // NEW
    lastSeen: { type: Date },      //  REMOVE default (important)

    loginHistory: [
      {
        loginAt: { type: Date },
        ip: String,
        device: String,
        location: String
      }
    ],
    // Leave Balance
    leaveBalance: {
      casual: { total: { type: Number, default: 10 }, used: { type: Number, default: 0 } },
      sick: { total: { type: Number, default: 5 }, used: { type: Number, default: 0 } },
      emergency: { total: { type: Number, default: 3 }, used: { type: Number, default: 0 } },
      other: { total: { type: Number, default: 2 }, used: { type: Number, default: 0 } },
    },

    // Employee ID (auto-generated)
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Personal Information
    personalInfo: {
      phone: { type: String, match: /^[0-9]{10}$|^\+91[0-9]{10}$/ },
      alternatePhone: String,
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      bloodGroup: String,
      maritalStatus: { type: String, enum: ['single', 'married', 'divorced'] },
      nationality: { type: String, default: 'Indian' }
    },

    // Address
    address: {
      current: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
      },
      permanent: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
      }
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      address: String
    },

    // Employment Details
    employmentDetails: {
      department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
      designation: String,
      joiningDate: { type: Date, default: Date.now },
      confirmationDate: Date,
      exitDate: Date,
      employmentType: {
        type: String,
        enum: ['permanent', 'contract', 'probation', 'intern'],
        default: 'probation'
      },
      workLocation: String,
      reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // Bank Details
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branch: String,
      panNumber: String,
      uanNumber: String
    },

    // Documents
    documents: [{
      type: { type: String, enum: ['resume', 'id-proof', 'degree', 'certificate'] },
      fileName: String,
      fileUrl: String,
      uploadedAt: { type: Date, default: Date.now }
    }],

    // Work History
    workHistory: [{
      company: String,
      designation: String,
      fromDate: Date,
      toDate: Date,
      responsibilities: String
    }],

    // Education
    education: [{
      degree: String,
      institution: String,
      yearOfPassing: Number,
      percentage: Number,
      documents: [String]
    }],

    // Skills
    skills: [String],

    // User Settings
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
      },
      privacy: {
        showPhone: { type: Boolean, default: false },
        showEmail: { type: Boolean, default: true },
        showBirthday: { type: Boolean, default: false }
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name (if needed)
userSchema.virtual('fullName').get(function () {
  return this.name;
});

// Virtual for leave balance summary
userSchema.virtual('leaveSummary').get(function () {
  const summary = {};
  for (const [type, balance] of Object.entries(this.leaveBalance)) {
    summary[type] = {
      total: balance.total,
      used: balance.used,
      remaining: balance.total - balance.used
    };
  }
  return summary;
});

userSchema.pre("save", async function (next) {
  // Employee ID
  if (!this.employeeId) {
    this.employeeId = `EMP${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // Password hash
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});
// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  if (!this.password) throw new Error("Password not selected");
  return bcrypt.compare(password, this.password);
};

// Indexes for better performance

userSchema.index({ role: 1, team: 1 });
userSchema.index({ 'employmentDetails.department': 1 });

module.exports = mongoose.model("User", userSchema);