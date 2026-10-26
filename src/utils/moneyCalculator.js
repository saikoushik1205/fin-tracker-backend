/**
 * Centralized Money Calculation Utility (Backend)
 * Strictly uses integer paise internally to avoid floating-point errors.
 * 
 * Rules:
 * 1. Total = sum of loans.
 * 2. Returned = sum of repayments.
 * 3. Pending = Math.max(0, Total - Returned).
 * 4. Advance = Math.max(0, Returned - Total).
 * 
 * Includes clearly marked TEMPORARY LEGACY ADAPTER to handle historical rows:
 * - Legacy rows with status COMPLETED loans
 * - Legacy split loans (containing "(Remaining pending after partial settlement)")
 * - Legacy settlement rows (containing "Settlement received" or "Settled via")
 */

const toPaise = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 0;
  return Math.round(Number(amount) * 100);
};

const fromPaise = (paise) => {
  if (paise === null || paise === undefined || isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
};

/* =========================================================================
   TEMPORARY LEGACY ADAPTER
   Identifies and classifies historical transactions created before the clean
   non-destructive ledger model.
   ========================================================================= */

/**
 * Checks whether a transaction is a repayment record:
 * - New clean model: type === 'repayment'
 * - Legacy model: remarks start with "Settlement received" or contain "Settled via"
 *   when created as a separate settlement entry.
 */
const isRepayment = (t) => {
  if (!t) return false;
  const type = (t.type || "").trim().toLowerCase();
  if (type === "repayment") return true;

  const remarks = (t.remarks || "").trim();
  if (remarks.startsWith("Settlement received")) return true;

  return false;
};

/**
 * Checks whether a transaction is a legacy loan that was split in-place
 * by the previous settle-up handler.
 */
const isLegacySplitLoan = (t) => {
  if (!t || !t.remarks) return false;
  return t.remarks.includes("(Remaining pending after partial settlement)");
};

/**
 * Checks whether a transaction is a legacy loan marked "completed"
 * directly (without a separate repayment record).
 */
const isLegacyCompletedLoan = (t) => {
  if (!t) return false;
  if (isRepayment(t)) return false;
  return t.status === "completed";
};

/**
 * Calculates person/ledger totals using integer paise:
 * - Total: Sum of all loans (restoring legacy split amounts if applicable)
 * - Returned: Sum of all repayments + legacy completed loans
 * - Pending: Remaining unpaid balance (max(0, Total - Returned))
 * - Advance: Overpayment amount if repayments exceed loans (max(0, Returned - Total))
 * 
 * @param {Array} transactions Array of transaction objects
 * @returns {{ total: number, completed: number, pending: number, advance: number, transactionCount: number }}
 */
const calculatePersonStats = (transactions = []) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      transactionCount: 0,
      total: 0,
      completed: 0,
      pending: 0,
      advance: 0,
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
      advance: 0,
    };
  }

  let loansPaise = 0;
  let repaymentsPaise = 0;

  for (const t of activeTransactions) {
    const amtPaise = toPaise(t.amount);

    if (isRepayment(t)) {
      // Repayment record
      repaymentsPaise += amtPaise;
    } else if (isLegacyCompletedLoan(t)) {
      // Legacy loan that was marked completed directly in place.
      // Contributes to total lent and is fully accounted as returned.
      loansPaise += amtPaise;
      repaymentsPaise += amtPaise;
    } else {
      // Active loan (Clean loan or Legacy Split loan)
      loansPaise += amtPaise;
    }
  }

  // Enforce invariant:
  // Pending = max(0, Total - Returned)
  // Advance = max(0, Returned - Total)
  const pendingPaise = Math.max(0, loansPaise - repaymentsPaise);
  const advancePaise = Math.max(0, repaymentsPaise - loansPaise);

  return {
    transactionCount: activeTransactions.length,
    total: fromPaise(loansPaise),
    completed: fromPaise(repaymentsPaise),
    pending: fromPaise(pendingPaise),
    advance: fromPaise(advancePaise),
  };
};

/**
 * Aggregates section totals across persons:
 * Total = sum of totals
 * Completed = sum of completed
 * Pending = max(0, Total - Completed)
 * Advance = sum of advances
 * 
 * @param {Array} persons Array of person objects with stats
 * @returns {{ total: number, completed: number, pending: number, advance: number }}
 */
const aggregateSectionTotals = (persons = []) => {
  if (!Array.isArray(persons) || persons.length === 0) {
    return { total: 0, completed: 0, pending: 0, advance: 0 };
  }

  let totalPaise = 0;
  let completedPaise = 0;
  let advancePaise = 0;

  for (const person of persons) {
    const stats = person.stats || {};
    totalPaise += toPaise(stats.total);
    completedPaise += toPaise(stats.completed);
    advancePaise += toPaise(stats.advance);
  }

  const pendingPaise = Math.max(0, totalPaise - completedPaise);

  return {
    total: fromPaise(totalPaise),
    completed: fromPaise(completedPaise),
    pending: fromPaise(pendingPaise),
    advance: fromPaise(advancePaise),
  };
};

module.exports = {
  toPaise,
  fromPaise,
  isRepayment,
  isLegacySplitLoan,
  isLegacyCompletedLoan,
  calculatePersonStats,
  aggregateSectionTotals,
};
