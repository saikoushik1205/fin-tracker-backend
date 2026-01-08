const express = require("express");
const router = express.Router();
const personController = require("../controllers/personController");
const { verifyToken, checkInterestAccess } = require("../middleware/auth");
const { personValidation } = require("../middleware/validation");

// All routes require authentication
router.use(verifyToken);

// Get persons by section type
router.get("/section/:sectionType", personController.getPersonsBySection);

// CRUD operations
router.get("/:id", personController.getPersonById);
router.post("/", personValidation.create, personController.createPerson);
router.put("/:id", personValidation.update, personController.updatePerson);
router.delete("/:id", personController.deletePerson);

module.exports = router;
