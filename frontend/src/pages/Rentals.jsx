import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./Rentals.css";

const initialForm = {
  tenant_id: "",
  rental_services_id: "",
  start_date: "",
  end_date: "",
  status: "Active",
};

function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [services, setServices] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [rentalsResponse, tenantsResponse, servicesResponse] =
        await Promise.all([
          api.get("/rentals"),
          api.get("/tenants"),
          api.get("/rental-services"),
        ]);

      setRentals(rentalsResponse.data);
      setTenants(tenantsResponse.data);
      setServices(servicesResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load rental information.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(rental) {
    setEditingId(rental.rental_id);

    setForm({
      tenant_id: String(rental.tenant_id ?? ""),
      rental_services_id: String(rental.rental_services_id ?? ""),
      start_date: rental.start_date
        ? String(rental.start_date).slice(0, 10)
        : "",
      end_date: rental.end_date ? String(rental.end_date).slice(0, 10) : "",
      status: rental.status ?? "Active",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  const selectedService = services.find(
    (service) =>
      Number(service.rental_services_id) === Number(form.rental_services_id),
  );

  function isServiceAvailable(service) {
    if (!service) return false;

    // A service is selectable if it is Available.
    if (service.status === "Available") return true;

    // When editing, keep the current service selectable.
    if (
      editingId !== null &&
      Number(service.rental_services_id) === Number(form.rental_services_id)
    ) {
      return true;
    }

    return false;
  }

  function validateForm() {
    if (!form.tenant_id) {
      return "Please select a tenant.";
    }

    if (!form.rental_services_id) {
      return "Please select a rental service.";
    }

    if (!form.start_date) {
      return "Start date is required.";
    }

    if (form.end_date && form.end_date < form.start_date) {
      return "End date cannot be earlier than start date.";
    }

    if (!["Active", "Completed", "Cancelled"].includes(form.status)) {
      return "Please select a valid rental status.";
    }

    if (
      form.status === "Active" &&
      selectedService &&
      !isServiceAvailable(selectedService)
    ) {
      return "This rental service is not available for a new active rental.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      tenant_id: Number(form.tenant_id),
      rental_services_id: Number(form.rental_services_id),
      start_date: form.start_date,
      end_date: form.end_date || null,
      status: form.status,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await api.put(`/rentals/${editingId}`, payload);
        setSuccess("Rental updated successfully.");
      } else {
        await api.post("/rentals", payload);
        setSuccess("Rental created successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(initialForm);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save rental. Please check the information.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rental) {
    const confirmed = window.confirm(
      "Delete rental contract #${rental.rental_id} for ${rental.tenant_name}?",
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/rentals/${rental.rental_id}`);
      setSuccess("Rental deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this rental.");
    }
  }

  const filteredRentals = rentals.filter((rental) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = [
      rental.tenant_name,
      rental.services_no,
      rental.building_name,
      String(rental.rental_id ?? ""),
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(query),
    );

    const matchesStatus =
      statusFilter === "All" || rental.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = rentals.filter(
    (rental) => rental.status === "Active",
  ).length;

  const completedCount = rentals.filter(
    (rental) => rental.status === "Completed",
  ).length;

  const cancelledCount = rentals.filter(
    (rental) => rental.status === "Cancelled",
  ).length;

  return (
    <section className="rentals-page">
      <div className="rentals-header">
        <div>
          <h1>Rentals Management</h1>
          <p>Manage rental contracts, tenants, and rental units.</p>
        </div>

        <button
          type="button"
          className="rentals-primary-btn"
          onClick={openAddModal}
        >
          <span>＋</span> Add Rental
        </button>
      </div>

      {error && !modalOpen && (
        <div className="rentals-alert rentals-alert-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="rentals-alert rentals-alert-success">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      <div className="rentals-stats">
        <div className="rentals-stat-card">
          <span className="rentals-stat-icon">📄</span>
          <div>
            <p>Total Rentals</p>
            <h2>{rentals.length}</h2>
          </div>
        </div>

        <div className="rentals-stat-card">
          <span className="rentals-stat-icon">🟢</span>
          <div>
            <p>Active</p>
            <h2>{activeCount}</h2>
          </div>
        </div>

        <div className="rentals-stat-card">
          <span className="rentals-stat-icon">🔵</span>
          <div>
            <p>Completed</p>
            <h2>{completedCount}</h2>
          </div>
        </div>

        <div className="rentals-stat-card">
          <span className="rentals-stat-icon">🟠</span>
          <div>
            <p>Cancelled</p>
            <h2>{cancelledCount}</h2>
          </div>
        </div>
      </div>

      <div className="rentals-content-card">
        <div className="rentals-toolbar">
          <div className="rentals-search">
            <span>🔎</span>
            <input
              type="search"
              placeholder="Search tenant, service, building..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="rentals-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter rentals by status"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            type="button"
            className="rentals-refresh-btn"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="rentals-state">Loading rentals...</div>
        ) : filteredRentals.length === 0 ? (
          <div className="rentals-state">
            <span>📋</span>
            <h3>No Rentals Found</h3>
            <p>
              {rentals.length === 0
                ? "Add a rental contract to get started."
                : "Try changing your search or filter."}
            </p>
          </div>
        ) : (
          <div className="rentals-table-wrapper">
            <table className="rentals-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tenant</th>
                  <th>Service No.</th>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Monthly Rent</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRentals.map((rental) => (
                  <tr key={rental.rental_id}>
                    <td>#{rental.rental_id}</td>
                    <td className="rentals-tenant">{rental.tenant_name}</td>
                    <td>{rental.services_no}</td>
                    <td>{rental.building_name}</td>
                    <td>{rental.floor}</td>
                    <td className="rentals-rent">
                      {Number(rental.rent).toLocaleString()}
                    </td>
                    <td>
                      {rental.start_date
                        ? String(rental.start_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td>
                      {rental.end_date
                        ? String(rental.end_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`rentals-status rentals-status-${String(
                          rental.status,
                        ).toLowerCase()}`}
                      >
                        {rental.status}
                      </span>
                    </td>
                    <td>
                      <div className="rentals-actions">
                        <button
                          type="button"
                          className="rentals-edit-btn"
                          onClick={() => openEditModal(rental)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="rentals-delete-btn"
                          onClick={() => handleDelete(rental)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="rentals-table-footer">
            Showing {filteredRentals.length} of {rentals.length} rentals
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="rentals-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="rentals-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rentals-modal-title"
          >
            <div className="rentals-modal-header">
              <div>
                <h2 id="rentals-modal-title">
                  {editingId !== null ? "Edit Rental" : "Add Rental"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Update the rental contract information."
                    : "Enter the details of the new rental contract."}
                </p>
              </div>

              <button
                type="button"
                className="rentals-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form className="rentals-form" onSubmit={handleSubmit}>
              {error && (
                <div className="rentals-alert rentals-alert-error">{error}</div>
              )}

              <div className="rentals-form-grid">
                <div className="rentals-field">
                  <label htmlFor="tenant_id">Tenant *</label>
                  <select
                    id="tenant_id"
                    name="tenant_id"
                    value={form.tenant_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.tenant_id} value={tenant.tenant_id}>
                        {tenant.tenant_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rentals-field">
                  <label htmlFor="rental_services_id">Rental Service *</label>
                  <select
                    id="rental_services_id"
                    name="rental_services_id"
                    value={form.rental_services_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Rental Service</option>

                    {services
                      .filter((service) => {
                        if (service.status === "Available") {
                          return true;
                        }

                        return (
                          editingId !== null &&
                          Number(service.rental_services_id) ===
                            Number(form.rental_services_id)
                        );
                      })
                      .map((service) => (
                        <option
                          key={service.rental_services_id}
                          value={service.rental_services_id}
                        >
                          {service.services_no} — {service.building_name}
                          {" — "}
                          {Number(service.rent).toLocaleString()}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="rentals-field">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="rentals-field">
                  <label htmlFor="end_date">End Date</label>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    min={form.start_date || undefined}
                    value={form.end_date}
                    onChange={handleChange}
                  />
                  <small>Leave empty for an ongoing contract.</small>
                </div>

                <div className="rentals-field rentals-field-full">
                  <label htmlFor="status">Rental Status *</label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="rentals-form-actions">
                <button
                  type="button"
                  className="rentals-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rentals-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Rental"
                      : "Save Rental"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Rentals;
