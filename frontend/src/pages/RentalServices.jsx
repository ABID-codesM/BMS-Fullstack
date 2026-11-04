import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./RentalServices.css";

const initialForm = {
  building_id: "",
  services_no: "",
  description: "",
  floor: "",
  rent: "",
  status: "Available",
};

function RentalServices() {
  const [services, setServices] = useState([]);
  const [buildings, setBuildings] = useState([]);
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
      const [servicesResponse, buildingsResponse] = await Promise.all([
        api.get("/rental-services"),
        api.get("/buildings"),
      ]);

      setServices(servicesResponse.data);
      setBuildings(buildingsResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load rental services. Please try again.",
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

  function openEditModal(service) {
    setEditingId(service.rental_services_id);

    setForm({
      building_id: String(service.building_id ?? ""),
      services_no: service.services_no ?? "",
      description: service.description ?? "",
      floor: String(service.floor ?? ""),
      rent: String(service.rent ?? ""),
      status: service.status ?? "Available",
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

  function validateForm() {
    if (!form.building_id) {
      return "Please select a building.";
    }

    if (!form.services_no.trim()) {
      return "Service number is required.";
    }

    if (!Number.isSafeInteger(Number(form.floor)) || Number(form.floor) <= 0) {
      return "Floor must be a positive whole number.";
    }

    if (
      form.rent.trim() === "" ||
      !Number.isFinite(Number(form.rent)) ||
      Number(form.rent) < 0
    ) {
      return "Rent must be a valid non-negative number.";
    }

    if (!["Available", "Occupied", "Maintenance"].includes(form.status)) {
      return "Please select a valid status.";
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
      building_id: Number(form.building_id),
      services_no: form.services_no.trim(),
      description: form.description.trim(),
      floor: Number(form.floor),
      rent: Number(form.rent),
      status: form.status,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await api.put(`/rental-services/${editingId}`, payload);
        setSuccess("Rental service updated successfully.");
      } else {
        await api.post("/rental-services", payload);
        setSuccess("Rental service added successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(initialForm);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Operation failed. Please check your information.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${service.services_no}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/rental-services/${service.rental_services_id}`);

      setSuccess("Rental service deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete this rental service.",
      );
    }
  }

  const filteredServices = services.filter((service) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch = [
      service.services_no,
      service.building_name,
      service.description,
      String(service.floor ?? ""),
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(searchText),
    );

    const matchesStatus =
      statusFilter === "All" || service.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const availableCount = services.filter(
    (service) => service.status === "Available",
  ).length;

  const occupiedCount = services.filter(
    (service) => service.status === "Occupied",
  ).length;

  const maintenanceCount = services.filter(
    (service) => service.status === "Maintenance",
  ).length;

  return (
    <section className="rental-services-page">
      <div className="rs-page-header">
        <div>
          <h1>Rental Services</h1>
          <p>Manage shops, offices, and other rental units.</p>
        </div>

        <button type="button" className="rs-primary-btn" onClick={openAddModal}>
          <span>＋</span> Add Rental Service
        </button>
      </div>

      {error && !modalOpen && (
        <div className="rs-alert rs-alert-error">
          {error}
          <button onClick={() => setError("")} aria-label="Close error">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="rs-alert rs-alert-success">
          {success}
          <button onClick={() => setSuccess("")} aria-label="Close message">
            ×
          </button>
        </div>
      )}

      <div className="rs-stats">
        <div className="rs-stat-card">
          <span className="rs-stat-icon">🏢</span>
          <div>
            <p>Total Services</p>
            <h2>{services.length}</h2>
          </div>
        </div>

        <div className="rs-stat-card">
          <span className="rs-stat-icon">🟢</span>
          <div>
            <p>Available</p>
            <h2>{availableCount}</h2>
          </div>
        </div>

        <div className="rs-stat-card">
          <span className="rs-stat-icon">🔵</span>
          <div>
            <p>Occupied</p>
            <h2>{occupiedCount}</h2>
          </div>
        </div>

        <div className="rs-stat-card">
          <span className="rs-stat-icon">🟠</span>
          <div>
            <p>Maintenance</p>
            <h2>{maintenanceCount}</h2>
          </div>
        </div>
      </div>

      <div className="rs-content-card">
        <div className="rs-toolbar">
          <div className="rs-search">
            <span>🔎</span>
            <input
              type="search"
              placeholder="Search by service, building..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="rs-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          <button
            type="button"
            className="rs-refresh-btn"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="rs-state-message">Loading rental services...</div>
        ) : filteredServices.length === 0 ? (
          <div className="rs-state-message">
            <span>📋</span>
            <h3>No Rental Services Found</h3>
            <p>
              {services.length === 0
                ? "Add your first rental service to get started."
                : "Try changing your search or filter."}
            </p>
          </div>
        ) : (
          <div className="rs-table-wrapper">
            <table className="rs-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service No.</th>
                  <th>Building</th>
                  <th>Description</th>
                  <th>Floor</th>
                  <th>Monthly Rent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map((service, index) => (
                  <tr key={service.rental_services_id}>
                    <td>{index + 1}</td>

                    <td className="rs-service-number">{service.services_no}</td>

                    <td>{service.building_name}</td>

                    <td>{service.description || "—"}</td>

                    <td>{service.floor}</td>

                    <td className="rs-rent">
                      {Number(service.rent).toLocaleString()}
                    </td>

                    <td>
                      <span
                        className={`rs-status rs-status-${String(
                          service.status,
                        ).toLowerCase()}`}
                      >
                        {service.status}
                      </span>
                    </td>

                    <td>
                      <div className="rs-actions">
                        <button
                          type="button"
                          className="rs-edit-btn"
                          onClick={() => openEditModal(service)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="rs-delete-btn"
                          onClick={() => handleDelete(service)}
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
          <div className="rs-table-footer">
            Showing {filteredServices.length} of {services.length} services
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="rs-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="rs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rs-modal-title"
          >
            <div className="rs-modal-header">
              <div>
                <h2 id="rs-modal-title">
                  {editingId !== null
                    ? "Edit Rental Service"
                    : "Add Rental Service"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Update the rental unit information."
                    : "Enter the details of the new rental unit."}
                </p>
              </div>

              <button
                type="button"
                className="rs-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form className="rs-form" onSubmit={handleSubmit}>
              {error && <div className="rs-alert rs-alert-error">{error}</div>}

              <div className="rs-form-grid">
                <div className="rs-field">
                  <label htmlFor="building_id">Building *</label>
                  <select
                    id="building_id"
                    name="building_id"
                    value={form.building_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Building</option>

                    {buildings.map((building) => (
                      <option
                        key={building.building_id}
                        value={building.building_id}
                      >
                        {building.building_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rs-field">
                  <label htmlFor="services_no">Service Number *</label>
                  <input
                    id="services_no"
                    name="services_no"
                    value={form.services_no}
                    onChange={handleChange}
                    placeholder="e.g. SHOP-101"
                    required
                    maxLength={50}
                  />
                </div>

                <div className="rs-field">
                  <label htmlFor="floor">Floor *</label>
                  <input
                    id="floor"
                    name="floor"
                    type="number"
                    min="1"
                    step="1"
                    value={form.floor}
                    onChange={handleChange}
                    placeholder="Enter floor number"
                    required
                  />
                </div>

                <div className="rs-field">
                  <label htmlFor="rent">Monthly Rent *</label>
                  <input
                    id="rent"
                    name="rent"
                    type="number"
                    min="0"
                    step="any"
                    value={form.rent}
                    onChange={handleChange}
                    placeholder="Enter monthly rent"
                    required
                  />
                </div>

                <div className="rs-field">
                  <label htmlFor="status">Status *</label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="rs-field rs-field-full">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the shop, office, or rental unit..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="rs-form-actions">
                <button
                  type="button"
                  className="rs-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rs-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Service"
                      : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default RentalServices;
