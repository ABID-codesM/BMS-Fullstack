import express from "express";
import bcrypt from "bcrypt";
import db from "../db.js";

const router = express.Router();

// ==========================================
// Helper: Validate ID
// ==========================================
function isValidId(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

// ==========================================
// Helper: Check if Building Manager exists
// ==========================================
async function getManager(managerId) {
  const result = await db.query(
    `SELECT user_id, full_name, email, role, is_active, created_at
     FROM users
     WHERE user_id = $1
       AND role = 'Building Manager'`,
    [managerId],
  );

  return result.rows[0] || null;
}

// ==========================================
// 9. GET ALL MANAGER PERMISSIONS
// GET /api/users/managers/permissions
// ==========================================
router.get("/managers/permissions", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.is_active,
          mp.view_buildings,
          mp.manage_rental_services,
          mp.change_rent,
          mp.manage_tenants,
          mp.manage_rentals,
          mp.manage_rental_payments,
          mp.review_requests,
          mp.view_reports,
          mp.created_at AS permissions_created_at,
          mp.updated_at AS permissions_updated_at
       FROM users u
       LEFT JOIN manager_permissions mp
         ON u.user_id = mp.user_id
       WHERE u.role = 'Building Manager'
       ORDER BY u.user_id DESC`,
    );

    return res.status(200).json({
      message: "Manager permissions retrieved successfully.",
      count: result.rows.length,
      managers: result.rows,
    });
  } catch (error) {
    console.error("Get all manager permissions error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve manager permissions.",
    });
  }
});

// ==========================================
// 10. GET ONE MANAGER PERMISSIONS
// GET /api/users/managers/:id/permissions
// ==========================================
router.get("/managers/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    const result = await db.query(
      `SELECT
          u.user_id,
          u.full_name,
          u.email,
          mp.view_buildings,
          mp.manage_rental_services,
          mp.change_rent,
          mp.manage_tenants,
          mp.manage_rentals,
          mp.manage_rental_payments,
          mp.review_requests,
          mp.view_reports,
          mp.created_at,
          mp.updated_at
       FROM users u
       LEFT JOIN manager_permissions mp
         ON u.user_id = mp.user_id
       WHERE u.user_id = $1
         AND u.role = 'Building Manager'`,
      [id],
    );

    const row = result.rows[0];

    // If permissions have not been saved yet,
    // return the proposed default permissions.
    const permissions = {
      view_buildings: row.view_buildings ?? true,
      manage_rental_services: row.manage_rental_services ?? true,
      change_rent: row.change_rent ?? false,
      manage_tenants: row.manage_tenants ?? true,
      manage_rentals: row.manage_rentals ?? true,
      manage_rental_payments: row.manage_rental_payments ?? true,
      review_requests: row.review_requests ?? true,
      view_reports: row.view_reports ?? true,
    };

    return res.status(200).json({
      message: "Manager permissions retrieved successfully.",
      manager: {
        user_id: row.user_id,
        full_name: row.full_name,
        email: row.email,
      },
      permissions,
      saved: row.created_at !== null,
    });
  } catch (error) {
    console.error("Get manager permissions error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve manager permissions.",
    });
  }
});

// ==========================================
// 11. CREATE OR UPDATE MANAGER PERMISSIONS
// PUT /api/users/managers/:id/permissions
// ==========================================
router.put("/managers/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;

    const permissionFields = [
      "view_buildings",
      "manage_rental_services",
      "change_rent",
      "manage_tenants",
      "manage_rentals",
      "manage_rental_payments",
      "review_requests",
      "view_reports",
    ];

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    // Require every permission field and a boolean value.
    for (const field of permissionFields) {
      if (typeof req.body[field] !== "boolean") {
        return res.status(400).json({
          message: `${field} must be true or false.`,
        });
      }
    }

    const values = permissionFields.map((field) => req.body[field]);

    const result = await db.query(
      `INSERT INTO manager_permissions (
          user_id,
          view_buildings,
          manage_rental_services,
          change_rent,
          manage_tenants,
          manage_rentals,
          manage_rental_payments,
          review_requests,
          view_reports
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id)
       DO UPDATE SET
          view_buildings = EXCLUDED.view_buildings,
          manage_rental_services = EXCLUDED.manage_rental_services,
          change_rent = EXCLUDED.change_rent,
          manage_tenants = EXCLUDED.manage_tenants,
          manage_rentals = EXCLUDED.manage_rentals,
          manage_rental_payments = EXCLUDED.manage_rental_payments,
          review_requests = EXCLUDED.review_requests,
          view_reports = EXCLUDED.view_reports,
          updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [Number(id), ...values],
    );

    return res.status(200).json({
      message: "Manager permissions saved successfully.",
      manager: {
        user_id: manager.user_id,
        full_name: manager.full_name,
        email: manager.email,
      },
      permissions: result.rows[0],
    });
  } catch (error) {
    console.error("Save manager permissions error:", error.message);

    return res.status(500).json({
      message: "Failed to save manager permissions.",
    });
  }
});

