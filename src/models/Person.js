const mongoose = require("mongoose");

const personSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    sectionType: {
      type: String,
      required: true,
      enum: ["lending", "borrowing", "earnings", "expenses", "interest"],
    },
    metadata: {
      category: String, // For expenses/earnings
      notes: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries and uniqueness
personSchema.index({ userId: 1, sectionType: 1 });
personSchema.index({ userId: 1, name: 1, sectionType: 1 }, { unique: true });

module.exports = mongoose.model("Person", personSchema);
