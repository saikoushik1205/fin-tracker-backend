/**
 * SCRIPT: Merge Tatayya(Latest) into Tatayya & Delete Tatayya(Latest)
 * 
 * Target Person:
 *   Name:  Tatayya
 *   Email: pcmouli451@gmail.com
 *   Phone: 9494230451
 * 
 * Source Person to Delete:
 *   Name:  Tatayya(Latest)
 *   Email: pcmouli451@gmail.com
 *   Phone: 9494230451
 * 
 * 5 Transactions to add/transfer (Total: Rs. 2,650.00):
 *   1. 04/10/2026 - Rs. 1,000 - "Oil- 5ltr"
 *   2. 21/09/2026 - Rs. 540 - "Oil Packets - 4"
 *   3. 20/09/2026 - Rs. 490 - "Wheat - 10Kg"
 *   4. 20/09/2026 - Rs. 300 - "Jaggery"
 *   5. 20/09/2026 - Rs. 320 - "Cafe Niloufer- Tea powder"
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

const TRANSACTIONS_DATA = [
  {
    date: new Date("2026-10-04T10:00:00.000Z"),
    amount: 1000,
    status: "pending",
    type: "loan",
    remarks: "Oil- 5ltr",
  },
  {
    date: new Date("2026-09-21T10:00:00.000Z"),
    amount: 540,
    status: "pending",
    type: "loan",
    remarks: "Oil Packets - 4",
  },
  {
    date: new Date("2026-09-20T10:00:00.000Z"),
    amount: 490,
    status: "pending",
    type: "loan",
    remarks: "Wheat - 10Kg",
  },
  {
    date: new Date("2026-09-20T10:00:00.000Z"),
    amount: 300,
    status: "pending",
    type: "loan",
    remarks: "Jaggery",
  },
  {
    date: new Date("2026-09-20T10:00:00.000Z"),
    amount: 320,
    status: "pending",
    type: "loan",
    remarks: "Cafe Niloufer- Tea powder",
  },
];

module.exports = { TRANSACTIONS_DATA };