// ==========================================
// 12. DELETE MANAGER PERMISSIONS
// DELETE /api/users/managers/:id/permissions
// ==========================================
router.delete("/managers/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    const result = await db.query(
      `DELETE FROM manager_permissions
       WHERE user_id = $1
       RETURNING user_id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No saved permissions found for this Manager.",
      });
    }

    return res.status(200).json({
      message: "Manager permissions deleted successfully.",
      user_id: Number(id),
    });
  } catch (error) {
    console.error("Delete manager permissions error:", error.message);

    return res.status(500).json({
      message: "Failed to delete manager permissions.",
    });
  }
});

export default router;

// ==========================================
// 1. CREATE BUILDING MANAGER
// POST /api/users/managers
// ==========================================
router.post("/managers", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Full name, valid email and password (minimum 8 characters) are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users
        (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'Building Manager')
       RETURNING user_id, full_name, email, role, is_active, created_at`,
      [full_name.trim(), normalizedEmail, passwordHash],
    );

    return res.status(201).json({
      message: "Building Manager created successfully.",
      manager: result.rows[0],
    });
  } catch (error) {
    console.error("Create manager error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    return res.status(500).json({
      message: "Failed to create Building Manager.",
    });
  }
});

// ==========================================
// 2. GET ALL BUILDING MANAGERS
// GET /api/users/managers
// ==========================================
router.get("/managers", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.role,
          u.is_active,
          u.created_at,
          COUNT(ub.building_id)::INTEGER AS assigned_buildings
       FROM users u
       LEFT JOIN user_buildings ub
         ON u.user_id = ub.user_id
       WHERE u.role = 'Building Manager'
       GROUP BY
          u.user_id,
          u.full_name,
          u.email,
          u.role,
          u.is_active,
          u.created_at
       ORDER BY u.user_id DESC`,
    );

    return res.status(200).json({
      message: "Building Managers retrieved successfully.",
      count: result.rows.length,
      managers: result.rows,
    });
  } catch (error) {
    console.error("Get managers error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve Building Managers.",
    });
  }
});

// ==========================================
// 3. GET ONE BUILDING MANAGER
// GET /api/users/managers/:id
// ==========================================
router.get("/managers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    return res.status(200).json({
      message: "Building Manager retrieved successfully.",
      manager,
    });
  } catch (error) {
    console.error("Get manager error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve Building Manager.",
    });
  }
});

// ==========================================
// 4. UPDATE BUILDING MANAGER
// PUT /api/users/managers/:id
// ==========================================
router.put("/managers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Full name and email are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let result;

    if (password !== undefined && password !== "") {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          message: "Password must contain at least 8 characters.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      result = await db.query(
        `UPDATE users
         SET full_name = $1,
             email = $2,
             password_hash = $3
         WHERE user_id = $4
           AND role = 'Building Manager'
         RETURNING user_id, full_name, email, role, is_active, created_at`,
        [full_name.trim(), normalizedEmail, passwordHash, id],
      );
    } else {
      result = await db.query(
        `UPDATE users
         SET full_name = $1,
             email = $2
         WHERE user_id = $3
           AND role = 'Building Manager'
         RETURNING user_id, full_name, email, role, is_active, created_at`,
        [full_name.trim(), normalizedEmail, id],
      );
    }

    return res.status(200).json({
      message: "Building Manager updated successfully.",
      manager: result.rows[0],
    });
  } catch (error) {
    console.error("Update manager error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    return res.status(500).json({
      message: "Failed to update Building Manager.",
    });
  }
});

// ==========================================
// 5. ACTIVATE / DEACTIVATE MANAGER
// PATCH /api/users/managers/:id/status
// ==========================================
router.patch("/managers/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        message: "is_active must be true or false.",
      });
    }

    const result = await db.query(
      `UPDATE users
       SET is_active = $1
       WHERE user_id = $2
         AND role = 'Building Manager'
       RETURNING user_id, full_name, email, role, is_active, created_at`,
      [is_active, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    return res.status(200).json({
      message: is_active
        ? "Building Manager activated successfully."
        : "Building Manager deactivated successfully.",
      manager: result.rows[0],
    });
  } catch (error) {
    console.error("Change manager status error:", error.message);

    return res.status(500).json({
      message: "Failed to change manager status.",
    });
  }
});

// ==========================================
// 6. ASSIGN / REPLACE MANAGER BUILDINGS
// PUT /api/users/managers/:id/buildings
//
// Body:
// { "building_ids": [1, 2, 3] }
//
// This replaces the manager's existing assignments.
// An empty array removes all assignments.
// ==========================================
router.put("/managers/:id/buildings", async (req, res) => {
  //const client = await db.connect();

  try {
    const { id } = req.params;
    const { building_ids } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    if (!Array.isArray(building_ids) || !building_ids.every(isValidId)) {
      return res.status(400).json({
        message: "building_ids must be an array of valid building IDs.",
      });
    }

    const uniqueBuildingIds = [...new Set(building_ids.map(Number))];

    await db.query("BEGIN");

    const managerResult = await db.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1
         AND role = 'Building Manager'
       FOR UPDATE`,
      [id],
    );

    if (managerResult.rows.length === 0) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    if (uniqueBuildingIds.length > 0) {
      const buildingsResult = await db.query(
        `SELECT building_id
         FROM building
         WHERE building_id = ANY($1::int[])`,
        [uniqueBuildingIds],
      );

      if (buildingsResult.rows.length !== uniqueBuildingIds.length) {
        await db.query("ROLLBACK");

        return res.status(400).json({
          message: "One or more building IDs do not exist.",
        });
      }
    }

    await db.query(
      `DELETE FROM user_buildings
       WHERE user_id = $1`,
      [id],
    );

    for (const buildingId of uniqueBuildingIds) {
      await db.query(
        `INSERT INTO user_buildings (user_id, building_id)
         VALUES ($1, $2)`,
        [id, buildingId],
      );
    }

    await db.query("COMMIT");

    const assignedResult = await db.query(
      `SELECT
          b.building_id,
          b.building_name,
          b.location,
          ub.assigned_at
       FROM user_buildings ub
       JOIN building b
         ON b.building_id = ub.building_id
       WHERE ub.user_id = $1
       ORDER BY b.building_id`,
      [id],
    );

    return res.status(200).json({
      message: "Manager building assignments updated successfully.",
      manager_id: Number(id),
      count: assignedResult.rows.length,
      buildings: assignedResult.rows,
    });
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {}

    console.error("Assign buildings error:", error.message);

    return res.status(500).json({
      message: "Failed to assign buildings to Manager.",
    });
  } finally {
    db.release();
  }
});

