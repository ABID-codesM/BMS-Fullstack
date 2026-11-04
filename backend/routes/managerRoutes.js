import express from "express";
import db from "../db.js";
import { requireManagerPermission } from "../middleware/managerPermission.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

// Check whether a value is a positive integer.
const isPositiveInteger = (value) => {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
};

// Check required text fields.
const isValidText = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

// Check optional text fields.
const optionalText = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return typeof value === "string" ? value.trim() : null;
};

// Send a standard server error.
const serverError = (res, message, error) => {
  console.error(message, error.message);

  return res.status(500).json({
    message,
  });
};

//اضافه شو
router.get("/my-permissions", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        view_buildings,
        manage_rental_services,
        change_rent,
        manage_tenants,
        manage_rentals,
        manage_rental_payments,
        review_requests,
        view_reports
       FROM manager_permissions
       WHERE user_id = $1`,
      [req.user.userId],
    );

    const permissions = result.rows[0] || {
      view_buildings: true,
      manage_rental_services: true,
      change_rent: false,
      manage_tenants: true,
      manage_rentals: true,
      manage_rental_payments: true,
      review_requests: true,
      view_reports: true,
    };

    res.json({
      message: "Manager permissions retrieved successfully.",
      permissions,
    });
  } catch (error) {
    console.error("Manager permissions error:", error);

    res.status(500).json({
      message: "Failed to retrieve Manager permissions.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| 1. MANAGER PROFILE
|--------------------------------------------------------------------------
| GET /api/manager/me
*/

router.get("/me", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          user_id,
          full_name,
          email,
          role,
          is_active,
          created_at
       FROM users
       WHERE user_id = $1
         AND role = 'Building Manager'
         AND is_active = TRUE`,
      [req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Active manager account not found.",
      });
    }

    return res.status(200).json({
      message: "Manager profile retrieved successfully.",
      manager: result.rows[0],
    });
  } catch (error) {
    return serverError(res, "Failed to retrieve manager profile.", error);
  }
});

/*
|--------------------------------------------------------------------------
| 2. ASSIGNED BUILDINGS
|--------------------------------------------------------------------------
| GET /api/manager/buildings
| GET /api/manager/buildings/:buildingId
*/

