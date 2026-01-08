const mongoose = require("mongoose");

const cashBankSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    cash: {
      type: Number,
      default: 0,
      min: 0,
    },
    bank: {
      type: Number,
      default: 0,
      min: 0,
    },
    history: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ["cash", "bank"],
        },
        previousAmount: Number,
        newAmount: Number,
        change: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CashBank", cashBankSchema);
