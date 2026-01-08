const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { verifyToken } = require("../middleware/auth");
const { transactionValidation } = require("../middleware/validation");

// All routes require authentication
router.use(verifyToken);

// Get transactions by person
router.get("/person/:personId", transactionController.getTransactionsByPerson);

// CRUD operations
router.post(
  "/",
  transactionValidation.create,
  transactionController.createTransaction
);
router.put(
  "/:id",
  transactionValidation.update,
  transactionController.updateTransaction
);
router.delete("/:id", transactionController.deleteTransaction);

module.exports = router;
