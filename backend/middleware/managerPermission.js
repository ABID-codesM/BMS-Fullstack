import db from "../db.js";

// Default permissions for a new Manager
const defaultPermissions = {
  view_buildings: true,
  manage_rental_services: true,
  change_rent: false,
  manage_tenants: true,
  manage_rentals: true,
  manage_rental_payments: true,
  review_requests: true,
  view_reports: true,
};

// Middleware to check Manager permissions
export const requireManagerPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Ensure the user is a Building Manager
      if (!req.user || req.user.role !== "Building Manager") {
        return res.status(403).json({
          message: "Access denied. Building Manager account required.",
        });
      }

      // Check whether the requested permission is valid
      if (
        !Object.prototype.hasOwnProperty.call(defaultPermissions, permission)
      ) {
        console.log(permission);
        return res.status(500).json({
          message: "Invalid permission configuration.",
        });
      }

      // Get the Manager's saved permissions
      const result = await db.query(
        `SELECT *
         FROM manager_permissions
         WHERE user_id = $1`,
        [req.user.userId],
      );

      // Use default permissions if no record exists
      const permissions = result.rows[0] ?? defaultPermissions;

      // Store permissions for use by other routes
      req.managerPermissions = permissions;

      // Check the requested permission
      if (permissions[permission] !== true) {
        return res.status(403).json({
          message: "Access denied. You do not have this permission.",
          requiredPermission: permission,
        });
      }

      next();
    } catch (error) {
      console.error("Manager permission error:", error.message);

      return res.status(500).json({
        message: "Failed to verify Manager permissions.",
      });
    }
  };
};
