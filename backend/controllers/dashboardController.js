const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Document = require('../models/Document');
const PerformanceReview = require('../models/PerformanceReview');
const Department = require('../models/Department');
const mongoose = require('mongoose');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/dashboard/admin
// @access  Admin
const getAdminDashboard = async (req, res) => {
  try {
    // Run all queries in parallel for better performance
    const [
      employeeStats,
      todayAttendance,
      leaveStats,
      documentStats,
      expiringDocuments,
      performanceStats,
      departmentStats,
      monthlyTrends
    ] = await Promise.all([
      getEmployeeStatistics(),
      getTodayAttendanceStats(),
      getLeaveStatistics(),
      getDocumentStatistics(),
      getExpiringDocuments(),
      getPerformanceStatistics(),
      getDepartmentStatistics(),
      getMonthlyTrends()
    ]);

    res.json({
      success: true,
      data: {
        employees: employeeStats,
        attendance: todayAttendance,
        leaves: leaveStats,
        documents: documentStats,
        expiringDocuments,
        performance: performanceStats,
        departments: departmentStats,
        trends: monthlyTrends,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Manager Dashboard Stats (Team-specific)
// @route   GET /api/dashboard/manager
// @access  Manager
const getManagerDashboard = async (req, res) => {
  try {
    const team = req.user.team;

    // Get team members
    const teamMembers = await User.find({ 
      team, 
      role: 'employee',
      isActive: true 
    }).select('_id');

    const teamMemberIds = teamMembers.map(m => m._id);

    const [
      teamStats,
      teamAttendance,
      pendingLeaves,
      teamDocuments,
      teamPerformance
    ] = await Promise.all([
      getTeamStatistics(team),
      getTeamAttendanceStats(teamMemberIds),
      getPendingLeavesForTeam(teamMemberIds),
      getTeamDocumentStats(teamMemberIds),
      getTeamPerformanceStats(teamMemberIds)
    ]);

    res.json({
      success: true,
      data: {
        team: {
          name: team,
          memberCount: teamStats.total,
          activeCount: teamStats.active
        },
        attendance: teamAttendance,
        pendingLeaves,
        documents: teamDocuments,
        performance: teamPerformance,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Employee Dashboard Stats (Self)
// @route   GET /api/dashboard/employee
// @access  Employee
const getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      profile,
      todayStatus,
      leaveBalance,
      recentLeaves,
      pendingDocuments,
      upcomingReviews,
      attendanceHistory
    ] = await Promise.all([
      getUserProfile(userId),
      getTodayUserStatus(userId),
      getLeaveBalance(userId),
      getRecentLeaves(userId),
      getPendingDocuments(userId),
      getUpcomingReviews(userId),
      getAttendanceHistory(userId)
    ]);

    res.json({
      success: true,
      data: {
        profile,
        todayStatus,
        leaveBalance,
        recentLeaves,
        pendingDocuments,
        upcomingReviews,
        attendanceHistory,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== Helper Functions ====================

// Employee Statistics
const getEmployeeStatistics = async () => {
  const [total, active, byRole] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
  ]);

  const newThisMonth = await User.countDocuments({
    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
  });

  return {
    total,
    active,
    newThisMonth,
    byRole: byRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// Today's Attendance Stats
const getTodayAttendanceStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.find({
    date: { $gte: today, $lt: tomorrow }
  }).populate('employee', 'name team');

  const total = await User.countDocuments({ isActive: true });
  const present = attendance.length;
  const checkedOut = attendance.filter(a => a.checkOut).length;

  return {
    total,
    present,
    absent: total - present,
    checkedOut,
    pendingCheckout: present - checkedOut,
    details: attendance
  };
};

// Leave Statistics
const getLeaveStatistics = async () => {
  const [pending, approved, rejected, byType] = await Promise.all([
    Leave.countDocuments({ status: 'pending' }),
    Leave.countDocuments({ status: 'approved' }),
    Leave.countDocuments({ status: 'rejected' }),
    Leave.aggregate([
      { $group: { _id: '$leaveType', count: { $sum: 1 } } }
    ])
  ]);

  return {
    pending,
    approved,
    rejected,
    total: pending + approved + rejected,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// Document Statistics
const getDocumentStatistics = async () => {
  const [total, verified, pending, expired] = await Promise.all([
    Document.countDocuments({ isActive: true }),
    Document.countDocuments({ verificationStatus: 'verified' }),
    Document.countDocuments({ verificationStatus: 'pending' }),
    Document.countDocuments({ 
      expiryDate: { $lt: new Date() },
      isActive: true 
    })
  ]);

  const byCategory = await Document.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  return {
    total,
    verified,
    pending,
    expired,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// Expiring Documents (next 30 days)
const getExpiringDocuments = async () => {
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const documents = await Document.find({
    expiryDate: { 
      $gte: today, 
      $lte: thirtyDaysLater 
    },
    isActive: true
  })
    .populate('employee', 'name email employeeId')
    .sort({ expiryDate: 1 });

  return {
    count: documents.length,
    documents
  };
};

// Performance Statistics
const getPerformanceStatistics = async () => {
  const [pendingReviews, completedReviews, averageRatings] = await Promise.all([
    PerformanceReview.countDocuments({ status: 'submitted' }),
    PerformanceReview.countDocuments({ status: 'completed' }),
    PerformanceReview.aggregate([
      { $match: { 'ratings.overall': { $exists: true } } },
      { $group: { 
        _id: null,
        avgOverall: { $avg: '$ratings.overall' },
        avgTechnical: { $avg: '$ratings.technical' },
        avgCommunication: { $avg: '$ratings.communication' }
      }}
    ])
  ]);

  return {
    pending: pendingReviews,
    completed: completedReviews,
    total: pendingReviews + completedReviews,
    averages: averageRatings[0] || {
      avgOverall: 0,
      avgTechnical: 0,
      avgCommunication: 0
    }
  };
};

// Department Statistics
const getDepartmentStatistics = async () => {
  const departments = await Department.find({ status: 'active' })
    .select('name employeeCount head');

  const totalEmployees = await User.countDocuments({ isActive: true });
  const departmentCount = departments.length;

  return {
    total: departmentCount,
    totalEmployees,
    averageSize: departmentCount > 0 ? Math.round(totalEmployees / departmentCount) : 0,
    list: departments
  };
};

// Monthly Trends (for charts)
const getMonthlyTrends = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [attendanceTrend, leaveTrend, employeeJoining] = await Promise.all([
    // Attendance trend
    Attendance.aggregate([
      {
        $match: {
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),

    // Leave trend
    Leave.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),

    // Employee joining trend
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  return {
    attendance: attendanceTrend,
    leaves: leaveTrend,
    newEmployees: employeeJoining
  };
};

// Team Statistics (for manager)
const getTeamStatistics = async (team) => {
  const [total, active] = await Promise.all([
    User.countDocuments({ team, role: 'employee' }),
    User.countDocuments({ team, role: 'employee', isActive: true })
  ]);

  return { total, active };
};

// Team Attendance Stats
const getTeamAttendanceStats = async (teamMemberIds) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.countDocuments({
    employee: { $in: teamMemberIds },
    date: { $gte: today, $lt: tomorrow }
  });

  return {
    present: attendance,
    absent: teamMemberIds.length - attendance
  };
};

// Pending Leaves for Team
const getPendingLeavesForTeam = async (teamMemberIds) => {
  return await Leave.countDocuments({
    employee: { $in: teamMemberIds },
    status: 'pending'
  });
};

// Team Document Stats
const getTeamDocumentStats = async (teamMemberIds) => {
  const [verified, pending] = await Promise.all([
    Document.countDocuments({
      employee: { $in: teamMemberIds },
      verificationStatus: 'verified'
    }),
    Document.countDocuments({
      employee: { $in: teamMemberIds },
      verificationStatus: 'pending'
    })
  ]);

  return { verified, pending, total: verified + pending };
};

// Team Performance Stats
const getTeamPerformanceStats = async (teamMemberIds) => {
  const [pending, completed] = await Promise.all([
    PerformanceReview.countDocuments({
      employee: { $in: teamMemberIds },
      status: 'submitted'
    }),
    PerformanceReview.countDocuments({
      employee: { $in: teamMemberIds },
      status: 'completed'
    })
  ]);

  return { pending, completed };
};

// User Profile (for employee dashboard)
const getUserProfile = async (userId) => {
  return await User.findById(userId)
    .select('name email employeeId role team personalInfo employmentDetails')
    .populate('employmentDetails.department', 'name');
};

// Today's Status for Employee
const getTodayUserStatus = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.findOne({
    employee: userId,
    date: { $gte: today, $lt: tomorrow }
  });

  if (!attendance) {
    return { checkedIn: false, status: 'absent' };
  }

  return {
    checkedIn: true,
    checkedOut: !!attendance.checkOut,
    checkInTime: attendance.checkIn,
    checkOutTime: attendance.checkOut,
    workHours: attendance.workHours,
    status: attendance.status
  };
};

// Leave Balance for Employee
const getLeaveBalance = async (userId) => {
  const user = await User.findById(userId).select('leaveBalance');
  return user?.leaveBalance || {};
};

// Recent Leaves
const getRecentLeaves = async (userId) => {
  return await Leave.find({ employee: userId })
    .sort({ createdAt: -1 })
    .limit(5);
};

// Pending Documents for Employee
const getPendingDocuments = async (userId) => {
  return await Document.countDocuments({
    employee: userId,
    verificationStatus: 'pending'
  });
};

// Upcoming Reviews
const getUpcomingReviews = async (userId) => {
  return await PerformanceReview.find({
    employee: userId,
    status: { $in: ['draft', 'submitted'] }
  })
    .sort({ createdAt: -1 })
    .limit(3);
};

// Attendance History (last 7 days)
const getAttendanceHistory = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return await Attendance.find({
    employee: userId,
    date: { $gte: sevenDaysAgo }
  }).sort({ date: -1 });
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard
};