/*import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check whether the Authorization header exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Please log in first.",
    });
  }

  // Extract the token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is missing.",
    });
  }

  // Verify the token
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    const decoded = jwt.verify(token, secret);

    // Only Admin accounts are allowed for now
    if (decoded.role !== "Admin") {
      return res.status(403).json({
        message: "Access denied. Admin privileges are required.",
      });
    }

    // Make authenticated user available to the route
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
}*/

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

// ==========================================
// Helper: Verify JWT and check active account
// ==========================================
async function verifyAuthenticatedUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Please log in first.",
    });
  }

  const token = authHeader.slice(7).trim();
  console.log(token);

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is missing.",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (
      !Number.isInteger(decoded.userId) ||
      decoded.userId <= 0 ||
      !["Admin", "Building Manager"].includes(decoded.role)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    // Re-check the account in the database on each protected request
    const result = await db.query(
      `SELECT user_id, role, is_active
       FROM users
       WHERE user_id = $1`,
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "User account no longer exists.",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account is inactive.",
      });
    }

    // Ensure the current database role matches the token
    if (user.role !== decoded.role) {
      return res.status(403).json({
        message: "Your account permissions have changed. Please log in again.",
      });
    }

    req.user = {
      userId: user.user_id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please log in again.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Authentication failed because of a server error.",
    });
  }
}

// ==========================================
// Admin-only middleware
// Existing Admin routes continue using this
// ==========================================
export async function authenticateToken(req, res, next) {
  return verifyAuthenticatedUser(req, res, () => {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access denied. Admin privileges are required.",
      });
    }

    next();
  });
}

// ==========================================
// Admin OR Building Manager authentication
// Use only on routes designed for both roles
// ==========================================
export async function authenticateUser(req, res, next) {
  return verifyAuthenticatedUser(req, res, next);
}

// ==========================================
// Role authorization helper
// Example: requireRole("Admin")
// ==========================================
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication is required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
}
