import express from "express";
import db from "../db.js";

const router = express.Router();

const allowedStatuses = ["Paid", "Partial", "Pending"];

// Validate date: YYYY-MM-DD
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

// Validate non-negative number
function isValidAmount(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// Validate payment request body
function validatePayment(body) {
  const {
    rental_id,
    payment_month,
    rent,
    last_reading_meter,
    current_reading_meter,
    meter_unit_rate,
    paid_amount,
    payment_date,
  } = body;

  if (!Number.isSafeInteger(rental_id) || rental_id < 1) {
    return "Valid rental_id is required";
  }

  if (!isValidDate(payment_month)) {
    return "payment_month must be a valid date (YYYY-MM-DD)";
  }

  if (!isValidAmount(rent)) {
    return "Rent must be a non-negative number";
  }

  for (const [field, value] of [
    ["last_reading_meter", last_reading_meter],
    ["current_reading_meter", current_reading_meter],
  ]) {
    if (value != null && !isValidAmount(value)) {
      //return "${field} must be a non-negative number or null";
      return `${field} must be a non-negative number or null`;
    }
  }

  if (
    last_reading_meter != null &&
    current_reading_meter != null &&
    current_reading_meter < last_reading_meter
  ) {
    return "current_reading_meter cannot be less than last_reading_meter";
  }

  const unitRate = meter_unit_rate ?? 0;

  if (!isValidAmount(unitRate)) {
    return "meter_unit_rate must be a non-negative number";
  }
  //Validate paid amount
  if (
    typeof paid_amount != "number" ||
    !Number.isFinite(paid_amount) ||
    paid_amount < 0
  ) {
    return res.status(400).json({
      message: "Paid_amount must be a non-negateve number",
    });
  }
  //Calcultate meter cout
  const metercost =
    (current_reading_meter ?? 0) - (last_reading_meter ?? 0) * unitRate;

  //Calculate Total due
  const totalDue = rent + metercost;

  //prevent Overpayment
  if (paid_amount > totalDue) {
    return res.status(400).json({
      message: "Paid amount cannot exceed total due",
    });
  }

  // Automatically calculate status
  const status =
    paid_amount >= totalDue && totalDue > 0
      ? "Paid"
      : paid_amount > 0
        ? "Partial"
        : "Pending";

  const paidAmount = paid_amount ?? 0;

  if (!isValidAmount(paidAmount)) {
    return "paid_amount must be a non-negative number";
  }

  if (payment_date != null && !isValidDate(payment_date)) {
    return "payment_date must be a valid date (YYYY-MM-DD) or null";
  }

  return null;
}

// Shared SELECT query
const paymentSelect = `
SELECT
rp.rental_payment_id,
rp.rental_id,
t.tenant_id,
t.tenant_name,
rs.rental_services_id,
rs.services_no,
b.building_name,
rp.payment_month,
rp.rent,
rp.paid_amount,
rp.last_reading_meter,
rp.current_reading_meter,
rp.meter_unit_rate,

ROUND(
  (
    COALESCE(rp.current_reading_meter, 0) -
    COALESCE(rp.last_reading_meter, 0)
  ) * COALESCE(rp.meter_unit_rate, 0),
  2
) AS meter_cost,

ROUND(
  rp.rent +
  (
    COALESCE(rp.current_reading_meter, 0) -
    COALESCE(rp.last_reading_meter, 0)
  ) * COALESCE(rp.meter_unit_rate, 0),
  2
) AS total_amount,

rp.paid_amount,

ROUND(
  rp.rent +
  (
    COALESCE(rp.current_reading_meter, 0) -
    COALESCE(rp.last_reading_meter, 0)
  ) * COALESCE(rp.meter_unit_rate, 0) -
  rp.paid_amount,
  2
) AS remaining_amount,

rp.payment_date,
rp.status

FROM rental_payment AS rp
JOIN rental AS r
ON rp.rental_id = r.rental_id
JOIN tenant AS t
ON r.tenant_id = t.tenant_id
JOIN rental_services AS rs
ON r.rental_services_id = rs.rental_services_id
JOIN building AS b
ON rs.building_id = b.building_id
`;

// Automatically determine payment status
function calculateStatus(totalAmount, paidAmount) {
  if (totalAmount <= 0 || paidAmount <= 0) {
    return "Pending";
  }

  if (paidAmount >= totalAmount) {
    return "Paid";
  }

  return "Partial";
}

// GET: Fetch All Rental Payments
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `${paymentSelect} ORDER BY rp.rental_payment_id`,
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching rental payments:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental payments",
    });
  }
});

