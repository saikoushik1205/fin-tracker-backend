/**
 * DRY RUN MIGRATION & LEDGER INSPECTION SCRIPT
 * 
 * STRICTLY READ-ONLY: Does NOT mutate, modify, or delete any data in MongoDB.
 * 
 * Purpose:
 * Inspect all transactions and persons across the database to detect:
 * 1. Legacy completed loans (status: 'completed' without a separate repayment row)
 * 2. Legacy split loans (remarks: '(Remaining pending after partial settlement)')
 * 3. Legacy settlement rows (remarks starting with 'Settlement received' or containing 'Settled via')
 * 4. Ambiguous cases that require manual review
 * 
 * It outputs a detailed Before vs. After comparison for every person.
 * 
 * Database Backup Instructions:
 * Before applying any database updates in the future, take a full backup:
 * - Using mongodump CLI:
 *   mongodump --uri="<YOUR_MONGODB_URI>" --out="./backup-$(date +%Y%m%d_%H%M%S)"
 * - Using MongoDB Atlas UI:
 *   1. Log into cloud.mongodb.com
 *   2. Select your cluster -> Backups tab -> On-Demand Snapshot -> Take Snapshot
 */

const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Ignore if DNS server configuration is restricted
}

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Person = require("../src/models/Person");
const Transaction = require("../src/models/Transaction");
const { toPaise, fromPaise } = require("../src/utils/moneyCalculator");

const formatINR = (val) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(val || 0);
};

// Classification helpers
function classifyTransaction(t) {
  const remarks = (t.remarks || "").trim();
  const type = (t.type || "").trim().toLowerCase();
  const status = (t.status || "").toLowerCase();

  const isLegacyRepaymentRemarks =
    remarks.startsWith("Settlement received") ||
    remarks.includes("Settled via");

  if (type === "repayment") {
    return {
      category: "REPAYMENT_NEW",
      isRepayment: true,
      description: "Clean repayment record (type = repayment)",
    };
  }

  if (isLegacyRepaymentRemarks && (status === "completed" || type === "")) {
    return {
      category: "REPAYMENT_LEGACY",
      isRepayment: true,
      description: "Legacy settlement record identified by remarks ('Settlement received' / 'Settled via')",
    };
  }

  if (remarks.includes("(Remaining pending after partial settlement)")) {
    return {
      category: "LOAN_LEGACY_SPLIT",
      isRepayment: false,
      isAmbiguous: true,
      description: "Legacy split loan (original amount was reduced in-place by old settle-up handler)",
    };
  }

  if (status === "completed" && !isLegacyRepaymentRemarks) {
    return {
      category: "LOAN_LEGACY_COMPLETED",
      isRepayment: false,
      isAmbiguous: true,
      description: "Legacy loan marked completed manually without a corresponding repayment row",
    };
  }

  if (status === "pending") {
    return {
      category: "LOAN_CLEAN",
      isRepayment: false,
      description: "Normal pending loan",
    };
  }

  return {
    category: "AMBIGUOUS",
    isRepayment: false,
    isAmbiguous: true,
    description: `Unclassified transaction (status=${status}, type=${type}, remarks=${remarks})`,
  };
}

