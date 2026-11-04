import express from "express";
import db from "../db.js";

const router = express.Router();

// Validate date in YYYY-MM-DD format
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

// GET: Fetch All Rentals
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        r.rental_id,
        r.tenant_id,
        t.tenant_name,
        r.rental_services_id,
        rs.services_no,
        rs.building_id,
        b.building_name,
        rs.floor,
        rs.rent,
        r.start_date,
        r.end_date,
        r.status
      FROM rental AS r
      JOIN tenant AS t
        ON r.tenant_id = t.tenant_id
      JOIN rental_services AS rs
        ON r.rental_services_id = rs.rental_services_id
      JOIN building AS b
        ON rs.building_id = b.building_id
      ORDER BY r.rental_id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching rentals:", error.message);

    res.status(500).json({
      message: "Failed to fetch rentals",
    });
  }
});

// GET: Fetch One Rental
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental ID",
      });
    }

    const result = await db.query(
      `
      SELECT
        r.rental_id,
        r.tenant_id,
        t.tenant_name,
        r.rental_services_id,
        rs.services_no,
        rs.building_id,
        b.building_name,
        rs.floor,
        rs.rent,
        r.start_date,
        r.end_date,
        r.status
      FROM rental AS r
      JOIN tenant AS t
        ON r.tenant_id = t.tenant_id
      JOIN rental_services AS rs
        ON r.rental_services_id = rs.rental_services_id
      JOIN building AS b
        ON rs.building_id = b.building_id
      WHERE r.rental_id = $1
      `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching rental:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental",
    });
  }
});

