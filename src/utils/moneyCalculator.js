/**
 * Centralized Money Calculation Utility
 * Uses integer paise internally to avoid floating-point errors.
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
 * Calculates person/ledger totals adhering strictly to:
 * - Returned: Only completed transactions
 * - Partial: Only partial payment transactions
 * - Pending: Remaining unpaid balance (Total - Returned - Partial)
 * 
 * @param {Array} transactions Array of transaction objects
 * @returns {{ total: number, completed: number, partial: number, pending: number, transactionCount: number }}
 */
const calculatePersonStats = (transactions = []) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      transactionCount: 0,
      total: 0,
      completed: 0,
      partial: 0,
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
      partial: 0,
      pending: 0,
    };
  }

  let totalPaise = 0;
  let explicitCompletedPaise = 0;
  let explicitPendingPaise = 0;
  let partialPaise = 0;

  for (const t of activeTransactions) {
    const amtPaise = toPaise(t.amount);
    totalPaise += amtPaise;

    if (t.status === "completed") {
      explicitCompletedPaise += amtPaise;
    } else if (t.status === "pending") {
      explicitPendingPaise += amtPaise;
    } else if (t.status === "partial") {
      partialPaise += amtPaise;
    }
  }

  // Pending is either explicit pending, or derived from total - completed - partial
  let pendingPaise = Math.max(0, totalPaise - explicitCompletedPaise - partialPaise);

  return {
    transactionCount: activeTransactions.length,
    total: fromPaise(totalPaise),
    completed: fromPaise(explicitCompletedPaise),
    partial: fromPaise(partialPaise),
    pending: fromPaise(pendingPaise),
  };
};

/**
 * Aggregates section totals across persons:
 * Total = Returned (Completed) + Partial + Pending
 * 
 * @param {Array} persons Array of person objects with stats
 * @returns {{ total: number, completed: number, partial: number, pending: number }}
 */
const aggregateSectionTotals = (persons = []) => {
  if (!Array.isArray(persons) || persons.length === 0) {
    return { total: 0, completed: 0, partial: 0, pending: 0 };
  }

  let totalPaise = 0;
  let completedPaise = 0;
  let partialPaise = 0;

  for (const person of persons) {
    const stats = person.stats || {};
    totalPaise += toPaise(stats.total);
    completedPaise += toPaise(stats.completed);
    partialPaise += toPaise(stats.partial);
  }

  const pendingPaise = Math.max(0, totalPaise - completedPaise - partialPaise);

  return {
    total: fromPaise(totalPaise),
    completed: fromPaise(completedPaise),
    partial: fromPaise(partialPaise),
    pending: fromPaise(pendingPaise),
  };
};

module.exports = {
  toPaise,
  fromPaise,
  calculatePersonStats,
  aggregateSectionTotals,
};
