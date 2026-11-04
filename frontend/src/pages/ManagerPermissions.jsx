import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./ManagerPermissions.css";

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

const permissionLabels = {
  view_buildings: "View Buildings",
  manage_rental_services: "Manage Rental Services",
  change_rent: "Change Rental Amount",
  manage_tenants: "Manage Tenants",
  manage_rentals: "Manage Rentals",
  manage_rental_payments: "Manage Rental Payments",
  review_requests: "Review Rental Requests",
  view_reports: "View Reports",
};

function ManagerPermissions() {
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadManagers() {
      try {
        setError("");

        const response = await api.get("/users/managers/permissions");
        const data = response.data;

        const managerList = Array.isArray(data)
          ? data
          : Array.isArray(data.managers)
            ? data.managers
            : Array.isArray(data.users)
              ? data.users
              : [];

        setManagers(managerList);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Failed to load Managers. Please try again.",
        );
      } finally {
        setLoadingManagers(false);
      }
    }

    loadManagers();
  }, []);

  async function loadPermissions(managerId) {
    if (!managerId) return;

    try {
      setLoadingPermissions(true);
      setError("");
      setMessage("");

      const response = await api.get(
        `/users/managers/${managerId}/permissions`,
      );

      const data = response.data.permissions ?? response.data;

      setPermissions({
        ...defaultPermissions,
        ...data,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load this Manager's permissions.",
      );
    } finally {
      setLoadingPermissions(false);
    }
  }

  function handleManagerChange(event) {
    const managerId = event.target.value;

    setSelectedManagerId(managerId);
    setPermissions(defaultPermissions);
    setMessage("");
    setError("");

    if (managerId) {
      loadPermissions(managerId);
    }
  }

  function handlePermissionChange(event) {
    const { name, checked } = event.target;

    setPermissions((previous) => ({
      ...previous,
      [name]: checked,
    }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!selectedManagerId) {
      setError("Please select a Manager first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.put(
        `/users/managers/${selectedManagerId}/permissions`,
        permissions,
      );

      setMessage("Manager permissions saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save permissions. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selectedManagerId) return;

    const confirmed = window.confirm(
      "Reset this Manager's saved permissions to system defaults?",
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setSaving(true);

      await api.delete(`/users/managers/${selectedManagerId}/permissions`);

      await loadPermissions(selectedManagerId);

      setMessage("Saved permissions removed. Default permissions apply.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset permissions.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingManagers) {
    return <div className="mp-page">Loading Managers...</div>;
  }

  return (
    <section className="mp-page">
      <header className="mp-header">
        <div>
          <h1>Manager Permissions</h1>
          <p>Control which operations each Building Manager can perform.</p>
        </div>
      </header>

      {error && (
        <div className="mp-message mp-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="mp-message mp-success" role="status">
          {message}
        </div>
      )}

      <div className="mp-card">
        <label className="mp-label" htmlFor="manager-select">
          Select Building Manager
        </label>

        <select
          id="manager-select"
          className="mp-select"
          value={selectedManagerId}
          onChange={handleManagerChange}
        >
          <option value="">-- Select a Manager --</option>

          {managers.map((manager) => {
            const id = manager.user_id ?? manager.id;
            const name =
              manager.full_name ??
              manager.name ??
              manager.email ??
              `Manager ${id}`;

            return (
              <option key={id} value={id}>
                {name} (ID: {id})
              </option>
            );
          })}
        </select>

        {managers.length === 0 && (
          <p className="mp-hint">No Managers were returned by the API.</p>
        )}
      </div>

      {selectedManagerId && (
        <form className="mp-card" onSubmit={handleSave}>
          <div className="mp-permissions-header">
            <div>
              <h2>Access Permissions</h2>
              <p>Enable or disable the permissions for this Manager.</p>
            </div>

            <span className="mp-count">
              {
                Object.values(permissions).filter((value) => value === true)
                  .length
              }{" "}
              / {Object.keys(permissionLabels).length} enabled
            </span>
          </div>

          {loadingPermissions ? (
            <p className="mp-hint">Loading permissions...</p>
          ) : (
            <div className="mp-permissions-list">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label className="mp-permission-row" key={key}>
                  <span>
                    <strong>{label}</strong>
                    {key === "change_rent" && (
                      <small>
                        Allows the Manager to change rental amounts.
                      </small>
                    )}
                  </span>

                  <input
                    type="checkbox"
                    name={key}
                    checked={permissions[key] === true}
                    onChange={handlePermissionChange}
                    disabled={saving}
                  />
                </label>
              ))}
            </div>
          )}

          <div className="mp-actions">
            <button
              type="submit"
              className="mp-button mp-save"
              disabled={saving || loadingPermissions}
            >
              {saving ? "Saving..." : "Save Permissions"}
            </button>

            <button
              type="button"
              className="mp-button mp-reset"
              onClick={handleReset}
              disabled={saving || loadingPermissions}
            >
              Reset to Defaults
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default ManagerPermissions;