// GET: Fetch One Rental Payment
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental payment ID",
      });
    }

    const result = await db.query(
      `
    ${paymentSelect}
    WHERE rp.rental_payment_id = $1
  `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental payment not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching rental payment:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental payment",
    });
  }
});

// POST: Create Rental Payment
router.post("/", async (req, res) => {
  try {
    const {
      rental_id,
      payment_month,
      rent,
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate,
      paid_amount,
      payment_date,
    } = req.body;

    const validationError = validatePayment(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const rentalCheck = await db.query(
      "SELECT rental_id FROM rental WHERE rental_id = $1",
      [rental_id],
    );

    if (rentalCheck.rows.length === 0) {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    const unitRate = meter_unit_rate ?? 0;
    const paidAmount = paid_amount ?? 0;

    const meterCost =
      ((current_reading_meter ?? 0) - (last_reading_meter ?? 0)) * unitRate;

    const totalAmount = rent + meterCost;
    const status = calculateStatus(totalAmount, paidAmount);

    const result = await db.query(
      `
    INSERT INTO rental_payment (
      rental_id,
      payment_month,
      rent,
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate,
      paid_amount,
      payment_date,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,
      [
        rental_id,
        payment_month,
        rent,
        last_reading_meter ?? null,
        current_reading_meter ?? null,
        unitRate,
        paidAmount,
        payment_date ?? null,
        status,
      ],
    );

    res.status(201).json({
      message: "Rental payment created successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating rental payment:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A payment for this rental and month already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create rental payment",
    });
  }
});

// PUT: Update Rental Payment
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental payment ID",
      });
    }

    const {
      rental_id,
      payment_month,
      rent,
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate,
      paid_amount,
      payment_date,
    } = req.body;

    const validationError = validatePayment(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const rentalCheck = await db.query(
      "SELECT rental_id FROM rental WHERE rental_id = $1",
      [rental_id],
    );

    if (rentalCheck.rows.length === 0) {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    const unitRate = meter_unit_rate ?? 0;
    const paidAmount = paid_amount ?? 0;

    const meterCost =
      ((current_reading_meter ?? 0) - (last_reading_meter ?? 0)) * unitRate;

    const totalAmount = rent + meterCost;
    const status = calculateStatus(totalAmount, paidAmount);

    const result = await db.query(
      `
    UPDATE rental_payment
    SET
      rental_id = $1,
      payment_month = $2,
      rent = $3,
      last_reading_meter = $4,
      current_reading_meter = $5,
      meter_unit_rate = $6,
      paid_amount = $7,
      payment_date = $8,
      status = $9
    WHERE rental_payment_id = $10
    RETURNING *
  `,
      [
        rental_id,
        payment_month,
        rent,
        last_reading_meter ?? null,
        current_reading_meter ?? null,
        unitRate,
        paidAmount,
        payment_date ?? null,
        status,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental payment not found",
      });
    }

    res.status(200).json({
      message: "Rental payment updated successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating rental payment:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A payment for this rental and month already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update rental payment",
    });
  }
});

// DELETE: Delete Rental Payment
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental payment ID",
      });
    }

    const result = await db.query(
      `
    DELETE FROM rental_payment
    WHERE rental_payment_id = $1
    RETURNING *
  `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental payment not found",
      });
    }

    res.status(200).json({
      message: "Rental payment deleted successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting rental payment:", error.message);

    res.status(500).json({
      message: "Failed to delete rental payment",
    });
  }
});

export default router;

/*import express from "express";
import db from "../db.js";

const router = express.Router();

// Validate date: YYYY-MM-DD
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

// GET: Fetch All Rental Payments
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        rp.rental_payment_id,
        rp.rental_id,
        t.tenant_id,
        t.tenant_name,
        rs.rental_services_id,
        rs.services_no,
        b.building_name,
        rp.payment_month,
        rp.rent,
        rp.last_reading_meter,
        rp.current_reading_meter,
        rp.meter_unit_rate,
        (
          COALESCE(rp.current_reading_meter, 0) -
          COALESCE(rp.last_reading_meter, 0)
        ) * rp.meter_unit_rate AS meter_cost,
        rp.payment_date,
        rp.status
      FROM rental_payment AS rp
      JOIN rental AS r
        ON rp.rental_id = r.rental_id
      JOIN tenant AS t
        ON r.tenant_id = t.tenant_id
      JOIN rental_services AS rs
        ON r.rental_services_id = rs.rental_services_id
      JOIN building AS b
        ON rs.building_id = b.building_id
      ORDER BY rp.rental_payment_id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching rental payments:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental payments",
    });
  }
});

// GET: Fetch One Rental Payment
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental payment ID",
      });
    }

    const result = await db.query(
      `
      SELECT
        rp.rental_payment_id,
        rp.rental_id,
        t.tenant_id,
        t.tenant_name,
        rs.rental_services_id,
        rs.services_no,
        b.building_name,
        rp.payment_month,
        rp.rent,
        rp.last_reading_meter,
        rp.current_reading_meter,
        rp.meter_unit_rate,
        (
          COALESCE(rp.current_reading_meter, 0) -
          COALESCE(rp.last_reading_meter, 0)
        ) * rp.meter_unit_rate AS meter_cost,
        rp.payment_date,
        rp.status
      FROM rental_payment AS rp
      JOIN rental AS r
        ON rp.rental_id = r.rental_id
      JOIN tenant AS t
        ON r.tenant_id = t.tenant_id
      JOIN rental_services AS rs
        ON r.rental_services_id = rs.rental_services_id
      JOIN building AS b
        ON rs.building_id = b.building_id
      WHERE rp.rental_payment_id = $1
      `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental payment not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching rental payment:", error.message);

    res.status(500).json({
      message: "Failed to fetch rental payment",
    });
  }
});

// POST: Create Rental Payment
router.post("/", async (req, res) => {
  try {
    const {
      rental_id,
      payment_month,
      rent,
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate,
      payment_date,
      status,
    } = req.body;

    // 1. Validate Rental ID
    if (!Number.isSafeInteger(rental_id) || rental_id < 1) {
      return res.status(400).json({
        message: "Valid rental_id is required",
      });
    }

    // 2. Validate Payment Month
    if (!isValidDate(payment_month)) {
      return res.status(400).json({
        message: "payment_month must be a valid date (YYYY-MM-DD)",
      });
    }

    // 3. Validate Rent
    if (typeof rent !== "number" || !Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "Rent must be a non-negative number",
      });
    }

    // 4. Validate Meter Readings
    for (const [field, value] of [
      ["last_reading_meter", last_reading_meter],
      ["current_reading_meter", current_reading_meter],
    ]) {
      if (
        value != null &&
        (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      ) {
        return res.status(400).json({
          message: `${field} must be a non-negative number or null`,
        });
      }
    }

    // Current reading cannot be less than last reading
    if (
      last_reading_meter != null &&
      current_reading_meter != null &&
      current_reading_meter < last_reading_meter
    ) {
      return res.status(400).json({
        message: "current_reading_meter cannot be less than last_reading_meter",
      });
    }

    // 5. Validate Meter Unit Rate
    const unitRate = meter_unit_rate ?? 0;

    if (
      typeof unitRate !== "number" ||
      !Number.isFinite(unitRate) ||
      unitRate < 0
    ) {
      return res.status(400).json({
        message: "meter_unit_rate must be a non-negative number",
      });
    }

    // 6. Validate Optional Payment Date
    if (payment_date != null && !isValidDate(payment_date)) {
      return res.status(400).json({
        message: "payment_date must be a valid date (YYYY-MM-DD) or null",
      });
    }

    // 7. Validate Status
    const allowedStatuses = ["Paid", "Partial", "Pending"];

    if (status != null && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Paid, Partial, or Pending",
      });
    }

    // 8. Check Rental Exists
    const rentalCheck = await db.query(
      "SELECT rental_id FROM rental WHERE rental_id = $1",
      [rental_id],
    );

    if (rentalCheck.rows.length === 0) {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    // 9. Insert Payment
    const result = await db.query(
      `
      INSERT INTO rental_payment (
        rental_id,
        payment_month,
        rent,
        last_reading_meter,
        current_reading_meter,
        meter_unit_rate,
        payment_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        rental_id,
        payment_month,
        rent,
        last_reading_meter ?? null,
        current_reading_meter ?? null,
        unitRate,
        payment_date ?? null,
        status ?? "Pending",
      ],
    );

    res.status(201).json({
      message: "Rental payment created successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating rental payment:", error.message);

    // Foreign Key Violation
    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    // Duplicate payment for the same rental and month
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A payment for this rental and month already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create rental payment",
    });
  }
});

// PUT: Update Rental Payment
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      rental_id,
      payment_month,
      rent,
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate,
      payment_date,
      status,
    } = req.body;

    // 1. Validate Payment ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental payment ID",
      });
    }

    // 2. Validate Rental ID
    if (!Number.isSafeInteger(rental_id) || rental_id < 1) {
      return res.status(400).json({
        message: "Valid rental_id is required",
      });
    }

    // 3. Validate Payment Month
    if (!isValidDate(payment_month)) {
      return res.status(400).json({
        message: "payment_month must be a valid date (YYYY-MM-DD)",
      });
    }

    // 4. Validate Rent
    if (typeof rent !== "number" || !Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "Rent must be a non-negative number",
      });
    }

    // 5. Validate Meter Readings
    for (const [field, value] of [
      ["last_reading_meter", last_reading_meter],
      ["current_reading_meter", current_reading_meter],
    ]) {
      if (
        value != null &&
        (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      ) {
        return res.status(400).json({
          message: `${field} must be a non-negative number or null`,
        });
      }
    }

    if (
      last_reading_meter != null &&
      current_reading_meter != null &&
      current_reading_meter < last_reading_meter
    ) {
      return res.status(400).json({
        message: "current_reading_meter cannot be less than last_reading_meter",
      });
    }

    // 6. Validate Meter Unit Rate
    const unitRate = meter_unit_rate ?? 0;

    if (
      typeof unitRate !== "number" ||
      !Number.isFinite(unitRate) ||
      unitRate < 0
    ) {
      return res.status(400).json({
        message: "meter_unit_rate must be a non-negative number",
      });
    }

    // 7. Validate Payment Date
    if (payment_date != null && !isValidDate(payment_date)) {
      return res.status(400).json({
        message: "payment_date must be a valid date (YYYY-MM-DD) or null",
      });
    }

    // 8. Validate Status
    const allowedStatuses = ["Paid", "Partial", "Pending"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be Paid, Partial, or Pending",
      });
    }

    // 9. Check Rental Exists
    const rentalCheck = await db.query(
      "SELECT rental_id FROM rental WHERE rental_id = $1",
      [rental_id],
    );

    if (rentalCheck.rows.length === 0) {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    // 10. Update Payment
    const result = await db.query(
      `
      UPDATE rental_payment
      SET rental_id = $1,
          payment_month = $2,
          rent = $3,
          last_reading_meter = $4,
          current_reading_meter = $5,
          meter_unit_rate = $6,
          payment_date = $7,
          status = $8
      WHERE rental_payment_id = $9
      RETURNING *
      `,
      [
        rental_id,
        payment_month,
        rent,
        last_reading_meter ?? null,
        current_reading_meter ?? null,
        unitRate,
        payment_date ?? null,
        status,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental payment not found",
      });
    }

    res.status(200).json({
      message: "Rental payment updated successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating rental payment:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "The specified rental does not exist",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A payment for this rental and month already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update rental payment",
    });
  }
});

// DELETE: Delete Rental Payment
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid rental payment ID",
      });
    }

    const result = await db.query(
      `
      DELETE FROM rental_payment
      WHERE rental_payment_id = $1
      RETURNING *
      `,
      [Number(id)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Rental payment not found",
      });
    }

    res.status(200).json({
      message: "Rental payment deleted successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting rental payment:", error.message);

    res.status(500).json({
      message: "Failed to delete rental payment",
    });
  }
});

export default router;*/
