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
    const { name, email, team } = req.body;

    if (!name || !email || !team) {
      return res.status(400).json({ message: "All fields required" });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const tempPassword = "Test@123"; // later random bana sakte ho
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "employee",
      team,
    });

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

    employee.manager = managerId;
    await employee.save();

    res.status(200).json({ message: "Manager assigned successfully" });

  } catch (error) {
    console.error("ASSIGN MANAGER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  getAllUsers,
  updateUserRole,
  getAllLeaves,
  addEmployee,
  assignManager,
};
