import express from "express";
import db from "../db.js";

const router = express.Router();

// ======================================
// Helper Functions
// ======================================

// Validate positive integer ID
function isValidId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

// Validate YYYY-MM-DD date
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// ======================================
// GET: All Salaries
// ======================================

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        s.sal_id,
        s.eid,
        e.ename,
        s.amount,
        s.bonus,
        s.month_of_payment,
        s.payment_date,
        s.paid,
        s.balance
      FROM salary s
      JOIN emp e ON s.eid = e.eid
      ORDER BY s.sal_id DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get salaries error:", error.message);

    res.status(500).json({
      message: "Failed to retrieve salaries.",
    });
  }
});

// ======================================
// GET: One Salary
// ======================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid salary ID.",
      });
    }

    const result = await db.query(
      `
      SELECT
        s.sal_id,
        s.eid,
        e.ename,
        s.amount,
        s.bonus,
        s.month_of_payment,
        s.payment_date,
        s.paid,
        s.balance
      FROM salary s
      JOIN emp e ON s.eid = e.eid
      WHERE s.sal_id = $1
      `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get salary error:", error.message);

    res.status(500).json({
      message: "Failed to retrieve salary.",
    });
  }
});

// ======================================
// POST: Create Salary
// ======================================

router.post("/", async (req, res) => {
  try {
    const {
      eid,
      amount,
      bonus = 0,
      month_of_payment,
      payment_date = null,
      paid = 0,
    } = req.body;

    if (eid === undefined || amount === undefined || !month_of_payment) {
      return res.status(400).json({
        message: "Employee, amount and payment month are required.",
      });
    }

    const employeeId = Number(eid);
    const salaryAmount = Number(amount);
    const salaryBonus = Number(bonus);
    const paidAmount = Number(paid);

    if (
      !Number.isSafeInteger(employeeId) ||
      employeeId <= 0 ||
      !Number.isFinite(salaryAmount) ||
      !Number.isFinite(salaryBonus) ||
      !Number.isFinite(paidAmount) ||
      salaryAmount < 0 ||
      salaryBonus < 0 ||
      paidAmount < 0 ||
      paidAmount > salaryAmount + salaryBonus
    ) {
      return res.status(400).json({
        message: "Invalid salary amounts or employee ID.",
      });
    }

    if (!isValidDate(month_of_payment)) {
      return res.status(400).json({
        message: "Payment month must be a valid YYYY-MM-DD date.",
      });
    }

    if (payment_date !== null && !isValidDate(payment_date)) {
      return res.status(400).json({
        message: "Payment date must be a valid YYYY-MM-DD date or null.",
      });
    }

    const employeeCheck = await db.query("SELECT eid FROM emp WHERE eid = $1", [
      employeeId,
    ]);

    if (employeeCheck.rows.length === 0) {
      return res.status(400).json({
        message: "The specified employee does not exist.",
      });
    }

    const result = await db.query(
      `
      INSERT INTO salary (
        eid,
        amount,
        bonus,
        month_of_payment,
        payment_date,
        paid
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        employeeId,
        salaryAmount,
        salaryBonus,
        month_of_payment,
        payment_date,
        paidAmount,
      ],
    );
    // const balance = Number(
    //   (salaryAmount + salaryBonus - paidAmount).toFixed(2),
    // );

    // const result = await db.query(
    //   `
    //   INSERT INTO salary (
    //     eid,
    //     amount,
    //     bonus,
    //     month_of_payment,
    //     payment_date,
    //     paid,
    //     balance
    //   )
    //   VALUES ($1, $2, $3, $4, $5, $6, $7)
    //   RETURNING *
    //   `,
    //   [
    //     employeeId,
    //     salaryAmount,
    //     salaryBonus,
    //     month_of_payment,
    //     payment_date,
    //     paidAmount,
    //     balance,
    //   ],
    // );

    res.status(201).json({
      message: "Salary record created successfully.",
      salary: result.rows[0],
    });
  } catch (error) {
    console.error("Create salary error:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified employee does not exist.",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Salary for this employee and month already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to create salary record.",
    });
  }
});

