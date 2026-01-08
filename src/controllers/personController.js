const Person = require("../models/Person");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Get all persons for a specific section
 */
exports.getPersonsBySection = async (req, res) => {
  try {
    const { sectionType } = req.params;
    const userId = req.user._id;

    const persons = await Person.find({
      userId,
      sectionType,
      isActive: true,
    }).sort({ createdAt: -1 });

    // Get transaction counts and totals for each person
    const personsWithStats = await Promise.all(
      persons.map(async (person) => {
        const transactions = await Transaction.find({
          personId: person._id,
          userId,
        });

        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const pending = transactions
          .filter((t) => t.status === "pending")
          .reduce((sum, t) => sum + t.amount, 0);
        const completed = transactions
          .filter((t) => t.status === "completed")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          ...person.toObject(),
          stats: {
            transactionCount: transactions.length,
            total,
            pending,
            completed,
          },
        };
      })
    );

    res.json({
      success: true,
      count: personsWithStats.length,
      persons: personsWithStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch persons",
      error: error.message,
    });
  }
};

/**
 * Get single person with all transactions
 */
exports.getPersonById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const person = await Person.findOne({
      _id: id,
      userId,
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found",
      });
    }

    const transactions = await Transaction.find({
      personId: person._id,
      userId,
    }).sort({ date: -1 });

    const stats = {
      transactionCount: transactions.length,
      total: transactions.reduce((sum, t) => sum + t.amount, 0),
      pending: transactions
        .filter((t) => t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0),
      completed: transactions
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
    };

    res.json({
      success: true,
      person: {
        ...person.toObject(),
        stats,
        transactions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch person",
      error: error.message,
    });
  }
};

/**
 * Create a new person
 */
exports.createPerson = async (req, res) => {
  try {
    const { name, email, phone, sectionType, metadata } = req.body;
    const userId = req.user._id;

    // Check for duplicate person name in same section
    const existingPerson = await Person.findOne({
      userId,
      name: name.trim(),
      sectionType,
      isActive: true,
    });

    if (existingPerson) {
      return res.status(400).json({
        success: false,
        message: `A person named "${name}" already exists in ${sectionType} section. Please use a different name or add transactions to the existing person.`,
      });
    }

    const person = await Person.create({
      userId,
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      sectionType,
      metadata: metadata || {},
    });

    res.status(201).json({
      success: true,
      message: "Person created successfully",
      person,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This person already exists in this section",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create person",
      error: error.message,
    });
  }
};

/**
 * Update person details
 */
exports.updatePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, metadata } = req.body;
    const userId = req.user._id;

    const person = await Person.findOne({ _id: id, userId });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found",
      });
    }

    // Check for duplicate name if name is being changed
    if (name && name !== person.name) {
      const duplicate = await Person.findOne({
        userId,
        name: name.trim(),
        sectionType: person.sectionType,
        isActive: true,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `A person named "${name}" already exists in this section`,
        });
      }
    }

    if (name !== undefined) person.name = name.trim();
    if (email !== undefined) person.email = email.trim();
    if (phone !== undefined) person.phone = phone.trim();
    if (metadata !== undefined)
      person.metadata = { ...person.metadata, ...metadata };

    await person.save();

    res.json({
      success: true,
      message: "Person updated successfully",
      person,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update person",
      error: error.message,
    });
  }
};

/**
 * Delete person (soft delete)
 */
exports.deletePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const person = await Person.findOne({ _id: id, userId });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found",
      });
    }

    // Soft delete
    person.isActive = false;
    await person.save();

    // Also soft delete associated transactions if needed
    // await Transaction.updateMany(
    //   { personId: id, userId },
    //   { isActive: false }
    // );

    res.json({
      success: true,
      message: "Person deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete person",
      error: error.message,
    });
  }
};