router.get(
  "/buildings",
  requireManagerPermission("view_buildings"),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT
          b.building_id,
          b.building_name,
          b.location,
          b.office_phone,
          b.floor,
          b.note,
          ub.assigned_at
       FROM user_buildings ub
       INNER JOIN building b
          ON b.building_id = ub.building_id
       WHERE ub.user_id = $1
       ORDER BY b.building_id`,
        [req.user.userId],
      );

      return res.status(200).json({
        message: "Assigned buildings retrieved successfully.",
        count: result.rows.length,
        buildings: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve assigned buildings.", error);
    }
  },
);

router.get(
  "/buildings/:buildingId",
  requireManagerPermission("view_buildings"),
  async (req, res) => {
    const { buildingId } = req.params;

    if (!isPositiveInteger(buildingId)) {
      return res.status(400).json({
        message: "Invalid building ID.",
      });
    }

    try {
      const result = await db.query(
        `SELECT
          b.building_id,
          b.building_name,
          b.location,
          b.office_phone,
          b.floor,
          b.note,
          ub.assigned_at
       FROM building b
       INNER JOIN user_buildings ub
          ON ub.building_id = b.building_id
       WHERE b.building_id = $1
         AND ub.user_id = $2`,
        [buildingId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Building not found or not assigned to you.",
        });
      }

      return res.status(200).json({
        message: "Building retrieved successfully.",
        building: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve building.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| 3. RENTAL SERVICES
|--------------------------------------------------------------------------
| GET   /api/manager/rental-services
| GET   /api/manager/rental-services/:serviceId
| PATCH /api/manager/rental-services/:serviceId
|
| IMPORTANT:
| Manager cannot change the rent amount.
| Creating rental services with rent is handled by Admin.
|--------------------------------------------------------------------------
*/

router.get(
  "/rental-services",
  requireManagerPermission("view_buildings"),
  async (req, res) => {
    const { building_id, status } = req.query;

    if (building_id !== undefined && !isPositiveInteger(building_id)) {
      return res.status(400).json({
        message: "Invalid building_id.",
      });
    }

    const allowedStatuses = ["Available", "Occupied", "Maintenance"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid rental service status.",
        allowedStatuses,
      });
    }

    try {
      const values = [req.user.userId];

      let query = `
      SELECT
          rs.rental_services_id,
          rs.building_id,
          b.building_name,
          rs.services_no,
          rs.description,
          rs.floor,
          rs.rent,
          rs.status
      FROM rental_services rs
      INNER JOIN building b
          ON b.building_id = rs.building_id
      INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
      WHERE ub.user_id = $1
    `;

      if (building_id !== undefined) {
        values.push(Number(building_id));
        query += ` AND rs.building_id = $${values.length}`;
      }

      if (status !== undefined) {
        values.push(status);
        query += ` AND rs.status = $${values.length}`;
      }

      query += `
      ORDER BY
          rs.building_id,
          rs.rental_services_id
    `;

      const result = await db.query(query, values);

      return res.status(200).json({
        message: "Rental services retrieved successfully.",
        count: result.rows.length,
        rental_services: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental services.", error);
    }
  },
);

router.get(
  "/rental-services/:serviceId",
  requireManagerPermission("view_buildings"),
  async (req, res) => {
    const { serviceId } = req.params;

    if (!isPositiveInteger(serviceId)) {
      return res.status(400).json({
        message: "Invalid rental service ID.",
      });
    }

    try {
      const result = await db.query(
        `SELECT
            rs.rental_services_id,
            rs.building_id,
            b.building_name,
            rs.services_no,
            rs.description,
            rs.floor,
            rs.rent,
            rs.status
         FROM rental_services rs
         INNER JOIN building b
            ON b.building_id = rs.building_id
         INNER JOIN user_buildings ub
            ON ub.building_id = rs.building_id
         WHERE rs.rental_services_id = $1
           AND ub.user_id = $2`,
        [serviceId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Rental service not found or not assigned to you.",
        });
      }

      return res.status(200).json({
        message: "Rental service retrieved successfully.",
        rental_service: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental service.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| Update service details and status.
| The rent field is intentionally not editable here.
|--------------------------------------------------------------------------
*/
router.patch(
  "/rental-services/:serviceId",
  requireManagerPermission("manage_rental_services"),
  async (req, res) => {
    const { serviceId } = req.params;

    const { description, floor, status } = req.body;

    if (!isPositiveInteger(serviceId)) {
      return res.status(400).json({
        message: "Invalid rental service ID.",
      });
    }

    // Check rent-change permission and validate rent.
    if (Object.hasOwn(req.body, "rent")) {
      if (req.managerPermissions?.change_rent !== true) {
        return res.status(403).json({
          message: "You do not have permission to change the rental amount.",
          requiredPermission: "change_rent",
        });
      }

      const rent = Number(req.body.rent);

      if (
        req.body.rent === null ||
        req.body.rent === "" ||
        !Number.isFinite(rent) ||
        rent < 0
      ) {
        return res.status(400).json({
          message: "Rent must be a valid non-negative number.",
        });
      }
    }

    // Fields that the Manager may update.
    const allowedFields = ["description", "floor", "status", "rent"];

    const providedFields = allowedFields.filter((field) =>
      Object.hasOwn(req.body, field),
    );

    if (providedFields.length === 0) {
      return res.status(400).json({
        message: "No editable fields provided.",
      });
    }

    // Validate floor.
    if (
      Object.hasOwn(req.body, "floor") &&
      (!Number.isInteger(floor) || floor < 0)
    ) {
      return res.status(400).json({
        message: "Floor must be a non-negative integer.",
      });
    }

    // Validate status.
    const allowedStatuses = ["Available", "Occupied", "Maintenance"];

    if (
      Object.hasOwn(req.body, "status") &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid rental service status.",
        allowedStatuses,
      });
    }

    try {
      // Verify that the rental service belongs to an assigned building.
      const serviceCheck = await db.query(
        `SELECT rs.rental_services_id
         FROM rental_services rs
         INNER JOIN user_buildings ub
           ON ub.building_id = rs.building_id
         WHERE rs.rental_services_id = $1
           AND ub.user_id = $2`,
        [serviceId, req.user.userId],
      );

      if (serviceCheck.rows.length === 0) {
        return res.status(404).json({
          message: "Rental service not found or not assigned to you.",
        });
      }

      const values = [];
      const updates = [];

      // Update description.
      if (Object.hasOwn(req.body, "description")) {
        values.push(optionalText(description));
        updates.push(`description = $${values.length}`);
      }

      // Update floor.
      if (Object.hasOwn(req.body, "floor")) {
        values.push(floor);
        updates.push(`floor = $${values.length}`);
      }

      // Update status.
      if (Object.hasOwn(req.body, "status")) {
        values.push(status);
        updates.push(`status = $${values.length}`);
      }

      // Update rent only when the Manager has permission.
      if (Object.hasOwn(req.body, "rent")) {
        values.push(Number(req.body.rent));
        updates.push(`rent = $${values.length}`);
      }

      // Service ID parameter.
      values.push(serviceId);
      const serviceParam = `$${values.length}`;

      // Manager ID parameter.
      values.push(req.user.userId);
      const managerParam = `$${values.length}`;

      const result = await db.query(
        `UPDATE rental_services rs
         SET ${updates.join(", ")}
         WHERE rs.rental_services_id = ${serviceParam}
           AND EXISTS (
             SELECT 1
             FROM user_buildings ub
             WHERE ub.building_id = rs.building_id
               AND ub.user_id = ${managerParam}
           )
         RETURNING
           rs.rental_services_id,
           rs.building_id,
           rs.services_no,
           rs.description,
           rs.floor,
           rs.rent,
           rs.status`,
        values,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Rental service not found or not assigned to you.",
        });
      }

      return res.status(200).json({
        message: "Rental service updated successfully.",
        rental_service: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to update rental service.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| 4. RENTAL REQUESTS
|--------------------------------------------------------------------------
| GET   /api/manager/rental-requests
| GET   /api/manager/rental-requests/:requestId
| PATCH /api/manager/rental-requests/:requestId
|--------------------------------------------------------------------------
*/

router.get(
  "/rental-requests",
  requireManagerPermission("review_requests"),
  async (req, res) => {
    const { building_id, status } = req.query;

    if (building_id !== undefined && !isPositiveInteger(building_id)) {
      return res.status(400).json({
        message: "Invalid building_id.",
      });
    }

    const allowedStatuses = ["Pending", "Approved", "Rejected"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid request status.",
        allowedStatuses,
      });
    }

    try {
      const values = [req.user.userId];

      let query = `
      SELECT
          rr.request_id,
          rr.rental_services_id,
          rs.building_id,
          b.building_name,
          rs.services_no,
          rs.rent,
          rr.applicant_name,
          rr.applicant_phone,
          rr.note,
          rr.request_date,
          rr.status,
          rr.reviewed_by,
          rr.reviewed_at,
          rr.review_note
      FROM rental_requests rr
      INNER JOIN rental_services rs
          ON rs.rental_services_id = rr.rental_services_id
      INNER JOIN building b
          ON b.building_id = rs.building_id
      INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
      WHERE ub.user_id = $1
    `;

      if (building_id !== undefined) {
        values.push(Number(building_id));
        query += ` AND rs.building_id = $${values.length}`;
      }

      if (status !== undefined) {
        values.push(status);
        query += ` AND rr.status = $${values.length}`;
      }

      query += ` ORDER BY rr.request_date DESC`;

      const result = await db.query(query, values);

      return res.status(200).json({
        message: "Rental requests retrieved successfully.",
        count: result.rows.length,
        requests: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental requests.", error);
    }
  },
);

router.get(
  "/rental-requests/:requestId",
  requireManagerPermission("review_requests"),
  async (req, res) => {
    const { requestId } = req.params;

    if (!isPositiveInteger(requestId)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    try {
      const result = await db.query(
        `SELECT
            rr.*,
            rs.building_id,
            rs.services_no,
            rs.rent,
            b.building_name
         FROM rental_requests rr
         INNER JOIN rental_services rs
            ON rs.rental_services_id = rr.rental_services_id
         INNER JOIN building b
            ON b.building_id = rs.building_id
         INNER JOIN user_buildings ub
            ON ub.building_id = rs.building_id
         WHERE rr.request_id = $1
           AND ub.user_id = $2`,
        [requestId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Request not found or not assigned to your buildings.",
        });
      }

      return res.status(200).json({
        message: "Rental request retrieved successfully.",
        request: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental request.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| Review a request.
| Approval here does NOT automatically create a tenant or contract.
|--------------------------------------------------------------------------
*/

router.patch(
  "/rental-requests/:requestId",
  requireManagerPermission("review_requests"),
  async (req, res) => {
    const { requestId } = req.params;
    const { status, review_note } = req.body;

    if (!isPositiveInteger(requestId)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Approved or Rejected.",
      });
    }

    if (
      review_note !== undefined &&
      review_note !== null &&
      typeof review_note !== "string"
    ) {
      return res.status(400).json({
        message: "review_note must be text.",
      });
    }

    try {
      const result = await db.query(
        `UPDATE rental_requests rr
         SET
             status = $1,
             review_note = $2,
             reviewed_by = $3,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE rr.request_id = $4
           AND rr.status = 'Pending'
           AND EXISTS (
             SELECT 1
             FROM rental_services rs
             INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
             WHERE rs.rental_services_id = rr.rental_services_id
               AND ub.user_id = $3
           )
         RETURNING rr.*`,
        [status, optionalText(review_note), req.user.userId, requestId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Pending request not found or not assigned to your buildings.",
        });
      }

      return res.status(200).json({
        message: "Rental request reviewed successfully.",
        request: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to review rental request.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| 5. TENANTS
|--------------------------------------------------------------------------
| GET    /api/manager/tenants
| GET    /api/manager/tenants/:tenantId
| POST   /api/manager/tenants
| PUT    /api/manager/tenants/:tenantId
| DELETE /api/manager/tenants/:tenantId
|
| Tenant access is limited to tenants who have a rental
| in one of the manager's assigned buildings.
|--------------------------------------------------------------------------
*/

router.get(
  "/tenants",
  requireManagerPermission("manage_tenants"),
  async (req, res) => {
    const { building_id } = req.query;

    if (building_id !== undefined && !isPositiveInteger(building_id)) {
      return res.status(400).json({
        message: "Invalid building_id.",
      });
    }

    try {
      const values = [req.user.userId];

      let query = `
      SELECT DISTINCT
          t.tenant_id,
          t.tenant_name,
          t.address,
          t.nic,
          t.tenant_type,
          t.phone,
          t.note
      FROM tenant t
      INNER JOIN rental r
          ON r.tenant_id = t.tenant_id
      INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
      INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
      WHERE ub.user_id = $1
    `;

      if (building_id !== undefined) {
        values.push(Number(building_id));
        query += ` AND rs.building_id = $${values.length}`;
      }

      query += ` ORDER BY t.tenant_id DESC`;

      const result = await db.query(query, values);

      return res.status(200).json({
        message: "Tenants retrieved successfully.",
        count: result.rows.length,
        tenants: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve tenants.", error);
    }
  },
);

router.get(
  "/tenants/:tenantId",
  requireManagerPermission("manage_tenants"),
  async (req, res) => {
    const { tenantId } = req.params;

    if (!isPositiveInteger(tenantId)) {
      return res.status(400).json({
        message: "Invalid tenant ID.",
      });
    }

    try {
      const result = await db.query(
        `SELECT DISTINCT
          t.tenant_id,
          t.tenant_name,
          t.address,
          t.nic,
          t.tenant_type,
          t.phone,
          t.note
       FROM tenant t
       INNER JOIN rental r
          ON r.tenant_id = t.tenant_id
       INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
       INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
       WHERE t.tenant_id = $1
         AND ub.user_id = $2`,
        [tenantId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Tenant not found or not associated with your buildings.",
        });
      }

      return res.status(200).json({
        message: "Tenant retrieved successfully.",
        tenant: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve tenant.", error);
    }
  },
);
/*
|--------------------------------------------------------------------------
| Register a Tenant and Create Rental Contract
|--------------------------------------------------------------------------
| POST /api/manager/tenants/register-and-rent
|--------------------------------------------------------------------------
*/

router.post(
  "/tenants/register-and-rent",
  requireManagerPermission("manage_tenants"),
  requireManagerPermission("manage_rentals"),
  async (req, res) => {
    console.log("Hello ");
    const {
      tenant_name,
      address,
      nic,
      tenant_type,
      phone,
      note,
      rental_services_id,
      start_date,
      end_date,
    } = req.body;

    // Validate tenant information
    if (!isValidText(tenant_name)) {
      return res.status(400).json({
        message: "tenant_name is required.",
      });
    }

    // Validate rental service
    if (!isPositiveInteger(rental_services_id)) {
      return res.status(400).json({
        message: "Valid rental_services_id is required.",
      });
    }

    if (!isValidText(start_date)) {
      return res.status(400).json({
        message: "start_date is required.",
      });
    }

    const isValidDate = (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

    if (!isValidDate(start_date)) {
      return res.status(400).json({
        message: "Invalid start_date. Use YYYY-MM-DD.",
      });
    }

    if (end_date && !isValidDate(end_date)) {
      return res.status(400).json({
        message: "Invalid end_date. Use YYYY-MM-DD.",
      });
    }

    if (end_date && end_date < start_date) {
      return res.status(400).json({
        message: "end_date cannot be before start_date.",
      });
    }

    //const client = await db.connect();

    try {
      await db.query("BEGIN");

      // 1. Verify service belongs to manager and lock it.
      const serviceResult = await db.query(
        `SELECT
            rs.rental_services_id,
            rs.building_id,
            rs.services_no,
            rs.rent,
            rs.status,
            b.building_name
         FROM rental_services rs
         INNER JOIN building b
            ON b.building_id = rs.building_id
         INNER JOIN user_buildings ub
            ON ub.building_id = rs.building_id
         WHERE rs.rental_services_id = $1
           AND ub.user_id = $2
         FOR UPDATE OF rs`,
        [rental_services_id, req.user.userId],
      );

      if (serviceResult.rows.length === 0) {
        await db.query("ROLLBACK");

        return res.status(404).json({
          message:
            "Rental service not found or not assigned to your buildings.",
        });
      }

      const service = serviceResult.rows[0];

      // 2. Check availability.
      if (service.status !== "Available") {
        await db.query("ROLLBACK");

        return res.status(409).json({
          message: "This rental service is not available.",
        });
      }

      // 3. Insert tenant.
      const tenantResult = await db.query(
        `INSERT INTO tenant (
            tenant_name,
            address,
            nic,
            tenant_type,
            phone,
            note
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          tenant_name.trim(),
          optionalText(address),
          optionalText(nic),
          optionalText(tenant_type),
          optionalText(phone),
          optionalText(note),
        ],
      );

      const tenant = tenantResult.rows[0];

      // 4. Create rental contract.
      const rentalResult = await db.query(
        `INSERT INTO rental (
            tenant_id,
            rental_services_id,
            start_date,
            end_date,
            status,
            agreed_rent
         )
         VALUES ($1, $2, $3, $4, 'Active', $5)
         RETURNING *`,
        [
          tenant.tenant_id,
          rental_services_id,
          start_date,
          end_date || null,
          service.rent,
        ],
      );

      const rental = rentalResult.rows[0];

      // 5. Mark service as occupied.
      await db.query(
        `UPDATE rental_services
         SET status = 'Occupied'
         WHERE rental_services_id = $1`,
        [rental_services_id],
      );

      await db.query("COMMIT");

      return res.status(201).json({
        message: "Tenant registered and rental contract created successfully.",

        tenant,

        rental,

        building: {
          building_id: service.building_id,
          building_name: service.building_name,
        },

        rental_service: {
          rental_services_id: service.rental_services_id,
          services_no: service.services_no,
          agreed_rent: rental.agreed_rent,
        },
      });
    } catch (error) {
      await db.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          message: "A tenant with this unique information already exists.",
        });
      }

      if (error.code === "23503") {
        return res.status(400).json({
          message: "Invalid tenant or rental reference.",
        });
      }

      return serverError(
        res,
        "Failed to register tenant and create rental.",
        error,
      );
    } finally {
      db.release();
    }
  },
);

