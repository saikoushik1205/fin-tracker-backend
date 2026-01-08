const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verifyToken } = require("../middleware/auth");

// All routes require authentication
router.use(verifyToken);

router.get("/stats", dashboardController.getDashboardStats);
router.get("/recent-transactions", dashboardController.getRecentTransactions);

module.exports = router;
