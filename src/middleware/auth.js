const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verify JWT Token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
      });
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

/**
 * Generate JWT token (optional, for additional security)
 */
const generateJWT = (user) => {
  return jwt.sign(
    {
      id: user._id,
      uid: user.uid,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Verify JWT token (if using dual authentication)
 */
const verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.uid = decoded.uid;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};

/**
 * Check if user has access to Interest section
 */
const checkInterestAccess = (req, res, next) => {
  const allowedEmail = "koushiksai242@gmail.com";

  if (req.user.email !== allowedEmail) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied. Interest section is not available for your account.",
    });
  }

  next();
};

module.exports = {
  verifyToken,
  checkInterestAccess,
};
