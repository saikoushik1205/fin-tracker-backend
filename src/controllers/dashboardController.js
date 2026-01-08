const Person = require("../models/Person");
const Transaction = require("../models/Transaction");
const CashBank = require("../models/CashBank");

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all sections data in parallel
    const [
      lendingPersons,
      borrowingPersons,
      earningsPersons,
      expensesPersons,
      interestPersons,
      cashBank,
    ] = await Promise.all([
      Person.find({ userId, sectionType: "lending", isActive: true }),
      Person.find({ userId, sectionType: "borrowing", isActive: true }),
      Person.find({ userId, sectionType: "earnings", isActive: true }),
      Person.find({ userId, sectionType: "expenses", isActive: true }),
      Person.find({ userId, sectionType: "interest", isActive: true }),
      CashBank.findOne({ userId }),
    ]);

    // Calculate totals for each section
    const calculateSectionTotal = async (persons) => {
      let total = 0;
      let pending = 0;
      let completed = 0;

      for (const person of persons) {
        const transactions = await Transaction.find({
          personId: person._id,
          userId,
        });

        const personTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
        const personPending = transactions
          .filter((t) => t.status === "pending")
          .reduce((sum, t) => sum + t.amount, 0);
        const personCompleted = transactions
          .filter((t) => t.status === "completed")
          .reduce((sum, t) => sum + t.amount, 0);

        total += personTotal;
        pending += personPending;
        completed += personCompleted;
      }

      return { total, pending, completed };
    };

    const [lending, borrowing, earnings, expenses, interest] =
      await Promise.all([
        calculateSectionTotal(lendingPersons),
        calculateSectionTotal(borrowingPersons),
        calculateSectionTotal(earningsPersons),
        calculateSectionTotal(expensesPersons),
        calculateSectionTotal(interestPersons),
      ]);

    // Calculate net balance: Total Lended - Total Borrowed
    const netBalance = lending.total - borrowing.total;

    // Total available cash
    const totalCash = (cashBank?.cash || 0) + (cashBank?.bank || 0);

    res.json({
      success: true,
      stats: {
        lending,
        borrowing,
        earnings,
        expenses,
        interest,
        cashBank: {
          cash: cashBank?.cash || 0,
          bank: cashBank?.bank || 0,
          total: totalCash,
        },
        netBalance,
        summary: {
          totalLent: lending.total,
          totalBorrowed: borrowing.total,
          availableCash: totalCash,
          totalExpenses: expenses.total,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

/**
 * Get recent transactions across all sections
 */
exports.getRecentTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    const transactions = await Transaction.find({ userId })
      .populate("personId", "name sectionType")
      .sort({ date: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent transactions",
      error: error.message,
    });
  }
};