// ==========================================
// 7. GET BUILDINGS ASSIGNED TO MANAGER
// GET /api/users/managers/:id/buildings
// ==========================================
router.get("/managers/:id/buildings", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid manager ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    const result = await db.query(
      `SELECT
          b.building_id,
          b.building_name,
          b.location,
          ub.assigned_at
       FROM user_buildings ub
       JOIN building b
         ON b.building_id = ub.building_id
       WHERE ub.user_id = $1
       ORDER BY b.building_id`,
      [id],
    );

    return res.status(200).json({
      message: "Assigned buildings retrieved successfully.",
      manager_id: Number(id),
      count: result.rows.length,
      buildings: result.rows,
    });
  } catch (error) {
    console.error("Get assigned buildings error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve assigned buildings.",
    });
  }
});

// ==========================================
// 8. REMOVE ONE BUILDING ASSIGNMENT
// DELETE /api/users/managers/:id/buildings/:buildingId
// ==========================================
router.delete("/managers/:id/buildings/:buildingId", async (req, res) => {
  try {
    const { id, buildingId } = req.params;

    if (!isValidId(id) || !isValidId(buildingId)) {
      return res.status(400).json({
        message: "Invalid manager ID or building ID.",
      });
    }

    const manager = await getManager(id);

    if (!manager) {
      return res.status(404).json({
        message: "Building Manager not found.",
      });
    }

    const result = await db.query(
      `DELETE FROM user_buildings
         WHERE user_id = $1
           AND building_id = $2
         RETURNING user_id, building_id`,
      [id, buildingId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "This building is not assigned to the Manager.",
      });
    }

    return res.status(200).json({
      message: "Building assignment removed successfully.",
      assignment: result.rows[0],
    });
  } catch (error) {
    console.error("Remove building assignment error:", error.message);

    return res.status(500).json({
      message: "Failed to remove building assignment.",
    });
  }
});
