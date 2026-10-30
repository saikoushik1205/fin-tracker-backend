/**
 * Centralized Money Calculation Utility
 * Strictly uses integer paise internally to avoid floating-point errors.
 * Supported financial statuses: Pending and Completed (Returned).
 */

const toPaise = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 0;
  return Math.round(Number(amount) * 100);
};

const fromPaise = (paise) => {
  if (paise === null || paise === undefined || isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
};

/**
 * Checks whether a transaction is a settlement / repayment
 */
const isSettlementTransaction = (t) => {
  if (!t) return false;
  // A transaction with pending status can NEVER be a settlement or returned payment
  if (t.status === "pending") return false;

  const type = (t.type || "").trim().toLowerCase();
  if (type === "repayment") return true;

  if (t.metadata && (t.metadata.isSettlement === true || t.metadata.loanId)) {
    return true;
  }

  const remarks = (t.remarks || "").trim();
  if (
    remarks.startsWith("Settlement received") ||
    remarks.startsWith("Settlement repaid") ||
    remarks.startsWith("Settlement paid")
  ) {
    return true;
  }

  return false;
};

/**
 * Calculates person/ledger totals:
 * - Total: Sum of active loan transactions (excluding separate settlement entries)
 * - Completed: Sum of settlements + legacy completed transactions
 * - Pending: Remaining unpaid balance (Total - Completed)
 * 
 * @param {Array} transactions Array of transaction objects
 * @returns {{ total: number, completed: number, pending: number, transactionCount: number }}
 */
const calculatePersonStats = (transactions = []) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      transactionCount: 0,
      total: 0,
      completed: 0,
      pending: 0,
    };
  }

  // Filter out cancelled transactions
  const activeTransactions = transactions.filter((t) => t.status !== "cancelled");
  if (activeTransactions.length === 0) {
    return {
      transactionCount: 0,
      total: 0,
      completed: 0,
      pending: 0,
    };
  }

  let loansPaise = 0;
  let settlementsPaise = 0;
  let legacyCompletedPaise = 0;

  for (const t of activeTransactions) {
    const amtPaise = toPaise(t.amount);

    if (isSettlementTransaction(t)) {
      settlementsPaise += amtPaise;
    } else {
      loansPaise += amtPaise;
      if (t.status === "completed" || t.status === "partial") {
        legacyCompletedPaise += amtPaise;
      }
    }
  }

  const completedPaise = settlementsPaise + legacyCompletedPaise;
  const pendingPaise = Math.max(0, loansPaise - completedPaise);

  return {
    transactionCount: activeTransactions.length,
    total: fromPaise(loansPaise),
    completed: fromPaise(completedPaise),
    pending: fromPaise(pendingPaise),
  };
};

/**
 * Aggregates section totals across persons:
 * Total = Completed + Pending
 * 
 * @param {Array} persons Array of person objects with stats
 * @returns {{ total: number, completed: number, pending: number }}
 */
const aggregateSectionTotals = (persons = []) => {
  if (!Array.isArray(persons) || persons.length === 0) {
    return { total: 0, completed: 0, pending: 0 };
  }

  let totalPaise = 0;
  let completedPaise = 0;

  for (const person of persons) {
    const stats = person.stats || {};
    totalPaise += toPaise(stats.total);
    completedPaise += toPaise(stats.completed);
  }

  const pendingPaise = Math.max(0, totalPaise - completedPaise);

  return {
    total: fromPaise(totalPaise),
    completed: fromPaise(completedPaise),
    pending: fromPaise(pendingPaise),
  };
};

module.exports = {
  toPaise,
  fromPaise,
  isSettlementTransaction,
  calculatePersonStats,
  aggregateSectionTotals,
};