// ======================================
// PUT: Update Salary
// ======================================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid salary ID.",
      });
    }

    const {
      eid,
      amount,
      bonus = 0,
      month_of_payment,
      payment_date = null,
      paid = 0,
    } = req.body;

    if (eid === undefined || amount === undefined || !month_of_payment) {
      return res.status(400).json({
        message: "Employee, amount and payment month are required.",
      });
    }

    const employeeId = Number(eid);
    const salaryAmount = Number(amount);
    const salaryBonus = Number(bonus);
    const paidAmount = Number(paid);

    if (
      !Number.isSafeInteger(employeeId) ||
      employeeId <= 0 ||
      !Number.isFinite(salaryAmount) ||
      !Number.isFinite(salaryBonus) ||
      !Number.isFinite(paidAmount) ||
      salaryAmount < 0 ||
      salaryBonus < 0 ||
      paidAmount < 0 ||
      paidAmount > salaryAmount + salaryBonus
    ) {
      return res.status(400).json({
        message: "Invalid salary amounts or employee ID.",
      });
    }

    if (!isValidDate(month_of_payment)) {
      return res.status(400).json({
        message: "Payment month must be a valid YYYY-MM-DD date.",
      });
    }

    if (payment_date !== null && !isValidDate(payment_date)) {
      return res.status(400).json({
        message: "Payment date must be a valid YYYY-MM-DD date or null.",
      });
    }

    // const balance = Number(
    //   (salaryAmount + salaryBonus - paidAmount).toFixed(2),
    // );

    const result = await db.query(
      `
      UPDATE salary
      SET
        eid = $1,
        amount = $2,
        bonus = $3,
        month_of_payment = $4,
        payment_date = $5,
        paid = $6
      
      WHERE sal_id = $7
      RETURNING *
      `,
      [
        employeeId,
        salaryAmount,
        salaryBonus,
        month_of_payment,
        payment_date,
        paidAmount,
        /*balance,*/
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.status(200).json({
      message: "Salary record updated successfully.",
      salary: result.rows[0],
    });
  } catch (error) {
    console.error("Update salary error:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified employee does not exist.",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Salary for this employee and month already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to update salary record.",
    });
  }
});

// ======================================
// DELETE: Salary
// ======================================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid salary ID.",
      });
    }

    const result = await db.query(
      `
      DELETE FROM salary
      WHERE sal_id = $1
      RETURNING sal_id
      `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.status(200).json({
      message: "Salary record deleted successfully.",
    });
  } catch (error) {
    console.error("Delete salary error:", error.message);

    res.status(500).json({
      message: "Failed to delete salary record.",
    });
  }
});

export default router;

