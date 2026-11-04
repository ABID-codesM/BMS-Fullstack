import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

// Middleware
import { authenticateToken } from "./middleware/authMiddleware.js";
// Routers
import buildingRoutes from "./routes/buildingRoutes.js";

import rentalRoutes from "./routes/rentalRoutes.js";
import tenant_payment from "./routes/tenant-paymentsRoutes.js";
import rental_services from "./routes/rental-servicesRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import publicRentalRoutes from "./routes/publicRentalRoutes.js";
import employeesRoutes from "./routes/employeesRoutes.js";
import tenantRoutetes from "./routes/tenantsRoutes.js";
import userRoutes from "./routes/usersRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import { authenticateUser, requireRole } from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

// app.use(
//   cors({
//     //origin: "http://localhost:5173",
//     //origin: ["http://localhost:5173", "http://192.168.43.152:5173"],
//     origin: true,
//     Credential: true,
//   }),
// );
app.use(cors());

app.use(express.json());
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  console.log(req.originalUrl);
  next();
});

//Test Route
app.get("/", (req, res) => {
  res.send("Building Management System Backend is Running!");
});

// API routess
// building Routes

app.use(
  "/api/manager",
  authenticateUser,
  requireRole("Building Manager"),
  managerRoutes,
);

app.use("/api/buildings", authenticateToken, buildingRoutes);
app.use("/api/employees", authenticateToken, employeesRoutes);
app.use("/api/tenants", authenticateToken, tenantRoutetes);
app.use("/api/users", authenticateToken, userRoutes);

// ================= CURRENCY API =================

// GET: Get all currencies
app.get("/api/currencies", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT currency_id, currency_caption
      FROM currency
      ORDER BY currency_id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching currencies:", error.message);

    res.status(500).json({
      message: "Failed to fetch currencies",
    });
  }
});

// GET: Get one currency
app.get("/api/currencies/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid currency ID",
      });
    }

    const result = await db.query(
      `SELECT currency_id, currency_caption
       FROM currency
       WHERE currency_id = $1`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Currency not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching currency:", error.message);

    res.status(500).json({
      message: "Failed to fetch currency",
    });
  }
});

// POST: Create currency
app.post("/api/currencies", authenticateToken, async (req, res) => {
  try {
    const { currency_caption } = req.body;

    if (typeof currency_caption !== "string" || !currency_caption.trim()) {
      return res.status(400).json({
        message: "Currency caption is required",
      });
    }

    const result = await db.query(
      `INSERT INTO currency (currency_caption)
       VALUES ($1)
       RETURNING *`,
      [currency_caption.trim()],
    );

    res.status(201).json({
      message: "Currency created successfully",
      currency: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating currency:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This currency already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create currency",
    });
  }
});

// PUT: Update currency
app.put("/api/currencies/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { currency_caption } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid currency ID",
      });
    }

    if (typeof currency_caption !== "string" || !currency_caption.trim()) {
      return res.status(400).json({
        message: "Currency caption is required",
      });
    }

    const result = await db.query(
      `UPDATE currency
       SET currency_caption = $1
       WHERE currency_id = $2
       RETURNING *`,
      [currency_caption.trim(), Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Currency not found",
      });
    }

    res.status(200).json({
      message: "Currency updated successfully",
      currency: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating currency:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This currency already exists",
      });
    }

    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "This currency is referenced by conversion records and cannot be changed in this operation.",
      });
    }

    res.status(500).json({
      message: "Failed to update currency",
    });
  }
});

// DELETE: Delete currency
app.delete("/api/currencies/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid currency ID",
      });
    }

    const result = await db.query(
      `DELETE FROM currency
       WHERE currency_id = $1
       RETURNING *`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Currency not found",
      });
    }

    res.status(200).json({
      message: "Currency deleted successfully",
      currency: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting currency:", error.message);

    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Cannot delete this currency because currency conversion records reference it.",
      });
    }

    res.status(500).json({
      message: "Failed to delete currency",
    });
  }
});

// ================= CURRENCY CONVERSION API =================

