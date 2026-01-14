require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

/* =========================
   SECURITY MIDDLEWARE
========================= */
// Helmet with relaxed settings
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS - Allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: false,
    maxAge: 86400,
  })
);

// Handle preflight
app.options("*", cors());

/* =========================
   RATE LIMITING
========================= */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});

/* =========================
   BODY PARSERS
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   MONGODB CONNECTION
========================= */
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is not set!");
}

// MongoDB connection with permanent resilience
const connectDB = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 10000,
    retryWrites: true,
    retryReads: true,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
  };

  try {
    await mongoose.connect(MONGO_URI, options);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// MongoDB event listeners for permanent connection monitoring
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
  setTimeout(connectDB, 5000);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected successfully");
});

// Handle process termination gracefully
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed through app termination");
  process.exit(0);
});

// Only connect if MONGO_URI is provided
if (MONGO_URI) {
  connectDB();
} else {
  console.warn("⚠️ Running without database connection");
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FinTrack API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    success: true,
    message: "FinTrack API is running",
    environment: process.env.NODE_ENV || "development",
    database: dbStatusMap[dbStatus] || "unknown",
    dbDetails: {
      status: dbStatusMap[dbStatus],
      host: mongoose.connection.host || "N/A",
      name: mongoose.connection.name || "N/A",
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   DATABASE STATUS CHECK
========================= */
// Middleware to check DB connection on critical routes
const checkDB = (req, res, next) => {
  const dbState = mongoose.connection.readyState;
  // Allow if connected (1) or connecting (2), block only if disconnected (0) or disconnecting (3)
  if (dbState === 0 || dbState === 3) {
    return res.status(503).json({
      success: false,
      message:
        "Database temporarily unavailable. Please try again in a moment.",
    });
  }
  next();
};

/* =========================
   API ROUTES
========================= */
app.use("/api/auth", authLimiter, require("./src/routes/auth"));
app.use("/api/persons", require("./src/routes/persons"));
app.use("/api/transactions", require("./src/routes/transactions"));
app.use("/api/cash-bank", require("./src/routes/cashBank"));
app.use("/api/dashboard", require("./src/routes/dashboard"));

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  // Handle specific MongoDB errors
  if (err.name === "MongooseError" || err.name === "MongoError") {
    return res.status(503).json({
      success: false,
      message: "Database error. Please try again.",
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation error",
    });
  }

  // General error handler
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* =========================
   EXPORT FOR VERCEL
========================= */
module.exports = app;
