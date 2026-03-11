const { classifyLeave, getApprovalRisk } = require("../services/aiService");
const Leave = require("../models/Leave");
const User = require("../models/User");

const applyLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 🧠 AI Leave Classification
    const detectedType = await classifyLeave(reason);

    const allowed = ["Sick", "Casual", "Emergency", "Other"];
    const leaveType = allowed.includes(detectedType)
      ? detectedType
      : "Other";

    const leave = await Leave.create({
      employee: req.user._id,
      fromDate,
      toDate,
      reason,
      leaveType,
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
    res.status(500).json({
      message: "Server error",
    });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const leave = await Leave.findById(id).populate("employee");
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status === "approved") {
      return res.status(400).json({ message: "Leave already approved" });
    }

    if (status === "approved") {
      // 🔥 FIX: Pehle employee ki team find karo
      const employee = leave.employee;
      const team = employee.team;

      // Same team ki overlapping leaves find karo
      const overlappingLeaves = await Leave.find({
        _id: { $ne: leave._id },
        status: "approved",
        fromDate: { $lte: leave.toDate },
        toDate: { $gte: leave.fromDate }
      }).populate({
        path: 'employee',
        match: { team: team }   // 👈 Sirf same team ke employees
      });

      // Sirf wahi leaves count karo jinka employee same team ka ho
      const teamOverlapCount = overlappingLeaves.filter(l => l.employee !== null).length;

      const MAX_TEAM_LEAVE = 2;

      if (teamOverlapCount >= MAX_TEAM_LEAVE) {
        return res.status(400).json({
          message: "Conflict: Too many team members already on leave during these dates",
        });
      }

      // Days calculate karo
      const days = Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1;

      const user = leave.employee;
      const type = leave.leaveType.toLowerCase();
      const balanceData = user.leaveBalance?.[type];

      if (!balanceData) {
        return res.status(400).json({ message: "Invalid leave type" });
      }

      const remaining = balanceData.total - balanceData.used;
      if (remaining < days) {
        return res.status(400).json({ message: "Insufficient leave balance" });
      }

      // Leave balance deduct karo
      balanceData.used += days;
      await user.save();

      // Leave ko approve karo
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

const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: "pending" })
      .populate("employee", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error) {
    console.error("PENDING LEAVES ERROR:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

//organised data for ai
const getLeaveRecommendation = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findById(id).populate("employee");
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    const days =
      (new Date(leave.toDate) - new Date(leave.fromDate)) /
      (1000 * 60 * 60 * 24) +
      1;

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
    });

    const type = leave.leaveType.toLowerCase();
    const balanceData = leave.employee.leaveBalance[type];
    const balance = balanceData.total - balanceData.used;


    const risk = await getApprovalRisk({
      leaveCount: pastLeaves,
      days,
      teamLoad: teamOverlap,
      balance,
    });

    leave.approvalRisk = risk;
    await leave.save();

    res.json({ risk });

  } catch (error) {
    console.error("AI RISK ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  applyLeave,
  getMyLeaves,
  updateLeaveStatus,
  getPendingLeaves,
  getLeaveRecommendation
};