// GET: Get all currency conversions
app.get("/api/currency-conversions", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        cc.currency_con_id,
        cc.tenant_id,
        t.tenant_name,
        cc.transaction_date,
        cc.from_currency_id,
        fc.currency_caption AS from_currency,
        cc.rate,
        cc.to_currency_id,
        tc.currency_caption AS to_currency,
        cc.amount
      FROM currency_convert cc
      JOIN tenant t
        ON cc.tenant_id = t.tenant_id
      JOIN currency fc
        ON cc.from_currency_id = fc.currency_id
      JOIN currency tc
        ON cc.to_currency_id = tc.currency_id
      ORDER BY cc.currency_con_id DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching currency conversions:", error.message);

    res.status(500).json({
      message: "Failed to fetch currency conversions",
    });
  }
});

// GET: Get one currency conversion
app.get(
  "/api/currency-conversions/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          message: "Invalid conversion ID",
        });
      }

      const result = await db.query(
        `
      SELECT
        cc.currency_con_id,
        cc.tenant_id,
        t.tenant_name,
        cc.transaction_date,
        cc.from_currency_id,
        fc.currency_caption AS from_currency,
        cc.rate,
        cc.to_currency_id,
        tc.currency_caption AS to_currency,
        cc.amount
      FROM currency_convert cc
      JOIN tenant t
        ON cc.tenant_id = t.tenant_id
      JOIN currency fc
        ON cc.from_currency_id = fc.currency_id
      JOIN currency tc
        ON cc.to_currency_id = tc.currency_id
      WHERE cc.currency_con_id = $1
      `,
        [Number(id)],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Currency conversion not found",
        });
      }

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching currency conversion:", error.message);

      res.status(500).json({
        message: "Failed to fetch currency conversion",
      });
    }
  },
);

// POST: Create currency conversion
app.post("/api/currency-conversions", authenticateToken, async (req, res) => {
  try {
    const {
      tenant_id,
      transaction_date,
      from_currency_id,
      rate,
      to_currency_id,
      amount,
    } = req.body;

    // Required fields
    if (
      tenant_id === undefined ||
      from_currency_id === undefined ||
      to_currency_id === undefined ||
      rate === undefined ||
      amount === undefined
    ) {
      return res.status(400).json({
        message:
          "tenant_id, from_currency_id, to_currency_id, rate and amount are required",
      });
    }

    // Validate IDs
    const tenantId = Number(tenant_id);
    const fromId = Number(from_currency_id);
    const toId = Number(to_currency_id);

    if (
      !Number.isSafeInteger(tenantId) ||
      tenantId <= 0 ||
      !Number.isSafeInteger(fromId) ||
      fromId <= 0 ||
      !Number.isSafeInteger(toId) ||
      toId <= 0
    ) {
      return res.status(400).json({
        message: "IDs must be positive integers",
      });
    }

    // Validate rate and amount
    const conversionRate = Number(rate);
    const conversionAmount = Number(amount);

    if (
      !Number.isFinite(conversionRate) ||
      conversionRate <= 0 ||
      !Number.isFinite(conversionAmount) ||
      conversionAmount <= 0
    ) {
      return res.status(400).json({
        message: "Rate and amount must be greater than zero",
      });
    }

    // Currency IDs must differ
    if (fromId === toId) {
      return res.status(400).json({
        message: "Source and target currencies must be different",
      });
    }

    // Validate optional date
    let transactionDate = transaction_date ?? null;

    if (transactionDate !== null) {
      if (
        typeof transactionDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
        !Number.isFinite(Date.parse(transactionDate)) ||
        new Date(transactionDate).toISOString().slice(0, 10) !== transactionDate
      ) {
        return res.status(400).json({
          message: "transaction_date must be a valid YYYY-MM-DD date",
        });
      }
    }

    const result = await db.query(
      `
      INSERT INTO currency_convert
        (
          tenant_id,
          transaction_date,
          from_currency_id,
          rate,
          to_currency_id,
          amount
        )
      VALUES
        ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6)
      RETURNING *
      `,
      [
        tenantId,
        transactionDate,
        fromId,
        conversionRate,
        toId,
        conversionAmount,
      ],
    );

    res.status(201).json({
      message: "Currency conversion created successfully",
      conversion: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating currency conversion:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Tenant or currency ID does not exist in the database",
      });
    }

    if (error.code === "23514" || error.code === "22007") {
      return res.status(400).json({
        message: "Invalid conversion data",
      });
    }

    res.status(500).json({
      message: "Failed to create currency conversion",
    });
  }
});

