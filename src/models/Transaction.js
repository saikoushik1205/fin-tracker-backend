const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "partial", "cancelled"],
      default: "completed",
    },
    type: {
      type: String,
      trim: true,
      default: "", // Can be used for sub-categorization
    },
    metadata: {
      interestRate: Number, // For interest section
      principal: Number,
      category: String,
      paymentMethod: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ personId: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
