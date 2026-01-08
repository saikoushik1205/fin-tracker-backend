const Transaction = require("../models/Transaction");
const Person = require("../models/Person");

/**
 * Get all transactions for a person
 */
exports.getTransactionsByPerson = async (req, res) => {
  try {
    const { personId } = req.params;
    const userId = req.user._id;

    const person = await Person.findOne({ _id: personId, userId });
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found",
      });
    }

    const transactions = await Transaction.find({
      personId,
      userId,
    }).sort({ date: -1 });

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
};

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const { personId, date, amount, remarks, status, type, metadata } =
      req.body;
    const userId = req.user._id;

    const person = await Person.findOne({ _id: personId, userId });
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found",
      });
    }

    const transaction = await Transaction.create({
      personId,
      userId,
      date: date || new Date(),
      amount,
      remarks: remarks || "",
      status: status || "completed",
      type: type || "",
      metadata: metadata || {},
    });

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: error.message,
    });
  }
};

/**
 * Update transaction
 */
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, remarks, status, type, metadata } = req.body;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({ _id: id, userId });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (date !== undefined) transaction.date = date;
    if (amount !== undefined) transaction.amount = amount;
    if (remarks !== undefined) transaction.remarks = remarks;
    if (status !== undefined) transaction.status = status;
    if (type !== undefined) transaction.type = type;
    if (metadata !== undefined) {
      transaction.metadata = { ...transaction.metadata, ...metadata };
    }

    await transaction.save();

    res.json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: error.message,
    });
  }
};

/**
 * Delete transaction
 */
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: error.message,
    });
  }
};
