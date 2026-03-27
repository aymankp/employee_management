const User = require("../models/User");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, team, reportingTo } = req.body;
    // 1. Validation 
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 2. Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3. Create user (role default "employee")
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "employee",
      team: team || null,
      employmentDetails: {
        reportingTo: reportingTo || null
      }
    });

    // 5. Success response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.team
      }
    });
  } catch (error) {
    // console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// LOGIN API
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. find user
    // const user = await User.findOne({ email: email.toLowerCase().trim() });
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3. password check
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔥 Login tracking
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const loginRecord = {
      loginAt: new Date(),
      ip,
      device: userAgent,
      location: "Unknown",
    };

    user.lastLogin = new Date();

    user.loginHistory = user.loginHistory || [];
    user.loginHistory.unshift(loginRecord);
    user.loginHistory = user.loginHistory.slice(0, 5);

    await user.save();

    // 4. token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5. response
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });

  } catch (err) {
    console.error(err); // 🔥 add this for debugging
    res.status(500).json({ message: "Server error" });
  }
};




const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//from internal
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password incorrect" });
    }
    // Don't hash here
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};




module.exports = {
  registerUser,
  loginUser,
  getMe,
  changePassword,
};