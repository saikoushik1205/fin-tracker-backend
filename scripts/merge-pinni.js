/**
 * SCRIPT: Merge Pinni(II) into Pinni & Delete Pinni(II)
 * 
 * Target Person:
 *   Name:  Pinni
 *   Email: polalavanya2@gmail.com
 *   Phone: 9492176468
 * 
 * Source Person to Delete:
 *   Name:  Pinni(II)
 *   Phone: 9492169673
 * 
 * 14 Transactions to add/transfer (Total: Rs. 7,030.00):
 *   1. 30/8/2026 - Rs. 460 - "Shampoo's"
 *   2. 28/8/2026 - Rs. 704 - "Sweets+Rakhi's nanamma order"
 *   3. 17/8/2026 - Rs. 316 - "Babai Amazon Pay"
 *   4. 26/7/2026 - Rs. 250 - "Mamaearth facewash"
 *   5. 22/7/2026 - Rs. 398 - "Blinkit Bodywash-2"
 *   6. 21/7/2026 - Rs. 636 - "Oil - 3 Liters"
 *   7. 17/7/2026 - Rs. 186 - "Urban Company Pass - 17/07"
 *   8. 06/7/2026 - Rs. 1,480 - "Rain Coats - Order"
 *   9. 03/7/2026 - Rs. 700 - "Cash Given For Online Transfer"
 *  10. 02/7/2026 - Rs. 104 - "Flipkart Order"
 *  11. 01/7/2026 - Rs. 820 - "No-Broker Washroom Cleaning"
 *  12. 28/6/2026 - Rs. 380 - "Atiksh Nandhan Basket"
 *  13. 28/6/2026 - Rs. 196 - "Urban Company"
 *  14. 18/6/2026 - Rs. 400 - "Balance From Previous Order's From Zomato As On 18 June"
 * 
 * Usage:
 *   node scripts/merge-pinni.js
 *   node scripts/merge-pinni.js "<YOUR_MONGODB_URI>"
 */

const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Person = require("../src/models/Person");
const Transaction = require("../src/models/Transaction");
const User = require("../src/models/User");
const { calculatePersonStats } = require("../src/utils/moneyCalculator");

const TRANSACTIONS_DATA = [
  {
    date: new Date("2026-08-30T10:00:00.000Z"),
    amount: 460,
    status: "pending",
    type: "loan",
    remarks: "Shampoo's",
  },
  {
    date: new Date("2026-08-28T10:00:00.000Z"),
    amount: 704,
    status: "pending",
    type: "loan",
    remarks: "Sweets+Rakhi's nanamma order",
  },
  {
    date: new Date("2026-08-17T10:00:00.000Z"),
    amount: 316,
    status: "pending",
    type: "loan",
    remarks: "Babai Amazon Pay",
  },
  {
    date: new Date("2026-07-26T10:00:00.000Z"),
    amount: 250,
    status: "pending",
    type: "loan",
    remarks: "Mamaearth facewash",
  },
  {
    date: new Date("2026-07-22T10:00:00.000Z"),
    amount: 398,
    status: "pending",
    type: "loan",
    remarks: "Blinkit Bodywash-2",
  },
  {
    date: new Date("2026-07-21T10:00:00.000Z"),
    amount: 636,
    status: "pending",
    type: "loan",
    remarks: "Oil - 3 Liters",
  },
  {
    date: new Date("2026-07-17T10:00:00.000Z"),
    amount: 186,
    status: "pending",
    type: "loan",
    remarks: "Urban Company Pass - 17/07",
  },
  {
    date: new Date("2026-07-06T10:00:00.000Z"),
    amount: 1480,
    status: "pending",
    type: "loan",
    remarks: "Rain Coats - Order",
  },
  {
    date: new Date("2026-07-03T10:00:00.000Z"),
    amount: 700,
    status: "pending",
    type: "loan",
    remarks: "Cash Given For Online Transfer",
  },
  {
    date: new Date("2026-07-02T10:00:00.000Z"),
    amount: 104,
    status: "pending",
    type: "loan",
    remarks: "Flipkart Order",
  },
  {
    date: new Date("2026-07-01T10:00:00.000Z"),
    amount: 820,
    status: "pending",
    type: "loan",
    remarks: "No-Broker Washroom Cleaning",
  },
  {
    date: new Date("2026-06-28T10:00:00.000Z"),
    amount: 380,
    status: "pending",
    type: "loan",
    remarks: "Atiksh Nandhan Basket",
  },
  {
    date: new Date("2026-06-28T10:00:00.000Z"),
    amount: 196,
    status: "pending",
    type: "loan",
    remarks: "Urban Company",
  },
  {
    date: new Date("2026-06-18T10:00:00.000Z"),
    amount: 400,
    status: "pending",
    type: "loan",
    remarks: "Balance From Previous Order's From Zomato As On 18 June",
  },
];

