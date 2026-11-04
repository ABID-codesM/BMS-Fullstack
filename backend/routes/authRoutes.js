/*import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

const router = express.Router();

// POST: Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Check JWT secret
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        message: "Server authentication configuration error",
      });
    }

    // 3. Find Admin account
    const result = await db.query(
      `SELECT user_id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [email.trim()],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // 4. Check account status and role
    if (!user.is_active || user.role !== "Admin") {
      return res.status(403).json({
        message: "This account is not authorized to access the Admin panel",
      });
    }

    // 5. Verify password
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 6. Create JWT
    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "2h",
      },
    );

    // 7. Send successful response
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      message: "Login failed because of a server error",
    });
  }
});

export default router;*/

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

const router = express.Router();

// POST: Admin and Building Manager Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // 2. Check JWT secret
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    // 3. Find user
    const result = await db.query(
      `SELECT
          user_id,
          full_name,
          email,
          password_hash,
          role,
          is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    // 4. Check account status
    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account is inactive. Contact the Admin.",
      });
    }

    // 5. Allow only supported roles
    if (!["Admin", "Building Manager"].includes(user.role)) {
      return res.status(403).json({
        message: "Your account role is not authorized.",
      });
    }

    // 6. Verify password
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // 7. Create JWT
    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "2h",
      },
    );

    // 8. Successful response
    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed because of a server error.",
    });
  }
});

export default router;
