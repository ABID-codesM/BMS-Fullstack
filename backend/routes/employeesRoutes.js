import express from "express";
import db from "../db.js";

const router = express.Router();

// ================= EMPLOYEES API =================

// GET: Get all employees
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT eid, ename, nic, job, hire_date, end_date
      FROM emp
      ORDER BY eid
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching employees:", error.message);

    res.status(500).json({
      message: "Failed to fetch employees",
    });
  }
});

// POST: Create employee
router.post("/", async (req, res) => {
  try {
    const {
      ename,
      nic = null,
      job = null,
      hire_date = null,
      end_date = null,
    } = req.body;

    if (typeof ename !== "string" || !ename.trim()) {
      return res.status(400).json({
        message: "Employee name is required",
      });
    }

    if (
      (nic != null && typeof nic !== "string") ||
      (job != null && typeof job !== "string")
    ) {
      return res.status(400).json({
        message: "NIC and job must be strings or null",
      });
    }

    if (
      (hire_date != null &&
        (typeof hire_date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(hire_date))) ||
      (end_date != null &&
        (typeof end_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)))
    ) {
      return res.status(400).json({
        message: "Dates must use YYYY-MM-DD format",
      });
    }

    const result = await db.query(
      `INSERT INTO emp
        (ename, nic, job, hire_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        ename.trim(),
        nic?.trim() || null,
        job?.trim() || null,
        hire_date || null,
        end_date || null,
      ],
    );

    res.status(201).json({
      message: "Employee created successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating employee:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An employee with this NIC already exists",
      });
    }

    if (error.code === "23514" || error.code === "22007") {
      return res.status(400).json({
        message: "Invalid employee data or dates",
      });
    }

    res.status(500).json({
      message: "Failed to create employee",
    });
  }
});

// PUT: Update employee
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const {
      ename,
      nic = null,
      job = null,
      hire_date = null,
      end_date = null,
    } = req.body;

    if (typeof ename !== "string" || !ename.trim()) {
      return res.status(400).json({
        message: "Employee name is required",
      });
    }

    if (
      (nic != null && typeof nic !== "string") ||
      (job != null && typeof job !== "string")
    ) {
      return res.status(400).json({
        message: "NIC and job must be strings or null",
      });
    }

    if (
      (hire_date != null &&
        (typeof hire_date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(hire_date))) ||
      (end_date != null &&
        (typeof end_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)))
    ) {
      return res.status(400).json({
        message: "Dates must use YYYY-MM-DD format",
      });
    }

    const result = await db.query(
      `UPDATE emp
       SET ename = $1,
           nic = $2,
           job = $3,
           hire_date = $4,
           end_date = $5
       WHERE eid = $6
       RETURNING *`,
      [
        ename.trim(),
        nic?.trim() || null,
        job?.trim() || null,
        hire_date || null,
        end_date || null,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.status(200).json({
      message: "Employee updated successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating employee:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An employee with this NIC already exists",
      });
    }

    if (error.code === "23514" || error.code === "22007") {
      return res.status(400).json({
        message: "Invalid employee data or dates",
      });
    }

    res.status(500).json({
      message: "Failed to update employee",
    });
  }
});

// DELETE: Delete employee
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    const result = await db.query(
      `DELETE FROM emp
       WHERE eid = $1
       RETURNING *`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.status(200).json({
      message: "Employee deleted successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting employee:", error.message);

    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Cannot delete this employee because salary records are linked to this employee.",
      });
    }

    res.status(500).json({
      message: "Failed to delete employee",
    });
  }
});

export default router;
