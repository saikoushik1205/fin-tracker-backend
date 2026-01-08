const express = require("express");
const router = express.Router();
const cashBankController = require("../controllers/cashBankController");
const { verifyToken } = require("../middleware/auth");
const { cashBankValidation } = require("../middleware/validation");

// All routes require authentication
router.use(verifyToken);

router.get("/", cashBankController.getCashBank);
router.put("/", cashBankValidation.update, cashBankController.updateCashBank);

module.exports = router;