/*
router.post(
  "/tenants",
  requireManagerPermission("manage_tenants"),
  async (req, res) => {
    const { tenant_name, address, nic, tenant_type, phone, note } = req.body;

    if (!isValidText(tenant_name)) {
      return res.status(400).json({
        message: "tenant_name is required.",
      });
    }

    try {
      const result = await db.query(
        `INSERT INTO tenant (
          tenant_name,
          address,
          nic,
          tenant_type,
          phone,
          note
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
        [
          tenant_name.trim(),
          optionalText(address),
          optionalText(nic),
          optionalText(tenant_type),
          optionalText(phone),
          optionalText(note),
        ],
      );

      return res.status(201).json({
        message: "Tenant created successfully.",
        tenant: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "A tenant with this unique information already exists.",
        });
      }

      return serverError(res, "Failed to create tenant.", error);
    }
  },
);
*/
router.put(
  "/tenants/:tenantId",
  requireManagerPermission("manage_tenants"),
  async (req, res) => {
    const { tenantId } = req.params;

    const { tenant_name, address, nic, tenant_type, phone, note } = req.body;

    if (!isPositiveInteger(tenantId)) {
      return res.status(400).json({
        message: "Invalid tenant ID.",
      });
    }

    if (!isValidText(tenant_name)) {
      return res.status(400).json({
        message: "tenant_name is required.",
      });
    }

    try {
      const result = await db.query(
        `UPDATE tenant t
       SET
           tenant_name = $1,
           address = $2,
           nic = $3,
           tenant_type = $4,
           phone = $5,
           note = $6
       WHERE t.tenant_id = $7
         AND EXISTS (
           SELECT 1
           FROM rental r
           INNER JOIN rental_services rs
              ON rs.rental_services_id = r.rental_services_id
           INNER JOIN user_buildings ub
              ON ub.building_id = rs.building_id
           WHERE r.tenant_id = t.tenant_id
             AND ub.user_id = $8
         )
       RETURNING t.*`,
        [
          tenant_name.trim(),
          optionalText(address),
          optionalText(nic),
          optionalText(tenant_type),
          optionalText(phone),
          optionalText(note),
          tenantId,
          req.user.userId,
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Tenant not found or not associated with your buildings.",
        });
      }

      return res.status(200).json({
        message: "Tenant updated successfully.",
        tenant: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "A tenant with this unique information already exists.",
        });
      }

      return serverError(res, "Failed to update tenant.", error);
    }
  },
);

