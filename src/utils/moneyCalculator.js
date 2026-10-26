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
 * Calculates person/ledger totals adhering strictly to the invariant:
 * Pending = Total - Returned
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

  let completedPaise = explicitCompletedPaise + partialPaise;
  let pendingPaise = explicitPendingPaise;

  // Reconcile invariant: Pending must equal Total - Returned
  if (totalPaise > 0) {
    if (completedPaise === 0 && pendingPaise > 0 && pendingPaise < totalPaise) {
      // Discrepancy where returned wasn't explicitly flagged
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
 * Aggregates section totals across persons adhering to the invariant:
 * Total = Returned + Pending
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
  let pendingPaise = 0;

  for (const person of persons) {
    const stats = person.stats || {};
    totalPaise += toPaise(stats.total);
    completedPaise += toPaise(stats.completed);
    pendingPaise += toPaise(stats.pending);
  }

  // Ensure invariant holds across the aggregate
  const reconciledPendingPaise = Math.max(0, totalPaise - completedPaise);

  return {
    total: fromPaise(totalPaise),
    completed: fromPaise(completedPaise),
    pending: fromPaise(reconciledPendingPaise),
  };
};

module.exports = {
  toPaise,
  fromPaise,
  calculatePersonStats,
  aggregateSectionTotals,
};