// Compute comparison for a list of transactions
function analyzeTransactions(transactions = []) {
  const active = transactions.filter((t) => t.status !== "cancelled");

  // 1. Current / Old calculation
  let oldTotalPaise = 0;
  let oldCompletedPaise = 0;
  let oldPendingPaise = 0;

  for (const t of active) {
    const p = toPaise(t.amount);
    oldTotalPaise += p;
    if (t.status === "completed" || t.status === "partial") {
      oldCompletedPaise += p;
    } else if (t.status === "pending") {
      oldPendingPaise += p;
    }
  }

  let finalOldPending =
    oldTotalPaise > 0
      ? oldCompletedPaise === 0 && oldPendingPaise > 0 && oldPendingPaise < oldTotalPaise
        ? oldTotalPaise - oldCompletedPaise
        : Math.max(0, oldTotalPaise - oldCompletedPaise)
      : 0;
  let finalOldCompleted =
    oldTotalPaise > 0 && oldCompletedPaise === 0 && oldPendingPaise > 0 && oldPendingPaise < oldTotalPaise
      ? oldTotalPaise - oldPendingPaise
      : oldCompletedPaise;

  // 2. Pure Ledger Model (No Legacy Adapter):
  // Total = all non-repayments
  // Returned = all repayments
  // Pending = max(0, Total - Returned)
  let pureTotalPaise = 0;
  let pureReturnedPaise = 0;

  // 3. Adapted Ledger Model (With Legacy Adapter):
  // Recognizes legacy completed loans and legacy split loans
  let adaptedTotalPaise = 0;
  let adaptedReturnedPaise = 0;

  const classifiedRows = [];

  for (const t of active) {
    const classification = classifyTransaction(t);
    const amtPaise = toPaise(t.amount);

    classifiedRows.push({
      id: t._id,
      date: t.date,
      amount: t.amount,
      status: t.status,
      type: t.type,
      remarks: t.remarks,
      classification,
    });

    // Pure calculation
    if (classification.isRepayment) {
      pureReturnedPaise += amtPaise;
    } else {
      pureTotalPaise += amtPaise;
    }

    // Adapted calculation
    if (classification.category === "REPAYMENT_NEW" || classification.category === "REPAYMENT_LEGACY") {
      adaptedReturnedPaise += amtPaise;
    } else if (classification.category === "LOAN_LEGACY_COMPLETED") {
      // In legacy, this loan was marked completed directly without a repayment row.
      // In adapted ledger: counts toward Total loan, and counts as returned to preserve historical settled state.
      adaptedTotalPaise += amtPaise;
      adaptedReturnedPaise += amtPaise;
    } else {
      // LOAN_CLEAN, LOAN_LEGACY_SPLIT, or AMBIGUOUS loan
      adaptedTotalPaise += amtPaise;
    }
  }

  const purePendingPaise = Math.max(0, pureTotalPaise - pureReturnedPaise);
  const pureAdvancePaise = Math.max(0, pureReturnedPaise - pureTotalPaise);

  const adaptedPendingPaise = Math.max(0, adaptedTotalPaise - adaptedReturnedPaise);
  const adaptedAdvancePaise = Math.max(0, adaptedReturnedPaise - adaptedTotalPaise);

  return {
    oldStats: {
      total: fromPaise(oldTotalPaise),
      completed: fromPaise(finalOldCompleted),
      pending: fromPaise(finalOldPending),
    },
    pureLedgerStats: {
      total: fromPaise(pureTotalPaise),
      returned: fromPaise(pureReturnedPaise),
      pending: fromPaise(purePendingPaise),
      advance: fromPaise(pureAdvancePaise),
    },
    adaptedStats: {
      total: fromPaise(adaptedTotalPaise),
      returned: fromPaise(adaptedReturnedPaise),
      pending: fromPaise(adaptedPendingPaise),
      advance: fromPaise(adaptedAdvancePaise),
    },
    classifiedRows,
  };
}

