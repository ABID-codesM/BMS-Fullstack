/*import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./Managers.css";

function Managers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  // Get all Building Managers
  const fetchManagers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users/managers");

      setManagers(response.data.managers || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load Building Managers.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  // Handle form inputs
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create a new Manager
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.post("/users/managers", {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setSuccess(response.data.message || "Manager created successfully.");

      setFormData({
        full_name: "",
        email: "",
        password: "",
      });

      await fetchManagers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create Building Manager.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="managers-page">
      <div className="managers-header">
        <div>
          <h1>Manager Management</h1>
          <p>Create and manage Building Manager accounts.</p>
        </div>

        <div className="managers-count">
          <span>Total Managers</span>
          <strong>{managers.length}</strong>
        </div>
      </div>

      {error && (
        <div className="manager-alert manager-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="manager-alert manager-alert-success" role="status">
          {success}
        </div>
      )}

      <section className="manager-card">
        <div className="manager-card-header">
          <h2>Create New Manager</h2>
          <p>Enter the account information below.</p>
        </div>

        <form onSubmit={handleSubmit} className="manager-form">
          <div className="manager-form-grid">
            <div className="manager-field">
              <label htmlFor="manager-full-name">Full Name</label>
              <input
                id="manager-full-name"
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="manager-field">
              <label htmlFor="manager-email">Email Address</label>
              <input
                id="manager-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="manager@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="manager-field manager-password-field">
              <label htmlFor="manager-password">Password</label>
              <input
                id="manager-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="manager-primary-button"
            disabled={saving}
          >
            {saving ? "Creating..." : "+ Create Manager"}
          </button>
        </form>
      </section>

      <section className="manager-card manager-list-card">
        <div className="manager-card-header manager-list-header">
          <div>
            <h2>Building Managers</h2>
            <p>All registered Manager accounts.</p>
          </div>

          <button
            type="button"
            className="manager-secondary-button"
            onClick={fetchManagers}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="manager-empty-message">Loading managers...</p>
        ) : managers.length === 0 ? (
          <p className="manager-empty-message">No Building Managers found.</p>
        ) : (
          <div className="manager-table-wrapper">
            <table className="manager-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Assigned Buildings</th>
                  <th>Created At</th>
                </tr>
              </thead>

              <tbody>
                {managers.map((manager) => (
                  <tr key={manager.user_id}>
                    <td>#{manager.user_id}</td>
                    <td className="manager-name-cell">{manager.full_name}</td>
                    <td>{manager.email}</td>
                    <td>
                      <span
                        className={`manager-status ${
                          manager.is_active
                            ? "manager-status-active"
                            : "manager-status-inactive"
                        }`}
                      >
                        {manager.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{manager.assigned_buildings}</td>
                    <td>
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Managers;
*/

import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./Managers.css";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
};

