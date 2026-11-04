import express from "express";
import db from "../db.js";

const router = express.Router();

// GET: Fetch All Rental Services
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        rs.*,
        b.building_name
      FROM rental_services AS rs
      JOIN building AS b
        ON rs.building_id = b.building_id
      ORDER BY rs.rental_services_id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching rental services:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental services",
    });
  }
});

// GET: Fetch One Rental Service
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental service ID",
      });
    }

    const result = await db.query(
      `SELECT
         rs.*,
         b.building_name
       FROM rental_services AS rs
       JOIN building AS b
         ON rs.building_id = b.building_id
       WHERE rs.rental_services_id = $1`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental service not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching rental service:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental service",
    });
  }
});

// POST: Create Rental Service
router.post("/", async (req, res) => {
  try {
    const { building_id, services_no, description, floor, rent, status } =
      req.body;

    // Validate Building ID
    if (!Number.isSafeInteger(building_id) || building_id < 1) {
      return res.status(400).json({
        message: "Valid building_id is required",
      });
    }

    // Validate Service Number
    if (typeof services_no !== "string" || !services_no.trim()) {
      return res.status(400).json({
        message: "Service number is required",
      });
    }

    // Validate Description
    if (description != null && typeof description !== "string") {
      return res.status(400).json({
        message: "Description must be a string or null",
      });
    }

    // Validate Floor
    if (!Number.isInteger(floor) || floor < 1) {
      return res.status(400).json({
        message: "Floor must be a positive integer",
      });
    }

    // Validate Rent
    if (typeof rent !== "number" || !Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "Rent must be a non-negative number",
      });
    }

    // Validate Status
    const allowedStatuses = ["Available", "Occupied", "Maintenance"];

    if (status != null && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Available, Occupied, or Maintenance",
      });
    }

    const result = await db.query(
      `INSERT INTO rental_services
       (
         building_id,
         services_no,
         description,
         floor,
         rent,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        building_id,
        services_no.trim(),
        description?.trim() || null,
        floor,
        rent,
        status ?? "Available",
      ],
    );

    res.status(201).json({
      message: "Rental service created successfully",
      service: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating rental service:", error.message);

    // Building does not exist
    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified building does not exist",
      });
    }

    // Duplicate service number within the same building
    if (error.code === "23505") {
      return res.status(409).json({
        message: "This service number already exists in this building",
      });
    }

    res.status(500).json({
      message: "Failed to create rental service",
    });
  }
});

// PUT: Update Rental Service
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { building_id, services_no, description, floor, rent, status } =
      req.body;

    // Validate ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental service ID",
      });
    }

    // Validate Building ID
    if (!Number.isSafeInteger(building_id) || building_id < 1) {
      return res.status(400).json({
        message: "Valid building_id is required",
      });
    }

    // Validate Service Number
    if (typeof services_no !== "string" || !services_no.trim()) {
      return res.status(400).json({
        message: "Service number is required",
      });
    }

    // Validate Description
    if (description != null && typeof description !== "string") {
      return res.status(400).json({
        message: "Description must be a string or null",
      });
    }

    // Validate Floor
    if (!Number.isInteger(floor) || floor < 1) {
      return res.status(400).json({
        message: "Floor must be a positive integer",
      });
    }

    // Validate Rent
    if (typeof rent !== "number" || !Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "Rent must be a non-negative number",
      });
    }

    // Validate Status
    const allowedStatuses = ["Available", "Occupied", "Maintenance"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Available, Occupied, or Maintenance",
      });
    }

    const result = await db.query(
      `UPDATE rental_services
       SET building_id = $1,
           services_no = $2,
           description = $3,
           floor = $4,
           rent = $5,
           status = $6
       WHERE rental_services_id = $7
       RETURNING *`,
      [
        building_id,
        services_no.trim(),
        description?.trim() || null,
        floor,
        rent,
        status,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental service not found",
      });
    }

    res.status(200).json({
      message: "Rental service updated successfully",
      service: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating rental service:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified building does not exist",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This service number already exists in this building",
      });
    }

    res.status(500).json({
      message: "Failed to update rental service",
    });
  }
});

// DELETE: Delete Rental Service
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental service ID",
      });
    }

    const result = await db.query(
      `DELETE FROM rental_services
       WHERE rental_services_id = $1
       RETURNING *`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental service not found",
      });
    }

    res.status(200).json({
      message: "Rental service deleted successfully",
      service: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting rental service:", error.message);

    // A rental already references this service
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Cannot delete this service because rental records are linked to it.",
      });
    }

    res.status(500).json({
      message: "Failed to delete rental service",
    });
  }
});

export default router;
