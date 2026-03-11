const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {isAdmin}= require("../middleware/roleMiddleware")


// REGISTER
// router.post("/register", registerUser);

// admin can register
router.post("/register", protect, isAdmin, registerUser);


// LOGIN
router.post("/login", loginUser);

// TEST protected route
// router.get("/me", protect, (req, res) => {
//   res.json(req.user);
// });

// We need a route to return current user info.
router.get("/me", protect, getMe);

module.exports = router;
