const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fromDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          // Today at midnight
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return value >= today;
        },
        message: "From date cannot be in the past"
      }
    },

    toDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          return value >= this.fromDate;
        },
        message: "To date must be after from date"
      }
    },

    reason: {
      type: String,
      required: true,
    },

    leaveType: {
      type: String,
      enum: ["casual", "sick", "emergency", "other"],
      required: true,
       lowercase: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvalRisk: {
      type: String,
      enum: ["Low", "Medium", "High"],
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);