function Managers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState(emptyForm);
  const [editingManager, setEditingManager] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ==========================================
  // BUILDING ASSIGNMENT STATES
  // ==========================================
  const [showBuildingPanel, setShowBuildingPanel] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);

  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState([]);

  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [savingBuildings, setSavingBuildings] = useState(false);

  // ==========================================
  // GET ALL MANAGERS
  // ==========================================
  const fetchManagers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users/managers");
      setManagers(response.data.managers || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load Building Managers.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  // ==========================================
  // HANDLE FORM INPUTS
  // ==========================================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // OPEN CREATE FORM
  // ==========================================
  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingManager(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ==========================================
  // OPEN EDIT FORM
  // ==========================================
  const openEditForm = (manager) => {
    setFormData({
      full_name: manager.full_name || "",
      email: manager.email || "",
      password: "",
    });

    setEditingManager(manager);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================
  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingManager(null);
    setFormData(emptyForm);
    setError("");
  };

  // ==========================================
  // CREATE OR UPDATE MANAGER
  // ==========================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const fullName = formData.full_name.trim();
    const email = formData.email.trim();

    if (!fullName || !email) {
      setError("Full name and email are required.");
      return;
    }

    if (!editingManager && formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (
      editingManager &&
      formData.password !== "" &&
      formData.password.length < 8
    ) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    try {
      setSaving(true);

      if (editingManager) {
        const payload = {
          full_name: fullName,
          email,
        };

        // Only send password if Admin entered a new one.
        if (formData.password !== "") {
          payload.password = formData.password;
        }

        const response = await api.put(
          `/users/managers/${editingManager.user_id}`,
          payload,
        );

        setSuccess(response.data.message || "Manager updated successfully.");
      } else {
        const response = await api.post("/users/managers", {
          full_name: fullName,
          email,
          password: formData.password,
        });

        setSuccess(response.data.message || "Manager created successfully.");
      }

      setShowForm(false);
      setEditingManager(null);
      setFormData(emptyForm);

      await fetchManagers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "The operation failed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIVATE / DEACTIVATE MANAGER
  // ==========================================
  const toggleManagerStatus = async (manager) => {
    const nextStatus = !manager.is_active;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } ${manager.full_name}'s account?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setProcessingId(manager.user_id);

    try {
      const response = await api.patch(
        `/users/managers/${manager.user_id}/status`,
        {
          is_active: nextStatus,
        },
      );

      setSuccess(
        response.data.message ||
          `Manager ${nextStatus ? "activated" : "deactivated"} successfully.`,
      );

      await fetchManagers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to change Manager status.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================
  // OPEN MANAGER PERMISSIONS PAGE
  // ==========================================
  const openPermissions = (managerId) => {
    window.location.href = `/manager-permissions?managerId=${managerId}`;
  };

  // ==========================================
  // OPEN BUILDING ASSIGNMENT PANEL
  // ==========================================
  const openBuildingPanel = async (manager) => {
    setSelectedManager(manager);
    setShowBuildingPanel(true);

    setBuildings([]);
    setSelectedBuildingIds([]);
    setError("");
    setSuccess("");
    setLoadingBuildings(true);

    try {
      // Get all buildings
      const buildingsResponse = await api.get("/buildings");

      const allBuildings = Array.isArray(buildingsResponse.data)
        ? buildingsResponse.data
        : buildingsResponse.data.buildings || [];

      setBuildings(allBuildings);

      // Get buildings already assigned to this manager
      const assignedResponse = await api.get(
        `/users/managers/${manager.user_id}/buildings`,
      );

      const assignedBuildings = Array.isArray(assignedResponse.data)
        ? assignedResponse.data
        : assignedResponse.data.buildings || [];

      setSelectedBuildingIds(
        assignedBuildings.map((building) => Number(building.building_id)),
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load buildings or existing assignments.",
      );
    } finally {
      setLoadingBuildings(false);
    }
  };

  // ==========================================
  // CLOSE BUILDING ASSIGNMENT PANEL
  // ==========================================
  const closeBuildingPanel = () => {
    if (savingBuildings) return;

    setShowBuildingPanel(false);
    setSelectedManager(null);
    setSelectedBuildingIds([]);
  };

  // ==========================================
  // SELECT / UNSELECT BUILDING
  // ==========================================
  const toggleBuildingSelection = (buildingId) => {
    const id = Number(buildingId);

    setSelectedBuildingIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  // ==========================================
  // SELECT ALL / DESELECT ALL BUILDINGS
  // ==========================================
  const toggleAllBuildings = () => {
    if (selectedBuildingIds.length === buildings.length) {
      setSelectedBuildingIds([]);
    } else {
      setSelectedBuildingIds(
        buildings.map((building) => Number(building.building_id)),
      );
    }
  };

  // ==========================================
  // SAVE BUILDING ASSIGNMENTS
  // ==========================================
  const saveBuildingAssignments = async () => {
    if (!selectedManager) return;

    setError("");
    setSuccess("");
    setSavingBuildings(true);

    try {
      const response = await api.put(
        `/users/managers/${selectedManager.user_id}/buildings`,
        {
          building_ids: selectedBuildingIds,
        },
      );

      setSuccess(
        response.data.message ||
          `Buildings assigned to ${selectedManager.full_name} successfully.`,
      );

      setShowBuildingPanel(false);
      setSelectedManager(null);

      await fetchManagers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to assign buildings. Please try again.",
      );
    } finally {
      setSavingBuildings(false);
    }
  };

  return (
    <div className="managers-page">
      {/* PAGE HEADER */}
      <header className="managers-header">
        <div className="managers-header-text">
          <span className="managers-eyebrow">ADMINISTRATION</span>

          <h1>Manager Management</h1>

          <p>Create accounts, update details and manage account status.</p>
        </div>

        <div className="managers-header-actions">
          <div className="managers-count">
            <span>Total Managers</span>
            <strong>{managers.length}</strong>
          </div>

          <button
            type="button"
            className="manager-primary-button"
            onClick={openCreateForm}
          >
            + Add Manager
          </button>
        </div>
      </header>

      {/* ALERTS */}
      {error && (
        <div className="manager-alert manager-alert-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="manager-alert manager-alert-success" role="status">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <section className="manager-card manager-editor">
          <div className="manager-card-header manager-editor-header">
            <div>
              <h2>
                {editingManager
                  ? "Edit Building Manager"
                  : "Create New Manager"}
              </h2>

              <p>
                {editingManager
                  ? "Update account information or enter a new password."
                  : "Enter the information for the new Manager account."}
              </p>
            </div>

            <button
              type="button"
              className="manager-close-button"
              onClick={closeForm}
              disabled={saving}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="manager-form-grid">
              <div className="manager-field">
                <label htmlFor="manager-full-name">Full Name *</label>

                <input
                  id="manager-full-name"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="manager-field">
                <label htmlFor="manager-email">Email Address *</label>

                <input
                  id="manager-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="manager@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="manager-field manager-password-field">
                <label htmlFor="manager-password">
                  {editingManager ? "New Password (optional)" : "Password *"}
                </label>

                <input
                  id="manager-password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={
                    editingManager
                      ? "Leave blank to keep current password"
                      : "Minimum 8 characters"
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required={!editingManager}
                />

                {editingManager && (
                  <small>
                    Leave blank if you do not want to change the password.
                  </small>
                )}
              </div>
            </div>

            <div className="manager-form-actions">
              <button
                type="submit"
                className="manager-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingManager
                    ? "Save Changes"
                    : "Create Manager"}
              </button>

              <button
                type="button"
                className="manager-secondary-button"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ==========================================
    BUILDING ASSIGNMENT PANEL
========================================== */}
      {showBuildingPanel && selectedManager && (
        <section className="manager-card manager-building-editor">
          <div className="manager-card-header manager-editor-header">
            <div>
              <h2>Assign Buildings</h2>

              <p>
                Select buildings for{" "}
                <strong>{selectedManager.full_name}</strong>.
              </p>
            </div>

            <button
              type="button"
              className="manager-close-button"
              onClick={closeBuildingPanel}
              disabled={savingBuildings}
              aria-label="Close building assignment"
            >
              ×
            </button>
          </div>

          {loadingBuildings ? (
            <div className="manager-empty-message">Loading buildings...</div>
          ) : buildings.length === 0 ? (
            <div className="manager-empty-message">
              <h3>No Buildings Found</h3>
              <p>Please create a building first.</p>
            </div>
          ) : (
            <>
              <div className="manager-building-toolbar">
                <span>
                  Selected Buildings:{" "}
                  <strong>{selectedBuildingIds.length}</strong>
                </span>

                <button
                  type="button"
                  className="manager-building-select-all"
                  onClick={toggleAllBuildings}
                >
                  {selectedBuildingIds.length === buildings.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="manager-building-grid">
                {buildings.map((building) => {
                  const buildingId = Number(building.building_id);

                  const isSelected = selectedBuildingIds.includes(buildingId);

                  return (
                    <label
                      key={buildingId}
                      className={`manager-building-option ${
                        isSelected ? "manager-building-option-selected" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBuildingSelection(buildingId)}
                      />

                      <span className="manager-building-info">
                        <strong>{building.building_name}</strong>

                        <small>Building ID: {building.building_id}</small>

                        <small>
                          Location: {building.location || "Not specified"}
                        </small>
                      </span>

                      <span className="manager-building-check">
                        {isSelected ? "Selected" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className="manager-form-actions">
            <button
              type="button"
              className="manager-primary-button"
              onClick={saveBuildingAssignments}
              disabled={loadingBuildings || savingBuildings}
            >
              {savingBuildings ? "Saving..." : "Save Assignments"}
            </button>

            <button
              type="button"
              className="manager-secondary-button"
              onClick={closeBuildingPanel}
              disabled={savingBuildings}
            >
              Cancel
            </button>
          </div>

          <p className="manager-building-warning">
            Note: Saving with no buildings selected will remove all existing
            building assignments for this Manager.
          </p>
        </section>
      )}

      {/* MANAGER LIST */}
      <section className="manager-card manager-list-card">
        <div className="manager-card-header manager-list-header">
          <div>
            <h2>Building Managers</h2>
            <p>View and manage registered Manager accounts.</p>
          </div>

          <button
            type="button"
            className="manager-secondary-button"
            onClick={fetchManagers}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="manager-empty-message">Loading managers...</div>
        ) : managers.length === 0 ? (
          <div className="manager-empty-message">
            <h3>No Managers Found</h3>
            <p>Create your first Building Manager account.</p>
          </div>
        ) : (
          <div className="manager-table-wrapper">
            <table className="manager-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Manager</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Buildings</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {managers.map((manager) => (
                  <tr key={manager.user_id}>
                    <td>#{manager.user_id}</td>

                    <td>
                      <div className="manager-identity">
                        <div className="manager-avatar">
                          {(manager.full_name || "M")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span className="manager-name-cell">
                          {manager.full_name}
                        </span>
                      </div>
                    </td>

                    <td className="manager-email-cell">{manager.email}</td>

                    <td>
                      <span
                        className={`manager-status ${
                          manager.is_active
                            ? "manager-status-active"
                            : "manager-status-inactive"
                        }`}
                      >
                        <span className="manager-status-dot" />
                        {manager.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <span className="manager-building-count">
                        {manager.assigned_buildings ?? 0}
                      </span>
                    </td>

                    <td>
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      <div className="manager-actions">
                        <button
                          type="button"
                          className="manager-action-button manager-action-edit"
                          onClick={() => openEditForm(manager)}
                          title="Edit Manager"
                          aria-label={`Edit ${manager.full_name}`}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="manager-action-button manager-action-buildings"
                          onClick={() => openBuildingPanel(manager)}
                          title="Assign Buildings"
                        >
                          Assign Buildings
                        </button>

                        <button
                          type="button"
                          className={`manager-action-button ${
                            manager.is_active
                              ? "manager-action-deactivate"
                              : "manager-action-activate"
                          }`}
                          onClick={() => toggleManagerStatus(manager)}
                          disabled={processingId === manager.user_id}
                          title={
                            manager.is_active
                              ? "Deactivate Manager"
                              : "Activate Manager"
                          }
                        >
                          {processingId === manager.user_id
                            ? "Saving..."
                            : manager.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="manager-action-button manager-action-permissions"
                          onClick={() => openPermissions(manager.user_id)}
                          title="Manage Permissions"
                        >
                          Permissions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="manager-list-footer">
          Showing {managers.length} Manager
          {managers.length === 1 ? "" : "s"}
        </div>
      </section>
    </div>
  );
}

export default Managers;