router.delete(
  "/tenants/:tenantId",
  requireManagerPermission("manage_tenants"),
  async (req, res) => {
    const { tenantId } = req.params;

    if (!isPositiveInteger(tenantId)) {
      return res.status(400).json({
        message: "Invalid tenant ID.",
      });
    }

    try {
      const result = await db.query(
        `DELETE FROM tenant t
       WHERE t.tenant_id = $1
         AND EXISTS (
           SELECT 1
           FROM rental r
           INNER JOIN rental_services rs
              ON rs.rental_services_id = r.rental_services_id
           INNER JOIN user_buildings ub
              ON ub.building_id = rs.building_id
           WHERE r.tenant_id = t.tenant_id
             AND ub.user_id = $2
         )
       RETURNING t.tenant_id`,
        [tenantId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Tenant not found or not associated with your buildings.",
        });
      }

      return res.status(200).json({
        message: "Tenant deleted successfully.",
        tenant_id: result.rows[0].tenant_id,
      });
    } catch (error) {
      if (error.code === "23503") {
        return res.status(409).json({
          message:
            "This tenant has related rental records and cannot be deleted.",
        });
      }

      return serverError(res, "Failed to delete tenant.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| 6. RENTALS / CONTRACTS
|--------------------------------------------------------------------------
| GET    /api/manager/rentals
| GET    /api/manager/rentals/:rentalId
| POST   /api/manager/rentals
| PATCH  /api/manager/rentals/:rentalId
|--------------------------------------------------------------------------
*/

router.get(
  "/rentals",
  requireManagerPermission("manage_rentals"),
  async (req, res) => {
    const { building_id, status } = req.query;

    if (building_id !== undefined && !isPositiveInteger(building_id)) {
      return res.status(400).json({
        message: "Invalid building_id.",
      });
    }

    const allowedStatuses = ["Active", "Completed", "Cancelled"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid rental status.",
        allowedStatuses,
      });
    }

    try {
      const values = [req.user.userId];

      let query = `
      SELECT
          r.rental_id,
          r.tenant_id,
          t.tenant_name,
          t.phone,
          r.rental_services_id,
          rs.building_id,
          b.building_name,
          rs.services_no,
          rs.rent,
          r.start_date,
          r.end_date,
          r.status
      FROM rental r
      INNER JOIN tenant t
          ON t.tenant_id = r.tenant_id
      INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
      INNER JOIN building b
          ON b.building_id = rs.building_id
      INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
      WHERE ub.user_id = $1
    `;

      if (building_id !== undefined) {
        values.push(Number(building_id));
        query += ` AND rs.building_id = $${values.length}`;
      }

      if (status !== undefined) {
        values.push(status);
        query += ` AND r.status = $${values.length}`;
      }

      query += ` ORDER BY r.rental_id DESC`;

      const result = await db.query(query, values);

      return res.status(200).json({
        message: "Rentals retrieved successfully.",
        count: result.rows.length,
        rentals: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rentals.", error);
    }
  },
);

router.get(
  "/rentals/:rentalId",
  requireManagerPermission("manage_rentals"),
  async (req, res) => {
    const { rentalId } = req.params;

    if (!isPositiveInteger(rentalId)) {
      return res.status(400).json({
        message: "Invalid rental ID.",
      });
    }

    try {
      const result = await db.query(
        `SELECT
          r.*,
          t.tenant_name,
          t.phone,
          rs.building_id,
          rs.services_no,
          rs.rent,
          b.building_name
       FROM rental r
       INNER JOIN tenant t
          ON t.tenant_id = r.tenant_id
       INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
       INNER JOIN building b
          ON b.building_id = rs.building_id
       INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
       WHERE r.rental_id = $1
         AND ub.user_id = $2`,
        [rentalId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Rental not found or not assigned to your buildings.",
        });
      }

      return res.status(200).json({
        message: "Rental retrieved successfully.",
        rental: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| Create a rental contract.
| The service must belong to the manager's assigned building.
| The service must be Available.
|--------------------------------------------------------------------------
*/

router.post(
  "/rentals",
  requireManagerPermission("manage_rentals"),
  async (req, res) => {
    const { tenant_id, rental_services_id, start_date, end_date } = req.body;

    if (
      !isPositiveInteger(tenant_id) ||
      !isPositiveInteger(rental_services_id) ||
      !isValidText(start_date)
    ) {
      return res.status(400).json({
        message: "tenant_id, rental_services_id, and start_date are required.",
      });
    }

    if (end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        message: "end_date cannot be before start_date.",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const serviceResult = await client.query(
        `SELECT
          rs.rental_services_id,
          rs.building_id,
          rs.status
       FROM rental_services rs
       INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
       WHERE rs.rental_services_id = $1
         AND ub.user_id = $2
       FOR UPDATE OF rs`,
        [rental_services_id, req.user.userId],
      );

      if (serviceResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message:
            "Rental service not found or not assigned to your buildings.",
        });
      }

      if (serviceResult.rows[0].status !== "Available") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Only an Available rental service can be rented.",
        });
      }

      const tenantResult = await client.query(
        `SELECT tenant_id
       FROM tenant
       WHERE tenant_id = $1`,
        [tenant_id],
      );

      if (tenantResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Tenant not found.",
        });
      }

      const activeRental = await client.query(
        `SELECT rental_id
       FROM rental
       WHERE rental_services_id = $1
         AND status = 'Active'
       LIMIT 1`,
        [rental_services_id],
      );

      if (activeRental.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "This rental service already has an active contract.",
        });
      }

      const rentalResult = await client.query(
        `INSERT INTO rental (
          tenant_id,
          rental_services_id,
          start_date,
          end_date,
          status
       )
       VALUES ($1, $2, $3, $4, 'Active')
       RETURNING *`,
        [tenant_id, rental_services_id, start_date, end_date || null],
      );

      await client.query(
        `UPDATE rental_services
       SET status = 'Occupied'
       WHERE rental_services_id = $1`,
        [rental_services_id],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Rental contract created successfully.",
        rental: rentalResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      return serverError(res, "Failed to create rental contract.", error);
    } finally {
      client.release();
    }
  },
);

