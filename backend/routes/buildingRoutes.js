import express from "express";
import db from "../db.js";

const router = express.Router();

// GET: Fetch All Buildings
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM building ORDER BY building_id",
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching buildings:", error.message);

    res.status(500).json({
      message: "Failed to fetch buildings",
    });
  }
});

// POST: Create a New Building
router.post("/", async (req, res) => {
  console.log(req.user);
  console.log(req.body);
  try {
    const { building_name, location, office_phone, floor, note } = req.body;

    // Validate required fields
    if (
      typeof building_name !== "string" ||
      !building_name.trim() ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return res.status(400).json({
        message: "Building name and location are required",
      });
    }

    // Validate optional fields
    if (
      (office_phone != null && typeof office_phone !== "string") ||
      (note != null && typeof note !== "string")
    ) {
      return res.status(400).json({
        message: "Office phone and note must be strings or null",
      });
    }

    // Validate floor
    if (floor != null && (!Number.isInteger(floor) || floor < 1)) {
      return res.status(400).json({
        message: "Floor must be a positive integer",
      });
    }

    // Insert building
    const result = await db.query(
      `INSERT INTO building
       (building_name, location, office_phone, floor, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        building_name.trim(),
        location.trim(),
        office_phone?.trim() || null,
        floor ?? 1,
        note?.trim() || null,
      ],
    );

    res.status(201).json({
      message: "Building created successfully",
      building: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating building:", error.message);

    res.status(500).json({
      message: "Failed to create building",
    });
  }
});

// PUT: Update a Building
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { building_name, location, office_phone, floor, note } = req.body;

    // Validate building ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid building ID",
      });
    }

    // Validate required fields
    if (
      typeof building_name !== "string" ||
      !building_name.trim() ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return res.status(400).json({
        message: "Building name and location are required",
      });
    }

    // Validate optional fields
    if (
      (office_phone != null && typeof office_phone !== "string") ||
      (note != null && typeof note !== "string")
    ) {
      return res.status(400).json({
        message: "Office phone and note must be strings or null",
      });
    }

    // Validate floor
    if (floor != null && (!Number.isInteger(floor) || floor < 1)) {
      return res.status(400).json({
        message: "Floor must be a positive integer",
      });
    }

    const result = await db.query(
      `UPDATE building
       SET building_name = $1,
           location = $2,
           office_phone = $3,
           floor = $4,
           note = $5
       WHERE building_id = $6
       RETURNING *`,
      [
        building_name.trim(),
        location.trim(),
        office_phone?.trim() || null,
        floor ?? 1,
        note?.trim() || null,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    res.status(200).json({
      message: "Building updated successfully",
      building: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating building:", error.message);

    res.status(500).json({
      message: "Failed to update building",
    });
  }
});

// DELETE: Delete a Building
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate building ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid building ID",
      });
    }

    const result = await db.query(
      `DELETE FROM building
       WHERE building_id = $1
       RETURNING *`,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    res.status(200).json({
      message: "Building deleted successfully",
      building: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting building:", error.message);

    // Foreign key violation
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Cannot delete this building because rental services are linked to it.",
      });
    }

    res.status(500).json({
      message: "Failed to delete building",
    });
  }
});

export default router;
