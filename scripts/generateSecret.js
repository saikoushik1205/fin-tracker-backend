const crypto = require("crypto");

/**
 * Generate a secure JWT secret
 * Run this script: node backend/scripts/generateSecret.js
 */

const generateSecret = () => {
  return crypto.randomBytes(64).toString("hex");
};

console.log(
  "\n╔════════════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║                  🔐 JWT Secret Generator                               ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════════════╝\n"
);

console.log("Your new JWT Secret:");
console.log(
  "─────────────────────────────────────────────────────────────────────────"
);
console.log(generateSecret());
console.log(
  "─────────────────────────────────────────────────────────────────────────\n"
);

console.log("📝 Copy this value to your .env file as JWT_SECRET");
console.log("⚠️  IMPORTANT: Never commit this secret to version control!\n");
console.log("Example .env entry:");
console.log("JWT_SECRET=<paste_the_generated_secret_here>\n");
