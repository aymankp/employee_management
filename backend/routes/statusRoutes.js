const express = require("express");
const router = express.Router();
const { getUserStatus } = require("../controllers/statusController");
const verifyToken = require("../middleware/verifyToken"); 

// Add authentication middleware
router.get("/:userId", verifyToken, getUserStatus);

module.exports = router;