// POST: Create New Rental
router.post("/", async (req, res) => {
  try {
    const { tenant_id, rental_services_id, start_date, end_date, status } =
      req.body;

    // 1. Validate Tenant ID
    if (!Number.isSafeInteger(tenant_id) || tenant_id < 1) {
      return res.status(400).json({
        message: "Valid tenant_id is required",
      });
    }

    // 2. Validate Rental Service ID
    if (!Number.isSafeInteger(rental_services_id) || rental_services_id < 1) {
      return res.status(400).json({
        message: "Valid rental_services_id is required",
      });
    }

    // 3. Validate Start Date
    if (!isValidDate(start_date)) {
      return res.status(400).json({
        message: "A valid start_date is required (YYYY-MM-DD)",
      });
    }

    // 4. Validate Optional End Date
    if (end_date != null && !isValidDate(end_date)) {
      return res.status(400).json({
        message: "end_date must be a valid date (YYYY-MM-DD) or null",
      });
    }

    if (end_date != null && end_date < start_date) {
      return res.status(400).json({
        message: "end_date cannot be before start_date",
      });
    }

    // 5. Validate Status
    const allowedStatuses = ["Active", "Completed", "Cancelled"];

    if (status != null && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Active, Completed, or Cancelled",
      });
    }

    // 6. Verify that the tenant and service exist
    const check = await db.query(
      `
      SELECT
        t.tenant_id,
        rs.rental_services_id,
        rs.status AS service_status
      FROM tenant AS t
      CROSS JOIN rental_services AS rs
      WHERE t.tenant_id = $1
        AND rs.rental_services_id = $2
      `,
      [tenant_id, rental_services_id],
    );

    if (check.rows.length === 0) {
      return res.status(400).json({
        message: "The specified tenant or rental service does not exist",
      });
    }

    // 7. Service must be available for a new active rental
    if (
      (status ?? "Active") === "Active" &&
      check.rows[0].service_status !== "Available"
    ) {
      return res.status(409).json({
        message: "This rental service is not available",
      });
    }

    // 8. Insert Rental
    const result = await db.query(
      `
      INSERT INTO rental
        (
          tenant_id,
          rental_services_id,
          start_date,
          end_date,
          status
        )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        tenant_id,
        rental_services_id,
        start_date,
        end_date ?? null,
        status ?? "Active",
      ],
    );

    // 9. Update service status when rental is active
    if ((status ?? "Active") === "Active") {
      await db.query(
        `
        UPDATE rental_services
        SET status = 'Occupied'
        WHERE rental_services_id = $1
        `,
        [rental_services_id],
      );
    }

    res.status(201).json({
      message: "Rental created successfully",
      rental: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating rental:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified tenant or rental service does not exist",
      });
    }

    res.status(500).json({
      message: "Failed to create rental",
    });
  }
});

// PUT: Update Rental
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { tenant_id, rental_services_id, start_date, end_date, status } =
      req.body;

    // 1. Validate Rental ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental ID",
      });
    }

    // 2. Validate Tenant ID
    if (!Number.isSafeInteger(tenant_id) || tenant_id < 1) {
      return res.status(400).json({
        message: "Valid tenant_id is required",
      });
    }

    // 3. Validate Rental Service ID
    if (!Number.isSafeInteger(rental_services_id) || rental_services_id < 1) {
      return res.status(400).json({
        message: "Valid rental_services_id is required",
      });
    }

    // 4. Validate Dates
    if (!isValidDate(start_date)) {
      return res.status(400).json({
        message: "A valid start_date is required (YYYY-MM-DD)",
      });
    }

    if (end_date != null && !isValidDate(end_date)) {
      return res.status(400).json({
        message: "end_date must be a valid date (YYYY-MM-DD) or null",
      });
    }

    if (end_date != null && end_date < start_date) {
      return res.status(400).json({
        message: "end_date cannot be before start_date",
      });
    }

    // 5. Validate Status
    const allowedStatuses = ["Active", "Completed", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Active, Completed, or Cancelled",
      });
    }

    // 6. Check that rental exists
    const existing = await db.query(
      `SELECT * FROM rental WHERE rental_id = $1`,
      [Number(id)],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        message: "Rental not found",
      });
    }

    // 7. Check the selected tenant and service
    const check = await db.query(
      `
      SELECT
        t.tenant_id,
        rs.rental_services_id,
        rs.status AS service_status
      FROM tenant AS t
      CROSS JOIN rental_services AS rs
      WHERE t.tenant_id = $1
        AND rs.rental_services_id = $2
      `,
      [tenant_id, rental_services_id],
    );

    if (check.rows.length === 0) {
      return res.status(400).json({
        message: "The specified tenant or rental service does not exist",
      });
    }

    const oldRental = existing.rows[0];

    if (
      status === "Active" &&
      oldRental.rental_services_id !== rental_services_id &&
      check.rows[0].service_status !== "Available"
    ) {
      return res.status(409).json({
        message: "The selected rental service is not available",
      });
    }

    // 8. Update Rental
    const result = await db.query(
      `
      UPDATE rental
      SET tenant_id = $1,
          rental_services_id = $2,
          start_date = $3,
          end_date = $4,
          status = $5
      WHERE rental_id = $6
      RETURNING *
      `,
      [
        tenant_id,
        rental_services_id,
        start_date,
        end_date ?? null,
        status,
        Number(id),
      ],
    );

    // 9. Synchronize service status
    if (oldRental.rental_services_id !== rental_services_id) {
      if (oldRental.status === "Active") {
        await db.query(
          `
          UPDATE rental_services
          SET status = 'Available'
          WHERE rental_services_id = $1
            AND status = 'Occupied'
          `,
          [oldRental.rental_services_id],
        );
      }
    }

    if (status === "Active") {
      await db.query(
        `
        UPDATE rental_services
        SET status = 'Occupied'
        WHERE rental_services_id = $1
        `,
        [rental_services_id],
      );
    } else {
      await db.query(
        `
        UPDATE rental_services
        SET status = 'Available'
        WHERE rental_services_id = $1
          AND status = 'Occupied'
        `,
        [rental_services_id],
      );
    }

    res.status(200).json({
      message: "Rental updated successfully",
      rental: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating rental:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified tenant or rental service does not exist",
      });
    }

    res.status(500).json({
      message: "Failed to update rental",
    });
  }
});

// DELETE: Delete Rental
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate Rental ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental ID",
      });
    }

    // 2. Find Rental
    const existing = await db.query(
      `SELECT * FROM rental WHERE rental_id = $1`,
      [Number(id)],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        message: "Rental not found",
      });
    }

    const rental = existing.rows[0];

    // 3. Delete Rental
    const result = await db.query(
      `
      DELETE FROM rental
      WHERE rental_id = $1
      RETURNING *
      `,
      [Number(id)],
    );

    // 4. Make service available again if appropriate
    if (rental.status === "Active") {
      await db.query(
        `
        UPDATE rental_services
        SET status = 'Available'
        WHERE rental_services_id = $1
          AND status = 'Occupied'
        `,
        [rental.rental_services_id],
      );
    }

    res.status(200).json({
      message: "Rental deleted successfully",
      rental: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting rental:", error.message);

    // Rental has payment records
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Cannot delete this rental because payment records are linked to it.",
      });
    }

    res.status(500).json({
      message: "Failed to delete rental",
    });
  }
});

export default router;