/*import express from "express";
import db from "../db.js";

const router = express.Router();

// ===============================
// Salary API
// ===============================

// GET: Get all salaries
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        s.sal_id,
        s.eid,
        e.ename,
        s.amount,
        s.bonus,
        s.month_of_payment,
        s.payment_date,
        s.paid,
        s.balance
      FROM salary s
      JOIN emp e ON s.eid = e.eid
      ORDER BY s.sal_id DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get salaries error:", error.message);

    res.status(500).json({
      message: "Failed to retrieve salaries.",
    });
  }
});

// GET: Get one salary by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "Invalid salary ID.",
      });
    }

    const result = await db.query(
      `
      SELECT
        s.sal_id,
        s.eid,
        e.ename,
        s.amount,
        s.bonus,
        s.month_of_payment,
        s.payment_date,
        s.paid,
        s.balance
      FROM salary s
      JOIN emp e ON s.eid = e.eid
      WHERE s.sal_id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get salary error:", error.message);

    res.status(500).json({
      message: "Failed to retrieve salary.",
    });
  }
});

// POST: Create a new salary record
router.post("/", async (req, res) => {
  try {
    const {
      eid,
      amount,
      bonus = 0,
      month_of_payment,
      payment_date = null,
      paid = 0,
    } = req.body;

    // Required fields
    if (eid === undefined || amount === undefined || !month_of_payment) {
      return res.status(400).json({
        message: "eid, amount and month_of_payment are required.",
      });
    }

    // Validate numeric values
    const employeeId = Number(eid);
    const salaryAmount = Number(amount);
    const salaryBonus = Number(bonus);
    const paidAmount = Number(paid);

    if (
      !Number.isSafeInteger(employeeId) ||
      employeeId <= 0 ||
      !Number.isFinite(salaryAmount) ||
      !Number.isFinite(salaryBonus) ||
      !Number.isFinite(paidAmount) ||
      salaryAmount < 0 ||
      salaryBonus < 0 ||
      paidAmount < 0 ||
      paidAmount > salaryAmount + salaryBonus
    ) {
      return res.status(400).json({
        message: "Invalid employee ID or salary amounts.",
      });
    }

    // Validate month
    if (
      typeof month_of_payment !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(month_of_payment) ||
      !Number.isFinite(Date.parse(month_of_payment)) ||
      new Date(month_of_payment).toISOString().slice(0, 10) !== month_of_payment
    ) {
      return res.status(400).json({
        message: "month_of_payment must be a valid YYYY-MM-DD date.",
      });
    }

    // Validate optional payment date
    if (payment_date !== null) {
      if (
        typeof payment_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payment_date) ||
        !Number.isFinite(Date.parse(payment_date)) ||
        new Date(payment_date).toISOString().slice(0, 10) !== payment_date
      ) {
        return res.status(400).json({
          message: "payment_date must be a valid YYYY-MM-DD date or null.",
        });
      }
    }

    const result = await db.query(
      `
      INSERT INTO salary
        (eid, amount, bonus, month_of_payment, payment_date, paid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        employeeId,
        salaryAmount,
        salaryBonus,
        month_of_payment,
        payment_date,
        paidAmount,
      ],
    );

    res.status(201).json({
      message: "Salary record created successfully.",
      salary: result.rows[0],
    });
  } catch (error) {
    console.error("Create salary error:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified employee does not exist.",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Salary for this employee and month already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to create salary record.",
    });
  }
});

// PUT: Update an existing salary record
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "Invalid salary ID.",
      });
    }

    const {
      eid,
      amount,
      bonus = 0,
      month_of_payment,
      payment_date = null,
      paid = 0,
    } = req.body;

    if (eid === undefined || amount === undefined || !month_of_payment) {
      return res.status(400).json({
        message: "eid, amount and month_of_payment are required.",
      });
    }

    const employeeId = Number(eid);
    const salaryAmount = Number(amount);
    const salaryBonus = Number(bonus);
    const paidAmount = Number(paid);

    if (
      !Number.isSafeInteger(employeeId) ||
      employeeId <= 0 ||
      !Number.isFinite(salaryAmount) ||
      !Number.isFinite(salaryBonus) ||
      !Number.isFinite(paidAmount) ||
      salaryAmount < 0 ||
      salaryBonus < 0 ||
      paidAmount < 0 ||
      paidAmount > salaryAmount + salaryBonus
    ) {
      return res.status(400).json({
        message: "Invalid employee ID or salary amounts.",
      });
    }

    if (
      typeof month_of_payment !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(month_of_payment) ||
      !Number.isFinite(Date.parse(month_of_payment)) ||
      new Date(month_of_payment).toISOString().slice(0, 10) !== month_of_payment
    ) {
      return res.status(400).json({
        message: "month_of_payment must be a valid YYYY-MM-DD date.",
      });
    }

    if (payment_date !== null) {
      if (
        typeof payment_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payment_date) ||
        !Number.isFinite(Date.parse(payment_date)) ||
        new Date(payment_date).toISOString().slice(0, 10) !== payment_date
      ) {
        return res.status(400).json({
          message: "payment_date must be a valid YYYY-MM-DD date or null.",
        });
      }
    }

    const result = await db.query(
      `
      UPDATE salary
      SET
        eid = $1,
        amount = $2,
        bonus = $3,
        month_of_payment = $4,
        payment_date = $5,
        paid = $6
      WHERE sal_id = $7
      RETURNING *
      `,
      [
        employeeId,
        salaryAmount,
        salaryBonus,
        month_of_payment,
        payment_date,
        paidAmount,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.status(200).json({
      message: "Salary record updated successfully.",
      salary: result.rows[0],
    });
  } catch (error) {
    console.error("Update salary error:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified employee does not exist.",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Salary for this employee and month already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to update salary record.",
    });
  }
});

// DELETE: Delete a salary record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "Invalid salary ID.",
      });
    }

    const result = await db.query(
      `
      DELETE FROM salary
      WHERE sal_id = $1
      RETURNING sal_id
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.status(200).json({
      message: "Salary record deleted successfully.",
    });
  } catch (error) {
    console.error("Delete salary error:", error.message);

    res.status(500).json({
      message: "Failed to delete salary record.",
    });
  }
});
export default router;
*/
