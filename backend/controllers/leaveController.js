const { classifyLeave, getApprovalRisk } = require("../services/aiService");
const Leave = require("../models/Leave");
const User = require("../models/User");

// ========== EXISTING FUNCTIONS (Keep these) ==========
const applyLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason, leaveType } = req.body;

    let finalType = leaveType;

    if (!finalType) {
      const detectedType = await classifyLeave(reason);
      const allowed = ["sick", "casual", "emergency", "other"];

      finalType = allowed.includes(detectedType?.toLowerCase())
        ? detectedType.toLowerCase()
        : "other";
    }
    const leave = await Leave.create({
      employee: req.user._id,
      fromDate,
      toDate,
      reason,
      leaveType: finalType,
      status: "pending",
    });

    res.status(201).json({
      message: "Leave applied successfully",
      leave,
    });
  } catch (error) {
    console.error("APPLY LEAVE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({
      employee: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========== FIXED: Match frontend URL pattern ==========
const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { leaveId } = req.params;  // Changed from 'id' to 'leaveId'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const leave = await Leave.findById(leaveId).populate("employee");
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status === "approved") {
      return res.status(400).json({ message: "Leave already approved" });
    }

    // Check if current user is authorized (manager of this employee)
    const employee = leave.employee;
    if (req.user.role === 'manager' && 
        employee.employmentDetails?.reportingTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Not authorized to manage this employee's leaves" 
      });
    }

    if (status === "approved") {
      // Check team overlap
      const team = employee.team;
      const overlappingLeaves = await Leave.find({
        _id: { $ne: leave._id },
        status: "approved",
        fromDate: { $lte: leave.toDate },
        toDate: { $gte: leave.fromDate }
      }).populate({
        path: 'employee',
        match: { team: team }
      });

      const teamOverlapCount = overlappingLeaves.filter(l => l.employee !== null).length;
      const MAX_TEAM_LEAVE = 2;

      if (teamOverlapCount >= MAX_TEAM_LEAVE) {
        return res.status(400).json({
          message: "Too many team members already on leave during these dates",
        });
      }

      // Check leave balance
      const days = Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
      const type = leave.leaveType.toLowerCase();
      const balanceData = employee.leaveBalance?.[type];

      if (!balanceData) {
        return res.status(400).json({ message: "Invalid leave type" });
      }

      const remaining = balanceData.total - balanceData.used;
      if (remaining < days) {
        return res.status(400).json({ message: "Insufficient leave balance" });
      }

      // Deduct balance
      balanceData.used += days;
      await employee.save();

      leave.approvedBy = req.user._id;
    }

    leave.status = status;
    await leave.save();

    res.status(200).json({
      message: `Leave ${status} successfully`,
      leave,
    });
  } catch (error) {
    console.error("UPDATE LEAVE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========== NEW: Get team pending leaves ==========
const getTeamPendingLeaves = async (req, res) => {
  try {
    const manager = await User.findById(req.user._id);
    
    // Find all employees reporting to this manager
    const teamMembers = await User.find({ 
      'employmentDetails.reportingTo': req.user._id,
      role: 'employee'
    }).select('_id');

    const teamMemberIds = teamMembers.map(m => m._id);

    // Get pending leaves for team members
    const leaves = await Leave.find({
      employee: { $in: teamMemberIds },
      status: 'pending'
    })
    .populate('employee', 'name email avatar team employmentDetails')
    .sort('-createdAt');

    // Format response to match frontend expectations
    const formattedLeaves = leaves.map(leave => ({
      _id: leave._id,
      employee: {
        _id: leave.employee._id,
        name: leave.employee.name,
        email: leave.employee.email,
        avatar: leave.employee.avatar
      },
      leaveType: leave.leaveType,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      reason: leave.reason,
      status: leave.status,
      appliedAt: leave.appliedAt,
      totalDays: leave.totalDays
    }));

    res.json(formattedLeaves);
  } catch (error) {
    console.error("Get team pending leaves error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========== FIXED: Match frontend URL pattern for analysis ==========
const getLeaveAnalysis = async (req, res) => {
  try {
    const { leaveId } = req.params;  // Changed from 'id' to 'leaveId'

    const leave = await Leave.findById(leaveId).populate("employee");
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    const days = Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1;

    // Past 6 months leave count
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const pastLeaves = await Leave.countDocuments({
      employee: leave.employee._id,
      createdAt: { $gte: sixMonthsAgo },
    });

    // Team overlap
    const teamOverlap = await Leave.countDocuments({
      _id: { $ne: leave._id },
      status: "approved",
      fromDate: { $lte: leave.toDate },
      toDate: { $gte: leave.fromDate },
    }).populate({
      path: 'employee',
      match: { team: leave.employee.team }
    });

    const type = leave.leaveType.toLowerCase();
    const balanceData = leave.employee.leaveBalance?.[type] || { total: 0, used: 0 };
    const balance = balanceData.total - balanceData.used;

    const risk = await getApprovalRisk({
      leaveCount: pastLeaves,
      days,
      teamLoad: teamOverlap.filter(l => l.employee).length,
      balance,
    });

    // Store risk in leave (optional)
    await Leave.findByIdAndUpdate(leaveId, {
      approvalRisk: risk,
    });

    res.json({ 
      risk: risk || 'Medium',  // Default if not set
      reasons: generateRiskReasons(risk, { pastLeaves, teamOverlap, balance, days })
    });
  } catch (error) {
    console.error("AI RISK ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function for risk reasons
const generateRiskReasons = (risk, data) => {
  const reasons = [];
  if (data.pastLeaves > 3) reasons.push('Frequent leaves in last 6 months');
  if (data.teamOverlap > 1) reasons.push('Multiple team members on leave');
  if (data.balance < data.days) reasons.push('Low leave balance');
  return reasons;
};

// ========== NEW: Bulk status update ==========
const bulkUpdateLeaveStatus = async (req, res) => {
  try {
    const { leaveIds, status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const manager = await User.findById(req.user._id);
    
    // Get all employees under this manager
    const teamMembers = await User.find({ 
      'employmentDetails.reportingTo': req.user._id 
    }).select('_id');

    const teamMemberIds = teamMembers.map(m => m._id);

    // Verify all leaves belong to manager's team
    const leaves = await Leave.find({
      _id: { $in: leaveIds },
      employee: { $in: teamMemberIds }
    }).populate('employee');

    if (leaves.length !== leaveIds.length) {
      return res.status(403).json({ 
        message: 'Some leaves are not from your team members' 
      });
    }

    // Update all leaves
    const updateResult = await Leave.updateMany(
      { _id: { $in: leaveIds } },
      { 
        $set: { 
          status,
          approvedBy: req.user._id,
          approvedAt: Date.now()
        } 
      }
    );

    // Update leave balances for approved leaves
    if (status === 'approved') {
      for (const leave of leaves) {
        const days = Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
        const type = leave.leaveType.toLowerCase();
        if (leave.employee.leaveBalance?.[type]) {
          leave.employee.leaveBalance[type].used += days;
          await leave.employee.save();
        }
      }
    }

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} leaves ${status} successfully`
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Keep existing functions
const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: "pending" })
      .populate("employee", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error) {
    console.error("PENDING LEAVES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Alias for backward compatibility
const getLeaveRecommendation = getLeaveAnalysis;

module.exports = {
  applyLeave,
  getMyLeaves,
  updateLeaveStatus,
  getPendingLeaves,
  getLeaveRecommendation,
  getTeamPendingLeaves,
  getLeaveAnalysis,
  bulkUpdateLeaveStatus
};