const CashBank = require("../models/CashBank");

/**
 * Get cash and bank balances
 */
exports.getCashBank = async (req, res) => {
  try {
    const userId = req.user._id;

    let cashBank = await CashBank.findOne({ userId });

    if (!cashBank) {
      cashBank = await CashBank.create({
        userId,
        cash: 0,
        bank: 0,
      });
    }

    res.json({
      success: true,
      data: {
        cash: cashBank.cash,
        bank: cashBank.bank,
        total: cashBank.cash + cashBank.bank,
        updatedAt: cashBank.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cash/bank data",
      error: error.message,
    });
  }
};

/**
 * Update cash and bank balances
 */
exports.updateCashBank = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cash, bank } = req.body;

    if ((cash !== undefined && cash < 0) || (bank !== undefined && bank < 0)) {
      return res.status(400).json({
        success: false,
        message: "Amounts must be 0 or greater",
      });
    }

    let cashBank = await CashBank.findOne({ userId });

    if (!cashBank) {
      cashBank = await CashBank.create({
        userId,
        cash: cash !== undefined ? cash : 0,
        bank: bank !== undefined ? bank : 0,
      });
    } else {
      if (cash !== undefined) cashBank.cash = cash;
      if (bank !== undefined) cashBank.bank = bank;
      await cashBank.save();
    }

    res.json({
      success: true,
      message: "Balances updated successfully",
      data: {
        cash: cashBank.cash,
        bank: cashBank.bank,
        total: cashBank.cash + cashBank.bank,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update balances",
      error: error.message,
    });
  }
};
