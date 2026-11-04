import express from "express";
import db from "../db.js";

const router = express.Router();

// ================= TENANTS API =================

// GET: Get all tenants
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        tenant_id,
        tenant_name,
        address,
        nic,
        tenant_type,
        phone,
        note
      FROM tenant
      ORDER BY tenant_id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching tenants:", error.message);

    res.status(500).json({
      message: "Failed to fetch tenants",
    });
  }
});

// POST: Create tenant
router.post("/", async (req, res) => {
  try {
    const {
      tenant_name,
      address = null,
      nic = null,
      tenant_type = null,
      phone = null,
      note = null,
    } = req.body;

    if (typeof tenant_name !== "string" || !tenant_name.trim()) {
      return res.status(400).json({
        message: "Tenant name is required",
      });
    }

    if (
      [address, nic, tenant_type, phone, note].some(
        (value) => value != null && typeof value !== "string",
      )
    ) {
      return res.status(400).json({
        message: "Optional tenant fields must be strings or null",
      });
    }

    const result = await db.query(
      `INSERT INTO tenant
        (tenant_name, address, nic, tenant_type, phone, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenant_name.trim(),
        address?.trim() || null,
        nic?.trim() || null,
        tenant_type?.trim() || null,
        phone?.trim() || null,
        note?.trim() || null,
      ],
    );

    res.status(201).json({
      message: "Tenant created successfully",
      tenant: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating tenant:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A tenant with this NIC already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create tenant",
    });
  }
});

// PUT: Update tenant
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid tenant ID",
      });
    }

    const {
      tenant_name,
      address = null,
      nic = null,
      tenant_type = null,
      phone = null,
      note = null,
    } = req.body;

    if (typeof tenant_name !== "string" || !tenant_name.trim()) {
      return res.status(400).json({
        message: "Tenant name is required",
      });
    }

    if (
      [address, nic, tenant_type, phone, note].some(
        (value) => value != null && typeof value !== "string",
      )
    ) {
      return res.status(400).json({
        message: "Optional tenant fields must be strings or null",
      });
    }

    const result = await db.query(
      `UPDATE tenant
       SET tenant_name = $1,
           address = $2,
           nic = $3,
           tenant_type = $4,
           phone = $5,
           note = $6
       WHERE tenant_id = $7
       RETURNING *`,
      [
        tenant_name.trim(),
        address?.trim() || null,
        nic?.trim() || null,
        tenant_type?.trim() || null,
        phone?.trim() || null,
        note?.trim() || null,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    res.status(200).json({
      message: "Tenant updated successfully",
      tenant: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating tenant:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A tenant with this NIC already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update tenant",
    });
  }
});

// DELETE: Delete tenant
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid tenant ID",
      });
    }

    const result = await db.query(
      `DELETE FROM tenant
       WHERE tenant_id = $1
       RETURNING *`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    res.status(200).json({
      message: "Tenant deleted successfully",
      tenant: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting tenant:", error.message);

    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Cannot delete this tenant because rental records are linked to this tenant.",
      });
    }

    res.status(500).json({
      message: "Failed to delete tenant",
    });
  }
});

export default router;
