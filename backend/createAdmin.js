import bcrypt from "bcrypt";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

async function createAdmin() {
  try {
    console.log("Starting Admin creation script...");

    // Step 1: Validate environment variables
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email) {
      throw new Error("ADMIN_EMAIL is missing from .env");
    }

    if (!password || password.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
    }

    console.log("Environment variables checked.");

    // Step 2: Connect to PostgreSQL
    console.log("Connecting to PostgreSQL...");

    await db.connect();

    console.log("Database connected successfully!");

    // Step 3: Check whether Admin already exists
    console.log("Checking existing Admin account...");

    const existingAdmin = await db.query(
      `SELECT user_id
       FROM users
       WHERE email = $1`,
      [email],
    );
    console.log("Admin query completed.");

    if (existingAdmin.rows.length > 0) {
      console.log("Admin account already exists.");
      return;
    }

    // Step 4: Hash the password
    console.log("Hashing Admin password...");
return "Hello "
    const passwordHash = await bcrypt.hash(password, 12);

    // Step 5: Create Admin account
    const result = await db.query(
      `INSERT INTO users
        (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, role, is_active`,
      ["System Administrator", email, passwordHash, "Admin", true],
    );

    console.log("Admin account created successfully!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    // Close the database connection
    try {
      await db.end();
      console.log("Database connection closed.");
    } catch (error) {
      console.error("Database closing error:", error.message);
    }
  }
}

createAdmin();
