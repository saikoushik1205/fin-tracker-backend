/**
 * SCRIPT: Merge Tatayya(Latest) & Ammama(II) into Tatayya
 * 
 * Target Person:
 *   Name:  Tatayya
 *   Email: pcmouli451@gmail.com
 *   Phone: 9494230451
 * 
 * Sources Deleted:
 *   1. Tatayya(Latest) (5 transactions - Rs. 2,650)
 *   2. Ammama(II) (3 transactions - Rs. 1,040)
 */

const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

const TATAYYA_LATEST_TXS = [
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

const AMMAMA_2_TXS = [
  {
    date: new Date("2026-07-11T10:00:00.000Z"),
    amount: 300,
    status: "pending",
    type: "loan",
    remarks: "Cafe Nilofer Tea Powder",
  },
  {
    date: new Date("2026-07-11T10:00:00.000Z"),
    amount: 350,
    status: "pending",
    type: "loan",
    remarks: "Ajio Order",
  },
  {
    date: new Date("2026-07-11T10:00:00.000Z"),
    amount: 390,
    status: "pending",
    type: "loan",
    remarks: "Sandals Order",
  },
];

module.exports = { TATAYYA_LATEST_TXS, AMMAMA_2_TXS };