/*
|--------------------------------------------------------------------------
| Update rental contract status or end date.
|--------------------------------------------------------------------------
*/

router.patch(
  "/rentals/:rentalId",
  requireManagerPermission("manage_rentals"),
  async (req, res) => {
    const { rentalId } = req.params;
    const { end_date, status } = req.body;

    if (!isPositiveInteger(rentalId)) {
      return res.status(400).json({
        message: "Invalid rental ID.",
      });
    }

    const allowedStatuses = ["Active", "Completed", "Cancelled"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid rental status.",
        allowedStatuses,
      });
    }

    const updates = [];
    const values = [];

    if (Object.hasOwn(req.body, "end_date")) {
      updates.push(`end_date = $${values.length + 1}`);
      values.push(end_date || null);
    }

    if (status !== undefined) {
      updates.push(`status = $${values.length + 1}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No editable fields provided.",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query(
        `SELECT
          r.rental_id,
          r.rental_services_id,
          r.start_date,
          r.end_date,
          r.status
       FROM rental r
       INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
       INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
       WHERE r.rental_id = $1
         AND ub.user_id = $2
       FOR UPDATE OF r`,
        [rentalId, req.user.userId],
      );

      if (currentResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Rental not found or not assigned to your buildings.",
        });
      }

      const currentRental = currentResult.rows[0];
      const newEndDate = Object.hasOwn(req.body, "end_date")
        ? end_date || null
        : currentRental.end_date;

      const newStatus = status || currentRental.status;

      if (
        newEndDate &&
        new Date(newEndDate) < new Date(currentRental.start_date)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "end_date cannot be before start_date.",
        });
      }

      values.push(rentalId);
      const rentalParam = `$${values.length}`;

      values.push(req.user.userId);
      const managerParam = `$${values.length}`;

      const result = await client.query(
        `UPDATE rental r
       SET ${updates.join(", ")}
       WHERE r.rental_id = ${rentalParam}
         AND EXISTS (
           SELECT 1
           FROM rental_services rs
           INNER JOIN user_buildings ub
              ON ub.building_id = rs.building_id
           WHERE rs.rental_services_id = r.rental_services_id
             AND ub.user_id = ${managerParam}
         )
       RETURNING r.*`,
        values,
      );

      if (newStatus !== "Active") {
        await client.query(
          `UPDATE rental_services
         SET status = 'Available'
         WHERE rental_services_id = $1
           AND NOT EXISTS (
             SELECT 1
             FROM rental
             WHERE rental_services_id = $1
               AND status = 'Active'
           )`,
          [currentRental.rental_services_id],
        );
      } else {
        await client.query(
          `UPDATE rental_services
         SET status = 'Occupied'
         WHERE rental_services_id = $1`,
          [currentRental.rental_services_id],
        );
      }

      await client.query("COMMIT");

      return res.status(200).json({
        message: "Rental contract updated successfully.",
        rental: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      return serverError(res, "Failed to update rental contract.", error);
    } finally {
      client.release();
    }
  },
);

/*
|--------------------------------------------------------------------------
| 7. RENTAL PAYMENTS
|--------------------------------------------------------------------------
| GET    /api/manager/rental-payments
| GET    /api/manager/rental-payments/:paymentId
| POST   /api/manager/rental-payments
| PATCH  /api/manager/rental-payments/:paymentId
|--------------------------------------------------------------------------
*/

router.get(
  "/rental-payments",
  requireManagerPermission("manage_rental_payments"),
  async (req, res) => {
    const { building_id, rental_id, status } = req.query;

    if (building_id !== undefined && !isPositiveInteger(building_id)) {
      return res.status(400).json({
        message: "Invalid building_id.",
      });
    }

    if (rental_id !== undefined && !isPositiveInteger(rental_id)) {
      return res.status(400).json({
        message: "Invalid rental_id.",
      });
    }

    const allowedStatuses = ["Paid", "Partial", "Pending"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid payment status.",
        allowedStatuses,
      });
    }

    try {
      const values = [req.user.userId];

      let query = `
      SELECT
          rp.rental_payment_id,
          rp.rental_id,
          r.tenant_id,
          t.tenant_name,
          rs.rental_services_id,
          rs.building_id,
          b.building_name,
          rs.services_no,
          rp.payment_month,
          rp.rent,
          rp.last_reading_meter,
          rp.current_reading_meter,
          rp.meter_unit_rate,
          rp.payment_date,
          rp.status,
          rp.paid_amount
      FROM rental_payment rp
      INNER JOIN rental r
          ON r.rental_id = rp.rental_id
      INNER JOIN tenant t
          ON t.tenant_id = r.tenant_id
      INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
      INNER JOIN building b
          ON b.building_id = rs.building_id
      INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
      WHERE ub.user_id = $1
    `;

      if (building_id !== undefined) {
        values.push(Number(building_id));
        query += ` AND rs.building_id = $${values.length}`;
      }

      if (rental_id !== undefined) {
        values.push(Number(rental_id));
        query += ` AND rp.rental_id = $${values.length}`;
      }

      if (status !== undefined) {
        values.push(status);
        query += ` AND rp.status = $${values.length}`;
      }

      query += ` ORDER BY rp.payment_month DESC, rp.rental_payment_id DESC`;

      const result = await db.query(query, values);

      return res.status(200).json({
        message: "Rental payments retrieved successfully.",
        count: result.rows.length,
        payments: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental payments.", error);
    }
  },
);

router.get(
  "/rental-payments/:paymentId",
  requireManagerPermission("manage_rental_payments"),
  async (req, res) => {
    const { paymentId } = req.params;

    if (!isPositiveInteger(paymentId)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    try {
      const result = await db.query(
        `SELECT
            rp.*,
            r.tenant_id,
            t.tenant_name,
            rs.building_id,
            rs.services_no,
            b.building_name
         FROM rental_payment rp
         INNER JOIN rental r
            ON r.rental_id = rp.rental_id
         INNER JOIN tenant t
            ON t.tenant_id = r.tenant_id
         INNER JOIN rental_services rs
            ON rs.rental_services_id = r.rental_services_id
         INNER JOIN building b
            ON b.building_id = rs.building_id
         INNER JOIN user_buildings ub
            ON ub.building_id = rs.building_id
         WHERE rp.rental_payment_id = $1
           AND ub.user_id = $2`,
        [paymentId, req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Payment not found or not assigned to your buildings.",
        });
      }

      return res.status(200).json({
        message: "Rental payment retrieved successfully.",
        payment: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve rental payment.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| Create a payment record.
| Rent is taken from the rental service, not from request body.
|--------------------------------------------------------------------------
*/

router.post(
  "/rental-payments",
  requireManagerPermission("manage_rental_payments"),
  async (req, res) => {
    const {
      rental_id,
      payment_month,
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate = 0,
      payment_date,
      paid_amount = 0,
    } = req.body;

    if (!isPositiveInteger(rental_id) || !isValidText(payment_month)) {
      return res.status(400).json({
        message: "rental_id and payment_month are required.",
      });
    }

    if (
      !Number.isFinite(Number(meter_unit_rate)) ||
      Number(meter_unit_rate) < 0
    ) {
      return res.status(400).json({
        message: "meter_unit_rate must be non-negative.",
      });
    }

    if (!Number.isFinite(Number(paid_amount)) || Number(paid_amount) < 0) {
      return res.status(400).json({
        message: "paid_amount must be non-negative.",
      });
    }

    if (
      last_reading_meter !== undefined &&
      last_reading_meter !== null &&
      (!Number.isFinite(Number(last_reading_meter)) ||
        Number(last_reading_meter) < 0)
    ) {
      return res.status(400).json({
        message: "Invalid last_reading_meter.",
      });
    }

    if (
      current_reading_meter !== undefined &&
      current_reading_meter !== null &&
      (!Number.isFinite(Number(current_reading_meter)) ||
        Number(current_reading_meter) < 0)
    ) {
      return res.status(400).json({
        message: "Invalid current_reading_meter.",
      });
    }

    if (
      last_reading_meter != null &&
      current_reading_meter != null &&
      Number(current_reading_meter) < Number(last_reading_meter)
    ) {
      return res.status(400).json({
        message: "Current meter reading cannot be less than the last reading.",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const rentalResult = await client.query(
        `SELECT
          r.rental_id,
          r.status AS rental_status,
          rs.rent,
          rs.rental_services_id
       FROM rental r
       INNER JOIN rental_services rs
          ON rs.rental_services_id = r.rental_services_id
       INNER JOIN user_buildings ub
          ON ub.building_id = rs.building_id
       WHERE r.rental_id = $1
         AND ub.user_id = $2`,
        [rental_id, req.user.userId],
      );

      if (rentalResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Rental not found or not assigned to your buildings.",
        });
      }

      const rental = rentalResult.rows[0];

      if (rental.rental_status !== "Active") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Payments can only be created for active rentals.",
        });
      }

      const existingPayment = await client.query(
        `SELECT rental_payment_id
       FROM rental_payment
       WHERE rental_id = $1
         AND payment_month = $2`,
        [rental_id, payment_month],
      );

      if (existingPayment.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "A payment record already exists for this rental and month.",
        });
      }

      const rent = Number(rental.rent);

      const meterUnits =
        last_reading_meter != null && current_reading_meter != null
          ? Number(current_reading_meter) - Number(last_reading_meter)
          : 0;

      const meterCharge = meterUnits * Number(meter_unit_rate);

      const totalAmount = rent + meterCharge;
      const paid = Number(paid_amount);

      if (paid > totalAmount) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "paid_amount cannot exceed the total payment amount.",
          totalAmount,
        });
      }

      let paymentStatus = "Pending";

      if (paid > 0 && paid < totalAmount) {
        paymentStatus = "Partial";
      }

      if (paid === totalAmount) {
        paymentStatus = "Paid";
      }

      const result = await client.query(
        `INSERT INTO rental_payment (
          rental_id,
          payment_month,
          rent,
          last_reading_meter,
          current_reading_meter,
          meter_unit_rate,
          payment_date,
          status,
          paid_amount
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          rental_id,
          payment_month,
          rent,
          last_reading_meter ?? null,
          current_reading_meter ?? null,
          Number(meter_unit_rate),
          payment_date ||
            (paid > 0 ? new Date().toISOString().slice(0, 10) : null),
          paymentStatus,
          paid,
        ],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Rental payment created successfully.",
        payment: result.rows[0],
        meter_units: meterUnits,
        meter_charge: meterCharge,
        total_amount: totalAmount,
        remaining_amount: totalAmount - paid,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          message: "A payment record already exists for this rental and month.",
        });
      }

      return serverError(res, "Failed to create rental payment.", error);
    } finally {
      client.release();
    }
  },
);

