const Person = require("../models/Person");
const Transaction = require("../models/Transaction");
const CashBank = require("../models/CashBank");
const { calculatePersonStats, aggregateSectionTotals, toPaise, fromPaise } = require("../utils/moneyCalculator");

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
      const personsWithStats = await Promise.all(
        persons.map(async (person) => {
          const transactions = await Transaction.find({
            personId: person._id,
            userId,
          });
          return { stats: calculatePersonStats(transactions) };
        })
      );
      return aggregateSectionTotals(personsWithStats);
    };

    const [lending, borrowing, earnings, expenses, interest] =
      await Promise.all([
        calculateSectionTotal(lendingPersons),
        calculateSectionTotal(borrowingPersons),
        calculateSectionTotal(earningsPersons),
        calculateSectionTotal(expensesPersons),
        calculateSectionTotal(interestPersons),
      ]);

    // Net Receivable: Pending Lent - Pending Borrowed (in integer paise)
    const netReceivablePaise = toPaise(lending.pending) - toPaise(borrowing.pending);
    const netReceivable = fromPaise(netReceivablePaise);

    // Total available cash & bank
    const totalCashPaise = toPaise(cashBank?.cash || 0) + toPaise(cashBank?.bank || 0);
    const totalCash = fromPaise(totalCashPaise);

    // Liquid Cash Position (Cash + Bank)
    const cashPosition = totalCash;

    // Comprehensive Net Worth: Cash + Bank + Total Earnings - Total Expenses + Net Receivable
    const netWorthPaise = totalCashPaise + toPaise(earnings.completed) - toPaise(expenses.completed) + netReceivablePaise;
    const netWorth = fromPaise(netWorthPaise);

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
        netBalance: netReceivable,
        netReceivable,
        cashPosition,
        netWorth,
        summary: {
          netReceivable,
          cashPosition,
          netWorth,
          totalLent: lending.total,
          totalBorrowed: borrowing.total,
          pendingLent: lending.pending,
          pendingBorrowed: borrowing.pending,
          returnedLent: lending.completed,
          returnedBorrowed: borrowing.completed,
          availableCash: totalCash,
          totalEarnings: earnings.completed,
          totalExpenses: expenses.completed,
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
