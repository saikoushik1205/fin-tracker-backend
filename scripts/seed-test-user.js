const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Simple User schema for seeding
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  displayName: String,
  photoURL: String,
  isActive: Boolean,
  lastLogin: Date,
});

const User = mongoose.model("User", userSchema);

async function seedTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/fintrack"
    );
    console.log("✅ Connected to MongoDB");

    // Check if test user already exists
    const existingUser = await User.findOne({ email: "test@fintrack.com" });

    if (existingUser) {
      console.log("⚠️  Test user already exists!");
      console.log("\n📧 Test Credentials:");
      console.log("   Email: test@fintrack.com");
      console.log("   Password: Test@123");
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Test@123", salt);

    // Create test user
    const testUser = await User.create({
      email: "test@fintrack.com",
      password: hashedPassword,
      displayName: "Test User",
      photoURL: "",
      isActive: true,
      lastLogin: new Date(),
    });

    console.log("✅ Test user created successfully!");
    console.log("\n🎉 You can now login with:");
    console.log("   Email: test@fintrack.com");
    console.log("   Password: Test@123");
    console.log("\n💡 Access the app at: http://localhost:4200");

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

seedTestUser();