// PUT: Update currency conversion
app.put(
  "/api/currency-conversions/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          message: "Invalid conversion ID",
        });
      }

      const {
        tenant_id,
        transaction_date,
        from_currency_id,
        rate,
        to_currency_id,
        amount,
      } = req.body;

      if (
        tenant_id === undefined ||
        from_currency_id === undefined ||
        to_currency_id === undefined ||
        rate === undefined ||
        amount === undefined
      ) {
        return res.status(400).json({
          message:
            "tenant_id, from_currency_id, to_currency_id, rate and amount are required",
        });
      }

      const tenantId = Number(tenant_id);
      const fromId = Number(from_currency_id);
      const toId = Number(to_currency_id);
      const conversionRate = Number(rate);
      const conversionAmount = Number(amount);

      if (
        !Number.isSafeInteger(tenantId) ||
        tenantId <= 0 ||
        !Number.isSafeInteger(fromId) ||
        fromId <= 0 ||
        !Number.isSafeInteger(toId) ||
        toId <= 0
      ) {
        return res.status(400).json({
          message: "IDs must be positive integers",
        });
      }

      if (
        !Number.isFinite(conversionRate) ||
        conversionRate <= 0 ||
        !Number.isFinite(conversionAmount) ||
        conversionAmount <= 0
      ) {
        return res.status(400).json({
          message: "Rate and amount must be greater than zero",
        });
      }

      if (fromId === toId) {
        return res.status(400).json({
          message: "Source and target currencies must be different",
        });
      }

      let transactionDate = transaction_date ?? null;

      if (transactionDate !== null) {
        if (
          typeof transactionDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
          !Number.isFinite(Date.parse(transactionDate)) ||
          new Date(transactionDate).toISOString().slice(0, 10) !==
            transactionDate
        ) {
          return res.status(400).json({
            message: "transaction_date must be a valid YYYY-MM-DD date",
          });
        }
      }

      const result = await db.query(
        `
      UPDATE currency_convert
      SET
        tenant_id = $1,
        transaction_date = COALESCE($2::date, CURRENT_DATE),
        from_currency_id = $3,
        rate = $4,
        to_currency_id = $5,
        amount = $6
      WHERE currency_con_id = $7
      RETURNING *
      `,
        [
          tenantId,
          transactionDate,
          fromId,
          conversionRate,
          toId,
          conversionAmount,
          Number(id),
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Currency conversion not found",
        });
      }

      res.status(200).json({
        message: "Currency conversion updated successfully",
        conversion: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating currency conversion:", error.message);

      if (error.code === "23503") {
        return res.status(400).json({
          message: "Tenant or currency ID does not exist in the database",
        });
      }

      if (error.code === "23514" || error.code === "22007") {
        return res.status(400).json({
          message: "Invalid conversion data",
        });
      }

      res.status(500).json({
        message: "Failed to update currency conversion",
      });
    }
  },
);

// DELETE: Delete currency conversion
app.delete(
  "/api/currency-conversions/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          message: "Invalid conversion ID",
        });
      }

      const result = await db.query(
        `
      DELETE FROM currency_convert
      WHERE currency_con_id = $1
      RETURNING *
      `,
        [Number(id)],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Currency conversion not found",
        });
      }

      res.status(200).json({
        message: "Currency conversion deleted successfully",
        conversion: result.rows[0],
      });
    } catch (error) {
      console.error("Error deleting currency conversion:", error.message);

      res.status(500).json({
        message: "Failed to delete currency conversion",
      });
    }
  },
);

// rental Routes
app.use("/api/rentals", authenticateToken, rentalRoutes);
app.use("/api/tenant-payments", authenticateToken, tenant_payment);
app.use("/api/rental-services", authenticateToken, rental_services);
app.use("/api/salaries", authenticateToken, salaryRoutes);
app.use("/api/public-rentals", publicRentalRoutes);

// Database Connection
async function startServer() {
  try {
    await db.connect();
    console.log("PostgresSQL Database Connected SuccessFully!");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database Connection Failed: ", error.message);
  }
}

startServer();
