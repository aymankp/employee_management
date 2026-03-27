const User = require("../models/User");
const Leave = require("../models/Leave");
const bcrypt = require("bcryptjs");

// 1️⃣ Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2️⃣ Change user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!["employee", "manager"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Role updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 3️⃣ Get all leaves
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employee", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      team,
      role,
      designation,
      joiningDate,
      employmentType
    } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email required" });
    }

    if (role !== "admin" && !team) {
      return res.status(400).json({ message: "Team required for non-admin users" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const tempPassword = "Test@123";

    const user = await User.create({
      name,
      email,
      password: tempPassword,
      role: role || "employee",
      team: role === "admin" ? null : team,

      // ✅ FIXED STRUCTURE
      personalInfo: {
        phone: req.body.phone?.match(/^[0-9]{10}$|^\+91[0-9]{10}$/)
          ? req.body.phone
          : undefined, // skip invalid
      },

      employmentDetails: {
        designation: designation && designation.trim() ? designation : "Not Assigned",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        employmentType: employmentType || "permanent",
      },
    });
    console.log("DESIGNATION:", designation);
    res.status(201).json({
      message: "Employee created",
      employee: {
        name: user.name,
        email: user.email,
        role: user.role,
        tempPassword,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const assignManager = async (req, res) => {
  try {
    const { employeeId, managerId } = req.body;

    if (!employeeId || !managerId) {
      return res.status(400).json({ message: "Both IDs required" });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== "manager") {
      return res.status(400).json({ message: "Invalid manager" });
    }

    employee.employmentDetails.reportingTo = managerId;
    await employee.save();

    res.status(200).json({ message: "Manager assigned successfully" });

  } catch (error) {
    console.error("ASSIGN MANAGER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await User.updateOne(
      { _id: id },
      { $set: { isActive: isActive } }
    );

    const updatedUser = await User.findById(id);

    res.json({ user: updatedUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
};
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // basic fields
    if (req.body.role) user.role = req.body.role;
    if (req.body.team) user.team = req.body.team;

    // nested fields (IMPORTANT)
    if (req.body.personalInfo?.phone !== undefined) {
      user.personalInfo.phone = req.body.personalInfo.phone;
    }

    if (req.body.employmentDetails?.designation !== undefined) {
      user.employmentDetails.designation =
        req.body.employmentDetails.designation;
    }

    if (req.body.employmentDetails?.employmentType !== undefined) {
      user.employmentDetails.employmentType =
        req.body.employmentDetails.employmentType;
    }
    if (req.body.employmentDetails?.joiningDate !== undefined) {
      user.employmentDetails.joiningDate =
        req.body.employmentDetails.joiningDate
          ? new Date(req.body.employmentDetails.joiningDate)
          : null;
    }
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "User updated successfully",
      user,
    });

  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "User deleted successfully",
    });

  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  getAllLeaves,
  addEmployee,
  assignManager,
  updateUserStatus,
  updateUser,
  deleteUser
};