async function mergePinni() {
  const uri = process.argv[2] || process.env.MONGO_URI || "mongodb://localhost:27017/fintrack";
  console.log("================================================================================");
  console.log("            FINTRACK: MERGE Pinni(II) INTO Pinni & DELETE Pinni(II)             ");
  console.log("================================================================================");
  console.log(`Connecting to database: ${uri.replace(/:[^:]+@/, ":<credentials>@")}`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB successfully.\n");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    console.log("\nUsage hint:");
    console.log('  node scripts/merge-pinni.js "<YOUR_MONGODB_URI>"\n');
    process.exit(1);
  }

  try {
    // 1. Locate User (find the user that owns Pinni or the active user)
    let user = null;
    const existingPerson = await Person.findOne({
      $or: [
        { name: "Pinni(II)" },
        { phone: "9492169673" },
        { name: "Pinni" },
        { phone: "9492176468" },
        { email: "polalavanya2@gmail.com" },
      ],
    });

    if (existingPerson) {
      user = await User.findById(existingPerson.userId);
    }
    if (!user) {
      user = await User.findOne({ isActive: true });
    }

    if (!user) {
      console.error("No active user found in database!");
      process.exit(1);
    }

    console.log(`Operating under User: ${user.displayName || user.email} (ID: ${user._id})\n`);

    // 2. Find or Create Target Person "Pinni"
    let targetPerson = await Person.findOne({
      userId: user._id,
      sectionType: "lending",
      $or: [
        { name: "Pinni" },
        { phone: "9492176468" },
        { email: "polalavanya2@gmail.com" },
      ],
    });

    if (!targetPerson) {
      console.log('Creating target person "Pinni"...');
      targetPerson = await Person.create({
        userId: user._id,
        name: "Pinni",
        email: "polalavanya2@gmail.com",
        phone: "9492176468",
        sectionType: "lending",
        isActive: true,
      });
      console.log(`Created Pinni successfully (ID: ${targetPerson._id})`);
    } else {
      console.log(`Found existing target person "Pinni" (ID: ${targetPerson._id})`);
      targetPerson.name = "Pinni";
      targetPerson.email = "polalavanya2@gmail.com";
      targetPerson.phone = "9492176468";
      targetPerson.isActive = true;
      await targetPerson.save();
      console.log(`Updated details: email=polalavanya2@gmail.com, phone=9492176468`);
    }

    // 3. Find Source Person "Pinni(II)"
    const sourcePerson = await Person.findOne({
      userId: user._id,
      $or: [
        { name: "Pinni(II)" },
        { phone: "9492169673" },
      ],
    });

    let movedCount = 0;
    if (sourcePerson) {
      console.log(`\nFound source person "Pinni(II)" (ID: ${sourcePerson._id}, phone: ${sourcePerson.phone})`);

      // Check if Pinni(II) has existing transactions in DB
      const sourceTx = await Transaction.find({ personId: sourcePerson._id });
      console.log(`Pinni(II) has ${sourceTx.length} existing transactions in DB.`);

      if (sourceTx.length > 0) {
        // Move all existing transactions to Pinni
        const moveResult = await Transaction.updateMany(
          { personId: sourcePerson._id },
          { $set: { personId: targetPerson._id } }
        );
        movedCount = moveResult.modifiedCount;
        console.log(`Moved ${movedCount} existing transactions from Pinni(II) to Pinni.`);
      }

      // Delete Pinni(II)
      sourcePerson.isActive = false;
      await sourcePerson.save();
      console.log(`Soft-deleted Pinni(II) (isActive set to false).`);
    } else {
      console.log('Source person "Pinni(II)" not found in DB (already removed or not yet saved).');
    }

    // 4. Ensure all 14 transactions from PDF exist in Pinni's ledger
    console.log("\nVerifying/Inserting the 14 transactions from the PDF statement into Pinni...");
    let addedCount = 0;
    let existingCount = 0;

    for (const txData of TRANSACTIONS_DATA) {
      // Check if this exact transaction already exists under Pinni
      const existing = await Transaction.findOne({
        personId: targetPerson._id,
        amount: txData.amount,
        remarks: txData.remarks,
        status: { $ne: "cancelled" },
      });

      if (!existing) {
        await Transaction.create({
          personId: targetPerson._id,
          userId: user._id,
          date: txData.date,
          amount: txData.amount,
          remarks: txData.remarks,
          status: txData.status,
          type: txData.type,
          metadata: {},
        });
        addedCount++;
        console.log(`  + Inserted: ${txData.date.toISOString().slice(0, 10)} | Rs. ${txData.amount} | "${txData.remarks}"`);
      } else {
        existingCount++;
        console.log(`  = Already present: Rs. ${txData.amount} | "${txData.remarks}"`);
      }
    }

    console.log(`\nTransaction sync result: ${addedCount} newly added, ${existingCount} already present.`);

    // 5. Compute Final Pinni Stats
    const allPinniTransactions = await Transaction.find({
      personId: targetPerson._id,
      status: { $ne: "cancelled" },
    }).sort({ date: 1 });

    const stats = calculatePersonStats(allPinniTransactions);

    console.log("================================================================================");
    console.log("                         PINNI UPDATED FINANCIAL SUMMARY                        ");
    console.log("================================================================================");
    console.log(`Person:              Pinni`);
    console.log(`Email:               ${targetPerson.email}`);
    console.log(`Phone:               ${targetPerson.phone}`);
    console.log(`Total Transactions:  ${allPinniTransactions.length}`);
    console.log(`Total Lent:          Rs. ${stats.total.toLocaleString("en-IN")}`);
    console.log(`Total Returned:      Rs. ${stats.completed.toLocaleString("en-IN")}`);
    console.log(`Pending Receivable:  Rs. ${stats.pending.toLocaleString("en-IN")}`);
    if (stats.advance > 0) {
      console.log(`Advance:             Rs. ${stats.advance.toLocaleString("en-IN")}`);
    }
    console.log("================================================================================");
    console.log("SUCCESS: Pinni(II) deleted and all transactions consolidated into Pinni.");
    console.log("================================================================================");
  } catch (err) {
    console.error("Error during merge:", err);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  mergePinni();
}

module.exports = {
  mergePinni,
  TRANSACTIONS_DATA,
};
