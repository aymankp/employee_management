const User = require('../models/User.js');

// @desc    Get manager profile
// @route   GET /api/managers/me
// @access  Private (Manager/Admin)
const getManagerProfile = async (req, res) => {
  try {
    const manager = await User.findById(req.user._id)
      .select('-password')
      .populate('employmentDetails.department', 'name description');

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    // FIXED: Use reportingTo instead of manager
    const managedEmployees = await User.find({ 
      'employmentDetails.reportingTo': req.user._id,
      role: 'employee' 
    })
    .select('name email avatar role isActive personalInfo employmentDetails')
    .populate('employmentDetails.department', 'name');

    // Get pending leave requests for team (you'll need to implement this)
    const pendingLeaves = await getPendingLeaveRequests(req.user._id);

    const managerData = manager.toObject();
    managerData.managedEmployees = managedEmployees;
    managerData.teamStats = {
      totalMembers: managedEmployees.length,
      // FIXED: Use isActive instead of status
      activeMembers: managedEmployees.filter(emp => emp.isActive === true).length,
      pendingLeaves: pendingLeaves
    };

    res.json({ 
      success: true,
      profile: managerData 
    });
  } catch (error) {
    console.error('Get manager profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Update manager profile
// @route   PUT /api/managers/me
// @access  Private (Manager/Admin)
const updateManagerProfile = async (req, res) => {
  try {
    const { name, personalInfo, address, emergencyContact } = req.body;

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (personalInfo) updateFields.personalInfo = personalInfo;
    if (address) updateFields.address = address;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;

    const updatedManager = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ 
      success: true,
      message: 'Profile updated successfully', 
      profile: updatedManager 
    });
  } catch (error) {
    console.error('Update manager profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Upload manager avatar
// @route   PUT /api/managers/me/avatar
// @access  Private (Manager/Admin)
const uploadManagerAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload an image' 
      });
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    
    const updatedManager = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarPath },
      { new: true }
    ).select('-password');

    res.json({ 
      success: true,
      message: 'Avatar updated successfully', 
      avatar: avatarPath,
      profile: updatedManager 
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Get team members
// @route   GET /api/managers/team
// @access  Private (Manager/Admin)
const getTeamMembers = async (req, res) => {
  try {
    const manager = await User.findById(req.user._id);
    
    // Build query based on manager's department or direct reports
    const query = {
      role: 'employee',
      _id: { $ne: req.user._id }
    };

    // If manager has managedDepartment, get all employees in that department
    if (manager.managedDepartment) {
      query.department = manager.managedDepartment;
    } else {
      // Otherwise get employees where this user is the manager
      query.manager = req.user._id;
    }

    const teamMembers = await User.find(query)
      .select('name email avatar role status personalInfo employmentDetails createdAt')
      .populate('department', 'name');

    // Get team statistics
    const totalMembers = teamMembers.length;
    const activeMembers = teamMembers.filter(m => m.status === 'active').length;
    const onLeave = teamMembers.filter(m => m.status === 'onLeave').length;

    res.json({ 
      success: true,
      team: teamMembers,
      stats: {
        total: totalMembers,
        active: activeMembers,
        onLeave: onLeave
      }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Get team member details
// @route   GET /api/managers/team/:employeeId
// @access  Private (Manager/Admin)
const getTeamMemberDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate employeeId
    if (!employeeId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid employee ID format' 
      });
    }

    const manager = await User.findById(req.user._id);
    
    // Check if employee belongs to manager's team
    const employee = await User.findOne({
      _id: employeeId,
      role: 'employee',
      $or: [
        { manager: req.user._id },
        { department: manager.managedDepartment }
      ]
    })
    .select('-password')
    .populate('department', 'name')
    .populate('manager', 'name email');

    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Team member not found' 
      });
    }

    res.json({ 
      success: true,
      employee 
    });
  } catch (error) {
    console.error('Get team member error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Get team statistics
// @route   GET /api/managers/team/stats
// @access  Private (Manager/Admin)
const getTeamStats = async (req, res) => {
  try {
    const manager = await User.findById(req.user._id);
    
    const query = {
      role: 'employee',
      _id: { $ne: req.user._id }
    };

    if (manager.managedDepartment) {
      query.department = manager.managedDepartment;
    } else {
      query.manager = req.user._id;
    }

    const teamMembers = await User.find(query);

    // Calculate statistics
    const stats = {
      total: teamMembers.length,
      active: teamMembers.filter(m => m.status === 'active').length,
      onLeave: teamMembers.filter(m => m.status === 'onLeave').length,
      inactive: teamMembers.filter(m => m.status === 'inactive').length,
      departments: [],
      recentJoins: teamMembers
        .filter(m => {
          const joinDate = new Date(m.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return joinDate > thirtyDaysAgo;
        })
        .length
    };

    // Get department distribution
    const deptCount = {};
    teamMembers.forEach(member => {
      const dept = member.department?.toString() || 'unassigned';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });

    stats.departments = Object.entries(deptCount).map(([dept, count]) => ({
      department: dept,
      count
    }));

    res.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Helper function to get pending leave requests
const getPendingLeaveRequests = async (managerId) => {
  try {
    // This would typically query a Leave model
    // For now, return mock data
    return 0;
  } catch (error) {
    console.error('Error getting pending leaves:', error);
    return 0;
  }
};
// FILE: controllers/managerController.js
// END OF FILE - YE FUNCTION ADD KARO (agar nahi hai)

// @desc    Get team employees list for dropdown
// @route   GET /api/managers/employees/team
// @access  Private (Manager/Admin)
const getTeamEmployees = async (req, res) => {
  try {
    // Find all employees reporting to this manager
    const teamMembers = await User.find({ 
      'employmentDetails.reportingTo': req.user._id,
      role: 'employee' 
    })
    .select('_id name email avatar department team')
    .lean();

    // Always return 200 with array
    res.status(200).json({
      success: true,
      employees: teamMembers || [],
      count: teamMembers.length
    });
    
  } catch (error) {
    console.error('Get team employees error:', error);
    // Return 200 with empty array, never 400
    res.status(200).json({
      success: false,
      employees: [],
      message: error.message
    });
  }
};

// Make sure it's exported
module.exports = {
  getManagerProfile,
  updateManagerProfile,
  uploadManagerAvatar,
  getTeamMembers,
  getTeamMemberDetails,
  getTeamStats,
  getTeamEmployees  
};