/*
|--------------------------------------------------------------------------
| Update a payment.
| Manager cannot change the rent amount.
|--------------------------------------------------------------------------
*/

router.patch(
  "/rental-payments/:paymentId",
  requireManagerPermission("manage_rental_payments"),
  async (req, res) => {
    const { paymentId } = req.params;

    const {
      last_reading_meter,
      current_reading_meter,
      meter_unit_rate,
      payment_date,
      paid_amount,
    } = req.body;

    if (!isPositiveInteger(paymentId)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    if (Object.hasOwn(req.body, "rent")) {
      return res.status(403).json({
        message: "Only Admin can change the rental amount.",
      });
    }

    const allowedFields = [
      "last_reading_meter",
      "current_reading_meter",
      "meter_unit_rate",
      "payment_date",
      "paid_amount",
    ];

    const providedFields = allowedFields.filter((field) =>
      Object.hasOwn(req.body, field),
    );

    if (providedFields.length === 0) {
      return res.status(400).json({
        message: "No editable fields provided.",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query(
        `SELECT
            rp.*,
            r.status AS rental_status,
            rs.building_id
         FROM rental_payment rp
         INNER JOIN rental r
            ON r.rental_id = rp.rental_id
         INNER JOIN rental_services rs
            ON rs.rental_services_id = r.rental_services_id
         INNER JOIN user_buildings ub
            ON ub.building_id = rs.building_id
         WHERE rp.rental_payment_id = $1
           AND ub.user_id = $2
         FOR UPDATE OF rp`,
        [paymentId, req.user.userId],
      );

      if (currentResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Payment not found or not assigned to your buildings.",
        });
      }

      const current = currentResult.rows[0];

      const lastReading = Object.hasOwn(req.body, "last_reading_meter")
        ? last_reading_meter
        : current.last_reading_meter;

      const currentReading = Object.hasOwn(req.body, "current_reading_meter")
        ? current_reading_meter
        : current.current_reading_meter;

      const unitRate = Object.hasOwn(req.body, "meter_unit_rate")
        ? meter_unit_rate
        : current.meter_unit_rate;

      const paidAmount = Object.hasOwn(req.body, "paid_amount")
        ? paid_amount
        : current.paid_amount;

      if (
        lastReading != null &&
        (!Number.isFinite(Number(lastReading)) || Number(lastReading) < 0)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invalid last_reading_meter.",
        });
      }

      if (
        currentReading != null &&
        (!Number.isFinite(Number(currentReading)) || Number(currentReading) < 0)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invalid current_reading_meter.",
        });
      }

      if (
        lastReading != null &&
        currentReading != null &&
        Number(currentReading) < Number(lastReading)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            "Current meter reading cannot be less than the last reading.",
        });
      }

      if (!Number.isFinite(Number(unitRate)) || Number(unitRate) < 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "meter_unit_rate must be non-negative.",
        });
      }

      if (!Number.isFinite(Number(paidAmount)) || Number(paidAmount) < 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "paid_amount must be non-negative.",
        });
      }

      const meterUnits =
        lastReading != null && currentReading != null
          ? Number(currentReading) - Number(lastReading)
          : 0;

      const totalAmount = Number(current.rent) + meterUnits * Number(unitRate);

      if (Number(paidAmount) > totalAmount) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "paid_amount cannot exceed the total payment amount.",
          totalAmount,
        });
      }

      let paymentStatus = "Pending";

      if (Number(paidAmount) > 0 && Number(paidAmount) < totalAmount) {
        paymentStatus = "Partial";
      }

      if (Number(paidAmount) === totalAmount) {
        paymentStatus = "Paid";
      }

      const updates = [];
      const values = [];

      if (Object.hasOwn(req.body, "last_reading_meter")) {
        values.push(lastReading);
        updates.push(`last_reading_meter = $${values.length}`);
      }

      if (Object.hasOwn(req.body, "current_reading_meter")) {
        values.push(currentReading);
        updates.push(`current_reading_meter = $${values.length}`);
      }

      if (Object.hasOwn(req.body, "meter_unit_rate")) {
        values.push(Number(unitRate));
        updates.push(`meter_unit_rate = $${values.length}`);
      }

      if (Object.hasOwn(req.body, "payment_date")) {
        values.push(payment_date || null);
        updates.push(`payment_date = $${values.length}`);
      }

      if (Object.hasOwn(req.body, "paid_amount")) {
        values.push(Number(paidAmount));
        updates.push(`paid_amount = $${values.length}`);
      }

      // Keep payment status consistent with the amount paid.
      values.push(paymentStatus);
      updates.push(`status = $${values.length}`);

      values.push(paymentId);
      const paymentParam = `$${values.length}`;

      values.push(req.user.userId);
      const managerParam = `$${values.length}`;

      const result = await client.query(
        `UPDATE rental_payment rp
         SET ${updates.join(", ")}
         WHERE rp.rental_payment_id = ${paymentParam}
           AND EXISTS (
             SELECT 1
             FROM rental r
             INNER JOIN rental_services rs
                ON rs.rental_services_id = r.rental_services_id
             INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
             WHERE r.rental_id = rp.rental_id
               AND ub.user_id = ${managerParam}
           )
         RETURNING rp.*`,
        values,
      );

      await client.query("COMMIT");

      return res.status(200).json({
        message: "Rental payment updated successfully.",
        payment: result.rows[0],
        meter_units: meterUnits,
        meter_charge: meterUnits * Number(unitRate),
        total_amount: totalAmount,
        remaining_amount: totalAmount - Number(paidAmount),
      });
    } catch (error) {
      await client.query("ROLLBACK");

      return serverError(res, "Failed to update rental payment.", error);
    } finally {
      client.release();
    }
  },
);

