const isManager = (req, res, next) => {
  if (req.user && req.user.role === "manager") {
    next(); // ✅ allow
  } else {
    res.status(403).json({
      message: "Access denied. Manager only.",
    });
  }
};

const isAdmin = (req, res, next) => {

  if (req.user && req.user.role === "admin") {
    next(); // allow
  } else {
    res.status(403).json({
      message: "Access denied. Admin only.",
    });
  }
};

module.exports = { isManager, isAdmin };
