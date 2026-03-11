const User = require('../models/User');
const Department = require('../models/Department');

// @desc    Get logged in user's profile
// @route   GET /api/employees/me
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('employmentDetails.department', 'name code head')
      .populate('employmentDetails.reportingTo', 'name email')
      .select('-password');

    res.json({
      success: true,
      profile: user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update logged in user's profile
// @route   PUT /api/employees/me
// @access  Private
const updateMyProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Fields that cannot be updated by employee
    delete updates.role;
    delete updates.employeeId;
    delete updates.password;
    delete updates.employmentDetails;
    delete updates.bankDetails;
    delete updates.isActive;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all employees (directory)
// @route   GET /api/employees
// @access  Manager/Admin
const getEmployeeDirectory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      department, 
      role,
      sortBy = 'name',
      order = 'asc' 
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) {
      filter['employmentDetails.department'] = department;
    }
    
    if (role) {
      filter.role = role;
    }

    // For manager: only show their team members
    if (req.user.role === 'manager') {
      filter.team = req.user.team;
    }

    // Sorting
    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = {};
    sort[sortBy] = sortOrder;

    // Execute query
    const employees = await User.find(filter)
      .populate('employmentDetails.department', 'name code')
      .populate('employmentDetails.reportingTo', 'name email')
      .select('name email employeeId role employmentDetails team isActive')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Employee directory error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single employee by ID
// @route   GET /api/employees/:id
// @access  Manager/Admin
const getEmployeeById = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .populate('employmentDetails.department', 'name code head')
      .populate('employmentDetails.reportingTo', 'name email')
      .populate('createdBy', 'name email')
      .select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if manager can view this employee
    if (req.user.role === 'manager' && employee.team !== req.user.team) {
      return res.status(403).json({
        success: false,
        message: 'You can only view employees in your team'
      });
    }

    res.json({
      success: true,
      employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee (Admin/Manager only)
// @route   PUT /api/employees/:id
// @access  Admin/Manager
const updateEmployee = async (req, res) => {
  try {
    const { role, employmentDetails, team, ...otherUpdates } = req.body;

    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check permissions
    if (req.user.role === 'manager') {
      // Manager can only update their team members
      if (employee.team !== req.user.team) {
        return res.status(403).json({
          success: false,
          message: 'You can only update employees in your team'
        });
      }
      // Manager cannot change role to admin
      if (role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot assign admin role'
        });
      }
    }

    // Update fields
    if (role) employee.role = role;
    if (team) employee.team = team;
    if (employmentDetails) {
      employee.employmentDetails = {
        ...employee.employmentDetails,
        ...employmentDetails
      };
    }

    // Update other fields
    Object.keys(otherUpdates).forEach(key => {
      employee[key] = otherUpdates[key];
    });

    employee.updatedBy = req.user._id;
    await employee.save();

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: employee.select('-password')
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/stats/summary
// @access  Admin/Manager
const getEmployeeStats = async (req, res) => {
  try {
    const filter = {};
    
    if (req.user.role === 'manager') {
      filter.team = req.user.team;
    }

    const stats = await User.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          byRole: {
            $push: '$role'
          },
          byTeam: {
            $push: '$team'
          }
        }
      },
      {
        $project: {
          totalEmployees: 1,
          activeEmployees: 1,
          roleDistribution: {
            admin: {
              $size: {
                $filter: {
                  input: '$byRole',
                  as: 'role',
                  cond: { $eq: ['$$role', 'admin'] }
                }
              }
            },
            manager: {
              $size: {
                $filter: {
                  input: '$byRole',
                  as: 'role',
                  cond: { $eq: ['$$role', 'manager'] }
                }
              }
            },
            employee: {
              $size: {
                $filter: {
                  input: '$byRole',
                  as: 'role',
                  cond: { $eq: ['$$role', 'employee'] }
                }
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalEmployees: 0,
        activeEmployees: 0,
        roleDistribution: { admin: 0, manager: 0, employee: 0 }
      }
    });
  } catch (error) {
    console.error('Employee stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getEmployeeDirectory,
  getEmployeeById,
  updateEmployee,
  getEmployeeStats
};