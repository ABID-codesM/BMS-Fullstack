import express from "express";
import db from "../db.js";

const router = express.Router();

// GET: Available rooms and shops for the public
router.get("/rooms", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT rs.rental_services_id, rs.services_no, rs.description, rs.floor, rs.rent, b.building_id, b.building_name, b.location, b.office_phone FROM rental_services rs INNER JOIN building b ON rs.building_id = b.building_id WHERE rs.status = 'Available' AND NOT EXISTS ( SELECT 1 FROM rental r WHERE r.rental_services_id = rs.rental_services_id AND r.status = 'Active' ) ORDER BY b.building_name, rs.services_no;",
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Error fetching available rooms:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch available rooms.",
    });
  }
});
// POST: Submit a public rental request
router.post("/requests", async (req, res) => {
  try {
    const { rental_services_id, applicant_name, applicant_phone, note } =
      req.body;

    // Validate required fields
    if (
      !rental_services_id ||
      !applicant_name?.trim() ||
      !applicant_phone?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Room ID, applicant name, and phone are required.",
      });
    }

    const serviceId = Number(rental_services_id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID.",
      });
    }

    // Check whether the room is available
    const roomResult = await db.query(
      `SELECT rs.rental_services_id
         FROM rental_services rs
         WHERE rs.rental_services_id = $1
           AND rs.status = 'Available'
           AND NOT EXISTS (
               SELECT 1
               FROM rental r
               WHERE r.rental_services_id = rs.rental_services_id
                 AND r.status = 'Active'
           )`,
      [serviceId],
    );

    if (roomResult.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "This room is not currently available.",
      });
    }

    // Save the request
    const result = await db.query(
      `INSERT INTO rental_requests
            (rental_services_id, applicant_name, applicant_phone, note)
         VALUES ($1, $2, $3, $4)
         RETURNING request_id, rental_services_id, applicant_name,
                   applicant_phone, note, request_date, status`,
      [
        serviceId,
        applicant_name.trim(),
        applicant_phone.trim(),
        note?.trim() || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Your rental request has been submitted successfully.",
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Error submitting rental request:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit rental request.",
    });
  }
});

export default router;