async function runDryRun() {
  console.log("================================================================================");
  console.log("            FINTRACK LEDGER DRY-RUN MIGRATION & DATA INSPECTION                 ");
  console.log("================================================================================");
  console.log("MODE: READ-ONLY (No documents will be updated or deleted)");
  console.log("--------------------------------------------------------------------------------");
  console.log("BACKUP INSTRUCTIONS BEFORE ANY REAL MIGRATION:");
  console.log("1. MongoDB Atlas UI: Go to Clusters -> Backups -> On-Demand Snapshot.");
  console.log("2. Or CLI command: mongodump --uri=\"<MONGO_URI>\" --out=./backup-fintrack");
  console.log("================================================================================\n");

  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/fintrack";
  console.log(`Connecting to database: ${uri.replace(/:[^:]+@/, ":<credentials>@")} ...`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("Connected to MongoDB successfully.\n");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    console.log("\nIf you are running in an environment without direct MongoDB access,");
    console.log("you can provide a connection URI via: MONGO_URI=\"...\" node scripts/migrate-ledger-dry-run.js");
    process.exit(1);
  }

  try {
    const persons = await Person.find({ isActive: true }).sort({ sectionType: 1, name: 1 });
    console.log(`Found ${persons.length} active persons across all sections.\n`);

    let globalStats = {
      totalPersons: persons.length,
      personsWithDifferences: 0,
      totalLoansClean: 0,
      totalLegacyCompletedLoans: 0,
      totalLegacySplitLoans: 0,
      totalNewRepayments: 0,
      totalLegacyRepayments: 0,
      totalAmbiguousRows: 0,
    };

    for (const person of persons) {
      const transactions = await Transaction.find({ personId: person._id }).sort({ date: 1 });
      const analysis = analyzeTransactions(transactions);

      const hasLegacySplit = analysis.classifiedRows.some((r) => r.classification.category === "LOAN_LEGACY_SPLIT");
      const hasLegacyCompleted = analysis.classifiedRows.some((r) => r.classification.category === "LOAN_LEGACY_COMPLETED");
      const hasLegacyRepayments = analysis.classifiedRows.some((r) => r.classification.category === "REPAYMENT_LEGACY");
      const hasAmbiguous = analysis.classifiedRows.some((r) => r.classification.isAmbiguous);

      // Check if Adapted stats differ from Old stats
      const diffPending = analysis.adaptedStats.pending !== analysis.oldStats.pending;
      const diffTotal = analysis.adaptedStats.total !== analysis.oldStats.total;
      const diffCompleted = analysis.adaptedStats.returned !== analysis.oldStats.completed;
      const hasDiff = diffPending || diffTotal || diffCompleted;

      if (hasDiff) globalStats.personsWithDifferences++;

      // Update counters
      for (const row of analysis.classifiedRows) {
        if (row.classification.category === "LOAN_CLEAN") globalStats.totalLoansClean++;
        if (row.classification.category === "LOAN_LEGACY_COMPLETED") globalStats.totalLegacyCompletedLoans++;
        if (row.classification.category === "LOAN_LEGACY_SPLIT") globalStats.totalLegacySplitLoans++;
        if (row.classification.category === "REPAYMENT_NEW") globalStats.totalNewRepayments++;
        if (row.classification.category === "REPAYMENT_LEGACY") globalStats.totalLegacyRepayments++;
        if (row.classification.category === "AMBIGUOUS") globalStats.totalAmbiguousRows++;
      }

      console.log(`--------------------------------------------------------------------------------`);
      console.log(`PERSON: ${person.name} [Section: ${person.sectionType.toUpperCase()}] (ID: ${person._id})`);
      console.log(`Total Transactions: ${transactions.length}`);

      console.log("\n  [STATS COMPARISON]");
      console.log(`  Current (Old) Stats:        Total: ${formatINR(analysis.oldStats.total)} | Returned: ${formatINR(analysis.oldStats.completed)} | Pending: ${formatINR(analysis.oldStats.pending)}`);
      console.log(`  Pure Ledger (No Adapter):   Total: ${formatINR(analysis.pureLedgerStats.total)} | Returned: ${formatINR(analysis.pureLedgerStats.returned)} | Pending: ${formatINR(analysis.pureLedgerStats.pending)} | Advance: ${formatINR(analysis.pureLedgerStats.advance)}`);
      console.log(`  Adapted Ledger (Recommended): Total: ${formatINR(analysis.adaptedStats.total)} | Returned: ${formatINR(analysis.adaptedStats.returned)} | Pending: ${formatINR(analysis.adaptedStats.pending)} | Advance: ${formatINR(analysis.adaptedStats.advance)}`);

      if (hasDiff) {
        console.log(`  ⚠️  NOTE: Stats differ between Old model and Adapted Ledger.`);
      }

      if (hasAmbiguous) {
        console.log(`  ⚠️  FLAGGED AMBIGUITY: Contains rows requiring manual review!`);
      }

      console.log("\n  [TRANSACTION BREAKDOWN]");
      if (analysis.classifiedRows.length === 0) {
        console.log("  (No transactions)");
      } else {
        for (const row of analysis.classifiedRows) {
          const flag = row.classification.isAmbiguous ? "[FLAG]" : "      ";
          console.log(`  ${flag} ID: ${row.id} | ${row.date ? new Date(row.date).toISOString().slice(0, 10) : "No Date"} | ${formatINR(row.amount).padStart(12)} | Status: ${row.status.padEnd(9)} | Category: ${row.classification.category}`);
          console.log(`         Remarks: "${row.remarks || ""}"`);
          if (row.classification.isAmbiguous) {
            console.log(`         --> AMBIGUITY REASON: ${row.classification.description}`);
          }
        }
      }
      console.log("");
    }

    console.log("================================================================================");
    console.log("                           GLOBAL DRY-RUN SUMMARY                               ");
    console.log("================================================================================");
    console.log(`Total Active Persons:           ${globalStats.totalPersons}`);
    console.log(`Persons with Stat Diffs:        ${globalStats.personsWithDifferences}`);
    console.log(`Clean Loans:                    ${globalStats.totalLoansClean}`);
    console.log(`Legacy Completed Loans:         ${globalStats.totalLegacyCompletedLoans}`);
    console.log(`Legacy Split Loans:             ${globalStats.totalLegacySplitLoans}`);
    console.log(`New Clean Repayments:           ${globalStats.totalNewRepayments}`);
    console.log(`Legacy Settlement Rows:         ${globalStats.totalLegacyRepayments}`);
    console.log(`Ambiguous Rows (Flagged):       ${globalStats.totalAmbiguousRows}`);
    console.log("================================================================================");
    console.log("DRY RUN COMPLETE: Zero data changed.");
    console.log("================================================================================");
  } catch (err) {
    console.error("Dry run execution error:", err);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  runDryRun();
}

module.exports = {
  classifyTransaction,
  analyzeTransactions,
};
