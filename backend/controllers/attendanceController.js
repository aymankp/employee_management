const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Check In
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
  try {
    const { location, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today',
        attendance: existing
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      employee: req.user._id,
      date: today,
      checkIn: new Date(),
      location: location || 'office',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check Out
// @route   PUT /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {

  try {
    const { notes } = req.body || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in found for today'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out today'
      });
    }

    attendance.checkOut = new Date();
    attendance.notes = notes || attendance.notes;
    await attendance.save();
    console.log("Work hours:", attendance.workHours);

    res.json({
      success: true,
      message: 'Check-out successful',
      status: {
        checkedIn: true,
        checkedOut: true,
        checkInTime: attendance.checkIn,
        checkOutTime: attendance.checkOut,
        workHours: attendance.workHours,
        overtime: attendance.overtime,
        location: attendance.location
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Today's Status
// @route   GET /api/attendance/today
// @access  Private
const getTodayStatus = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    res.json({
      success: true,
      status: attendance ? {
        checkedIn: true,
        checkedOut: !!attendance.checkOut,
        checkInTime: attendance.checkIn,
        checkOutTime: attendance.checkOut,
        workHours: attendance.workHours,
        location: attendance.location,

        // ✅ NEW
        early: attendance.early,
        late: attendance.late

      } : {
        checkedIn: false,
        message: 'Not checked in yet'
      }
    });
  } catch (error) {
    console.error('Today status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getTodayAttendanceSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = await Attendance.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    const present = records.filter(r => r.status === "present").length;
    // total employees
    const totalEmployees = await User.countDocuments();
    const absent = totalEmployees - present;
    res.json({
      present,
      absent,
      total: totalEmployees
    });

  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ message: "Error fetching summary" });
  }
};

// @desc    Get My Attendance History
// @route   GET /api/attendance/my
// @access  Private
const getMyAttendance = async (req, res) => {
  try {
    const { month, year, page = 1, limit = 30 } = req.query;

    let startDate, endDate;

    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = endDate = new Date(year, month, 1);
    }

    const attendance = await Attendance.find({
      employee: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments({
      employee: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculate summary
    const summary = await Attendance.aggregate([
      {
        $match: {
          employee: req.user._id,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalWorkHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' },
          presentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      attendance,
      summary: summary[0] || {
        totalDays: 0,
        totalWorkHours: 0,
        totalOvertime: 0,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('My attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Team Attendance (Manager/Admin)
// @route   GET /api/attendance/team
// @access  Manager/Admin
const getTeamAttendance = async (req, res) => {
  try {
    const { date, team } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    let employees = [];

    // Manager → get only assigned employees
    if (req.user.role === 'manager') {
      employees = await User.find({
        "employmentDetails.reportingTo": req.user._id
      }).select('_id name email employeeId team employmentDetails');
    }

    // Admin → optional team filter
    else {
      let filter = {};
      if (team) filter.team = team;

      employees = await User.find(filter)
        .select('_id name email employeeId team employmentDetails');
    }

    const attendance = await Attendance.find({
      employee: { $in: employees.map(e => e._id) },
      date: {
        $gte: queryDate,
        $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    // Merge
    const result = employees.map(emp => {
      const record = attendance.find(a => a.employee.toString() === emp._id.toString());

      return {
        employee: emp,
        attendance: record || {
          status: "absent",
          workHours: 0,
          late: false
        }
      };
    });

    // 🔥 NEW CALCULATIONS
    const present = result.filter(
      r => r.attendance && (r.attendance.status === 'present' || r.attendance.status === 'half-day')
    ).length;

    const halfDay = result.filter(
      r => r.attendance && r.attendance.status === 'half-day'
    ).length;

    const absent = result.filter(
      r => r.attendance.status === 'absent'
    ).length;

    const late = result.filter(
      r => r.attendance && r.attendance.late === true
    ).length;

    const onTime = result.filter(
      r => r.attendance && r.attendance.checkIn && !r.attendance.late
    ).length;
    res.json({
      success: true,
      date: queryDate,
      team: team || req.user.team,
      total: result.length,
      present,
      absent,
      halfDay,
      late,
      onTime,
      data: result
    });

  } catch (error) {
    console.error('Team attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Attendance Report (Admin only)
// @route   GET /api/attendance/report
// @access  Admin
const getAttendanceReport = async (req, res) => {
  try {
    const { from, to, employee, department } = req.query;

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    let filter = {
      date: { $gte: fromDate, $lte: toDate }
    };

    if (employee) {
      filter.employee = employee;
    }

    const report = await Attendance.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      { $unwind: '$employeeInfo' },
      {
        $match: department ? { 'employeeInfo.employmentDetails.department': department } : {}
      },
      {
        $group: {
          _id: {
            employee: '$employee',
            name: '$employeeInfo.name',
            employeeId: '$employeeInfo.employeeId',
            department: '$employeeInfo.employmentDetails.department'
          },
          totalDays: { $sum: 1 },
          totalWorkHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' },
          presentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.name': 1 } }
    ]);

    res.json({
      success: true,
      from: fromDate,
      to: toDate,
      report
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
const getMonthlyTeamAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Get team employees
    const employees = await User.find({
      "employmentDetails.reportingTo": req.user._id
    }).select('_id name email');

    const employeeIds = employees.map(e => e._id);

    // Get attendance records for full month
    const attendance = await Attendance.find({
      employee: { $in: employeeIds },
      date: { $gte: startDate, $lte: endDate }
    });

    res.json({
      employees,
      attendance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc    Manual Attendance Entry (Admin only)
// @route   POST /api/attendance/manual
// @access  Admin
const manualAttendance = async (req, res) => {
  try {
    const { employee, date, checkIn, checkOut, status, location, notes } = req.body;

    // Check if attendance exists
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (attendance) {
      // Update existing
      attendance.checkIn = checkIn || attendance.checkIn;
      attendance.checkOut = checkOut || attendance.checkOut;
      attendance.status = status || attendance.status;
      attendance.location = location || attendance.location;
      attendance.notes = notes || attendance.notes;
      attendance.approvedBy = req.user._id;
      attendance.isApproved = true;
    } else {
      // Create new
      attendance = new Attendance({
        employee,
        date: attendanceDate,
        checkIn,
        checkOut,
        status: status || 'present',
        location,
        notes,
        approvedBy: req.user._id,
        isApproved: true
      });
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance saved successfully',
      attendance
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayStatus,
  getMyAttendance,
  getTeamAttendance,
  getAttendanceReport,
  manualAttendance,
  getTodayAttendanceSummary,
  getMonthlyTeamAttendance
};