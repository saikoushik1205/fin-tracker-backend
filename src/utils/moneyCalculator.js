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
 * Calculates person/ledger totals:
 * - Total: Sum of active transactions
 * - Completed: Sum of completed/returned payments (including any legacy partial payments treated as settled)
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

  let totalPaise = 0;
  let completedPaise = 0;
  let pendingPaise = 0;

  for (const t of activeTransactions) {
    const amtPaise = toPaise(t.amount);
    totalPaise += amtPaise;

    if (t.status === "completed" || t.status === "partial") {
      completedPaise += amtPaise;
    } else if (t.status === "pending") {
      pendingPaise += amtPaise;
    }
  }

  // Enforce invariant: Pending = Total - Completed
  if (totalPaise > 0) {
    if (completedPaise === 0 && pendingPaise > 0 && pendingPaise < totalPaise) {
      completedPaise = totalPaise - pendingPaise;
    } else {
      pendingPaise = Math.max(0, totalPaise - completedPaise);
    }
  } else {
    completedPaise = 0;
    pendingPaise = 0;
  }

  return {
    transactionCount: activeTransactions.length,
    total: fromPaise(totalPaise),
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
  calculatePersonStats,
  aggregateSectionTotals,
};
