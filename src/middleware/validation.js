const { body, param, validationResult } = require("express-validator");

/**
 * Validation middleware wrapper
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    console.log("Validation errors:", errors.array());
    console.log("Request body:", req.body);

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  };
};

/**
 * Person validation rules
 */
const personValidation = {
  create: validate([
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Person name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    body("sectionType")
      .isIn(["lending", "borrowing", "earnings", "expenses", "interest"])
      .withMessage("Invalid section type"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone")
      .optional()
      .matches(/^[0-9+\-\s()]*$/)
      .withMessage("Invalid phone format"),
  ]),

  update: validate([
    param("id").isMongoId().withMessage("Invalid person ID"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
  ]),
};

/**
 * Transaction validation rules
 */
const transactionValidation = {
  create: validate([
    body("personId").isMongoId().withMessage("Invalid person ID"),
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be greater than 0"),
    body("date").optional().isISO8601().withMessage("Invalid date format"),
    body("status")
      .optional()
      .isIn(["pending", "completed", "partial", "cancelled"])
      .withMessage("Invalid status"),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks too long (max 500 characters)"),
  ]),

  update: validate([
    param("id").isMongoId().withMessage("Invalid transaction ID"),
    body("amount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be greater than 0"),
    body("date").optional().isISO8601().withMessage("Invalid date format"),
    body("status")
      .optional()
      .isIn(["pending", "completed", "partial", "cancelled"])
      .withMessage("Invalid status"),
  ]),
};

/**
 * Cash/Bank validation rules
 */
const cashBankValidation = {
  update: validate([
    body("cash")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Cash amount must be 0 or greater"),
    body("bank")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Bank amount must be 0 or greater"),
  ]),
};

module.exports = {
  personValidation,
  transactionValidation,
  cashBankValidation,
};