/*
|--------------------------------------------------------------------------
| 8. MANAGER DASHBOARD
|--------------------------------------------------------------------------
| GET /api/manager/dashboard
|--------------------------------------------------------------------------
*/

router.get(
  "/dashboard",
  requireManagerPermission("view_buildings"),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT
          (
            SELECT COUNT(*)
            FROM user_buildings
            WHERE user_id = $1
          ) AS total_buildings,

          (
            SELECT COUNT(*)
            FROM rental_services rs
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
          ) AS total_services,

          (
            SELECT COUNT(*)
            FROM rental_services rs
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
              AND rs.status = 'Available'
          ) AS available_services,

          (
            SELECT COUNT(*)
            FROM rental_services rs
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
              AND rs.status = 'Occupied'
          ) AS occupied_services,

          (
            SELECT COUNT(*)
            FROM rental_requests rr
            INNER JOIN rental_services rs
                ON rs.rental_services_id = rr.rental_services_id
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
              AND rr.status = 'Pending'
          ) AS pending_requests,

          (
            SELECT COUNT(*)
            FROM rental r
            INNER JOIN rental_services rs
                ON rs.rental_services_id = r.rental_services_id
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
              AND r.status = 'Active'
          ) AS active_rentals,

          (
            SELECT COUNT(*)
            FROM rental_payment rp
            INNER JOIN rental r
                ON r.rental_id = rp.rental_id
            INNER JOIN rental_services rs
                ON rs.rental_services_id = r.rental_services_id
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
              AND rp.status = 'Pending'
          ) AS pending_payments,

          (
            SELECT COALESCE(SUM(rp.rent), 0)
            FROM rental_payment rp
            INNER JOIN rental r
                ON r.rental_id = rp.rental_id
            INNER JOIN rental_services rs
                ON rs.rental_services_id = r.rental_services_id
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
          ) AS total_billed_rent,

          (
            SELECT COALESCE(SUM(rp.paid_amount), 0)
            FROM rental_payment rp
            INNER JOIN rental r
                ON r.rental_id = rp.rental_id
            INNER JOIN rental_services rs
                ON rs.rental_services_id = r.rental_services_id
            INNER JOIN user_buildings ub
                ON ub.building_id = rs.building_id
            WHERE ub.user_id = $1
          ) AS total_collected`,
        [req.user.userId],
      );

      return res.status(200).json({
        message: "Manager dashboard retrieved successfully.",
        dashboard: result.rows[0],
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve manager dashboard.", error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| 9. BUILDING-WISE SUMMARY REPORT
|--------------------------------------------------------------------------
| GET /api/manager/reports/buildings
|--------------------------------------------------------------------------
*/

router.get(
  "/reports/buildings",
  requireManagerPermission("view_reports"),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT
          b.building_id,
          b.building_name,
          b.location,

          COUNT(DISTINCT rs.rental_services_id)
              AS total_services,

          COUNT(DISTINCT rs.rental_services_id)
              FILTER (WHERE rs.status = 'Available')
              AS available_services,

          COUNT(DISTINCT rs.rental_services_id)
              FILTER (WHERE rs.status = 'Occupied')
              AS occupied_services,

          COUNT(DISTINCT r.rental_id)
              FILTER (WHERE r.status = 'Active')
              AS active_rentals,

          COUNT(DISTINCT rr.request_id)
              FILTER (WHERE rr.status = 'Pending')
              AS pending_requests,

          COALESCE(SUM(DISTINCT rp.paid_amount), 0)
              AS collected_amount

       FROM user_buildings ub
       INNER JOIN building b
          ON b.building_id = ub.building_id
       LEFT JOIN rental_services rs
          ON rs.building_id = b.building_id
       LEFT JOIN rental r
          ON r.rental_services_id = rs.rental_services_id
       LEFT JOIN rental_requests rr
          ON rr.rental_services_id = rs.rental_services_id
       LEFT JOIN rental_payment rp
          ON rp.rental_id = r.rental_id
       WHERE ub.user_id = $1
       GROUP BY
          b.building_id,
          b.building_name,
          b.location
       ORDER BY b.building_id`,
        [req.user.userId],
      );

      return res.status(200).json({
        message: "Building reports retrieved successfully.",
        count: result.rows.length,
        reports: result.rows,
      });
    } catch (error) {
      return serverError(res, "Failed to retrieve building reports.", error);
    }
  },
);

export default router;
