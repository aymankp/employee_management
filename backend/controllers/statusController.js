const User = require("../models/User");
const { onlineUsers } = require("../socketStore");

const getUserStatus = async (req, res) => {
  const userId = String(req.params.userId);
  const user = await User.findById(userId).select("lastSeen");
  res.json({
    online: onlineUsers.has(userId),
    lastSeen: user?.lastSeen,
  });
};



module.exports = { getUserStatus };
