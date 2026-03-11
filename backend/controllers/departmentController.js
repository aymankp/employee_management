const Department = require('../models/Department');
const User = require('../models/User');

// @desc    Create new department
// @route   POST /api/departments
// @access  Admin only
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, head, parentDepartment, location, budget } = req.body;

    // Check if department with same name or code exists
    const existingDept = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: code.toUpperCase() }
      ]
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name or code already exists'
      });
    }

    // Create department
    const department = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
      head,
      parentDepartment,
      location,
      budget,
      createdBy: req.user._id
    });

    // If head is assigned, update that user's department
    if (head) {
      await User.findByIdAndUpdate(head, {
        'employmentDetails.department': department._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Admin/Manager
const getAllDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Get departments with pagination
    const departments = await Department.find(filter)
      .populate('head', 'name email employeeId')
      .populate('parentDepartment', 'name code')
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    // Update employee count for each department
    for (let dept of departments) {
      await dept.updateEmployeeCount();
    }

    const total = await Department.countDocuments(filter);

    res.json({
      success: true,
      departments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Admin/Manager
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('head', 'name email employeeId phone')
      .populate('parentDepartment', 'name code head')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Update employee count
    await department.updateEmployeeCount();

    // Get employees in this department
    const employees = await User.find({
      'employmentDetails.department': department._id,
      isActive: true
    })
      .select('name email employeeId role employmentDetails.designation')
      .sort({ name: 1 });

    res.json({
      success: true,
      department,
      employees,
      employeeCount: employees.length
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Admin only
const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, head, parentDepartment, location, budget, status } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check name uniqueness if changed
    if (name && name.toLowerCase() !== department.name.toLowerCase()) {
      const nameExists = await Department.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: department._id }
      });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Department name already exists'
        });
      }
    }

    // Check code uniqueness if changed
    if (code && code.toUpperCase() !== department.code) {
      const codeExists = await Department.findOne({
        code: code.toUpperCase(),
        _id: { $ne: department._id }
      });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Department code already exists'
        });
      }
    }

    // If head is changing, update old and new head's department
    if (head && head.toString() !== department.head?.toString()) {
      // Remove old head's department
      if (department.head) {
        await User.findByIdAndUpdate(department.head, {
          $unset: { 'employmentDetails.department': 1 }
        });
      }
      // Set new head's department
      await User.findByIdAndUpdate(head, {
        'employmentDetails.department': department._id
      });
    }

    // Update department
    department.name = name || department.name;
    department.code = code ? code.toUpperCase() : department.code;
    department.description = description || department.description;
    department.head = head || department.head;
    department.parentDepartment = parentDepartment || department.parentDepartment;
    department.location = location || department.location;
    department.budget = budget !== undefined ? budget : department.budget;
    department.status = status || department.status;
    department.updatedBy = req.user._id;

    await department.save();

    res.json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete department (soft delete)
// @route   DELETE /api/departments/:id
// @access  Admin only
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has employees
    const employeeCount = await User.countDocuments({
      'employmentDetails.department': department._id,
      isActive: true
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with active employees. Please reassign employees first.'
      });
    }

    // Soft delete - just mark inactive
    department.status = 'inactive';
    department.updatedBy = req.user._id;
    await department.save();

    res.json({
      success: true,
      message: 'Department deactivated successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get department statistics
// @route   GET /api/departments/stats/overview
// @access  Admin only
const getDepartmentStats = async (req, res) => {
  try {
    const stats = await Department.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'employmentDetails.department',
          as: 'employees'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          employeeCount: { $size: '$employees' },
          activeEmployees: {
            $size: {
              $filter: {
                input: '$employees',
                as: 'emp',
                cond: { $eq: ['$$emp.isActive', true] }
              }
            }
          },
          budget: 1,
          status: 1
        }
      }
    ]);

    const totalEmployees = await User.countDocuments({ isActive: true });
    const totalDepartments = await Department.countDocuments({ status: 'active' });

    res.json({
      success: true,
      stats: {
        departments: stats,
        summary: {
          totalDepartments,
          totalEmployees,
          avgEmployeesPerDept: totalDepartments > 0 
            ? Math.round(totalEmployees / totalDepartments) 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Department stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
};