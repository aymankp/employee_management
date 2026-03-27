const Department = require('../models/Department');

const checkDepartmentAccess = async (req, res, next) => {
  const user = req.user;

  if (user.role === 'admin') return next();

  const department = await Department.findOne({
    head: user._id
  });

  if (!department) {
    return res.status(403).json({ message: "Access denied" });
  }

  req.department = department;
  next();
};

module.exports = { checkDepartmentAccess };