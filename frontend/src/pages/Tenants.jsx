import { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "./Tenants.css";

//const API_URL = "http://localhost:5000/api/tenants";
//const RENTALS_API_URL = "http://localhost:5000/api/rentals";

const initialForm = {
  tenant_name: "",
  address: "",
  nic: "",
  tenant_type: "",
  phone: "",
  note: "",
};

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [editingId, setEditingId] = useState(null);
  const [viewingTenant, setViewingTenant] = useState(null);
  // Masroor
  const [rentals, setRentals] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(false);
  const [rentalsError, setRentalsError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // GET: Fetch all tenants
  const fetchTenants = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tenants");
      const data = response.data;
      // const response = await fetch(API_URL);
      // const data = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     data?.message || data?.error || "Failed to fetch tenants.",
      //   );
      // }

      const rows = Array.isArray(data) ? data : data?.tenants;

      if (!Array.isArray(rows)) {
        throw new Error("The tenants API did not return the expected data.");
      }

      setTenants(rows);
    } catch (err) {
      setError(err.message || "Could not connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  // GET: Fetch all rentals
  const fetchRentals = async () => {
    setRentalsLoading(true);
    setRentalsError("");

    try {
      const response = await api.get("/rentals");
      const data = response.data;
      // const response = await fetch(RENTALS_API_URL);
      // const data = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     data?.message || data?.error || "Failed to fetch rental records.",
      //   );
      // }

      const rows = Array.isArray(data) ? data : data?.rentals;

      if (!Array.isArray(rows)) {
        throw new Error("The rentals API did not return the expected data.");
      }

      setRentals(rows);
    } catch (err) {
      setRentalsError(err.message || "Could not load rental information.");
    } finally {
      setRentalsLoading(false);
    }
  };

  // Get rentals belonging to the selected tenant
  const viewingTenantRentals = useMemo(() => {
    if (!viewingTenant) {
      return [];
    }

    return rentals.filter(
      (rental) => Number(rental.tenant_id) === Number(viewingTenant.tenant_id),
    );
  }, [rentals, viewingTenant]);

  // Current active rentals
  const currentRentals = useMemo(() => {
    return viewingTenantRentals.filter((rental) => rental.status === "Active");
  }, [viewingTenantRentals]);

  // Completed or cancelled rental contracts
  const rentalHistory = useMemo(() => {
    return viewingTenantRentals.filter((rental) => rental.status !== "Active");
  }, [viewingTenantRentals]);

  // Format dates safely
  const formatRentalDate = (date) => {
    if (!date) {
      return "—";
    }

    return String(date).slice(0, 10);
  };

  // Format rent amount without assuming a currency
  const formatRent = (amount) => {
    const value = Number(amount);

    if (!Number.isFinite(value)) {
      return "—";
    }

    return value.toLocaleString();
  };

  useEffect(() => {
    fetchRentals();
    fetchTenants();
  }, []);

  // Handle form inputs
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Open the form for adding a tenant
  const openAddForm = () => {
    setForm({ ...initialForm });
    setEditingId(null);
    setError("");
    setSuccess("");
    setIsFormOpen(true);
  };

  // Open the form for editing a tenant
  const openEditForm = (tenant) => {
    setForm({
      tenant_name: tenant.tenant_name ?? "",
      address: tenant.address ?? "",
      nic: tenant.nic ?? "",
      tenant_type: tenant.tenant_type ?? "",
      phone: tenant.phone ?? "",
      note: tenant.note ?? "",
    });

    setEditingId(tenant.tenant_id);
    setError("");
    setSuccess("");
    setIsFormOpen(true);
  };

  // Close the form
  const closeForm = () => {
    if (saving) return;

    setIsFormOpen(false);
    setEditingId(null);
    setForm({ ...initialForm });
  };

  // POST / PUT: Create or update a tenant
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const tenantName = form.tenant_name.trim();
    const nic = form.nic.trim();

    if (!tenantName || !nic) {
      setError("Tenant Name and NIC are required.");
      return;
    }

    const payload = {
      tenant_name: tenantName,
      address: form.address.trim(),
      nic,
      tenant_type: form.tenant_type.trim(),
      phone: form.phone.trim(),
      note: form.note.trim(),
    };

    const isEditing = editingId !== null;

    //const url = isEditing ? `${API_URL}/${editingId}` : API_URL;

    setSaving(true);

    try {
      if (isEditing) {
        await api.put(`/tenants/${editingId}`, payload);
      } else {
        await api.post("/tenants", payload);
      }
      // const response = await fetch(url, {
      //   method: isEditing ? "PUT" : "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),
      // });

      // const data = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     data?.message || data?.error || `Request failed: ${response.status}`,
      //   );
      // }

      setSuccess(
        isEditing
          ? "Tenant updated successfully."
          : "Tenant added successfully.",
      );

      setIsFormOpen(false);
      setEditingId(null);
      setForm({ ...initialForm });

      await fetchTenants();
    } catch (err) {
      setError(err.message || "Unable to save tenant.");
    } finally {
      setSaving(false);
    }
  };

  // DELETE: Remove a tenant
  const handleDelete = async (tenant) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${tenant.tenant_name}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/tenants/${tenant.tenant_id}`);
      // const response = await fetch(`${API_URL}/${tenant.tenant_id}`, {
      //   method: "DELETE",
      // });

      // const data = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     data?.message || data?.error || "Failed to delete tenant.",
      //   );
      // }

      setSuccess("Tenant deleted successfully.");

      if (viewingTenant?.tenant_id === tenant.tenant_id) {
        setViewingTenant(null);
      }

      await fetchTenants();
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete tenant. The tenant may be linked to other records.",
      );
    }
  };

  // Get available tenant types from actual database data
  const tenantTypes = useMemo(() => {
    return [
      ...new Set(
        tenants.map((tenant) => tenant.tenant_type?.trim()).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [tenants]);

  // Search and filter
  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const matchesSearch = [
        tenant.tenant_id,
        tenant.tenant_name,
        tenant.address,
        tenant.nic,
        tenant.tenant_type,
        tenant.phone,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesType =
        typeFilter === "All" || tenant.tenant_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [tenants, search, typeFilter]);

  // Summary cards
  const individualCount = tenants.filter((tenant) =>
    /individual|person|personal/i.test(tenant.tenant_type ?? ""),
  ).length;

  const companyCount = tenants.filter((tenant) =>
    /company|business|organization|organisation/i.test(
      tenant.tenant_type ?? "",
    ),
  ).length;

  return (
    <section className="tenants-page">
      {/* Page Header */}
      <header className="tenants-header">
        <div className="tenants-header-text">
          <span className="tenants-eyebrow">BUILDING MANAGEMENT SYSTEM</span>

          <h1>Tenant Management</h1>

          <p>
            Manage tenant information, contact details, and tenant records in
            one place.
          </p>
        </div>

        <button type="button" className="tenants-add-btn" onClick={openAddForm}>
          <span aria-hidden="true">＋</span>
          Add New Tenant
        </button>
      </header>

      {/* Notifications */}
      {error && (
        <div className="tenants-alert tenants-alert-error" role="alert">
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
        <div className="tenants-alert tenants-alert-success" role="status">
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

      {/* Summary Cards */}
      <div className="tenants-summary">
        <article className="tenants-summary-card">
          <div className="tenants-summary-icon tenants-icon-blue">T</div>

          <div>
            <p>Total Tenants</p>
            <h2>{tenants.length}</h2>
            <span>Registered tenants</span>
          </div>
        </article>

        <article className="tenants-summary-card">
          <div className="tenants-summary-icon tenants-icon-green">P</div>

          <div>
            <p>Individual Tenants</p>
            <h2>{individualCount}</h2>
            <span>Individual or personal</span>
          </div>
        </article>

        <article className="tenants-summary-card">
          <div className="tenants-summary-icon tenants-icon-purple">C</div>

          <div>
            <p>Company Tenants</p>
            <h2>{companyCount}</h2>
            <span>Business or organization</span>
          </div>
        </article>
      </div>

      {/* Main Table Panel */}
      <div className="tenants-panel">
        <div className="tenants-panel-header">
          <div>
            <h2>All Tenants</h2>

            <p>View and manage all registered tenants.</p>
          </div>

          <button
            type="button"
            className="tenants-refresh-btn"
            onClick={fetchTenants}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {/* Search and Filter */}
        <div className="tenants-toolbar">
          <div className="tenants-search-box">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, NIC, phone..."
              aria-label="Search tenants"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter by tenant type"
            className="tenants-filter"
          >
            <option value="All">All Tenant Types</option>

            {tenantTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <span className="tenants-results-count">
            {filteredTenants.length} records
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="tenants-state">
            <div className="tenants-spinner" />
            <p>Loading tenant records...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="tenants-state">
            <div className="tenants-empty-icon">T</div>

            <h3>
              {tenants.length === 0
                ? "No tenants registered yet"
                : "No matching tenants found"}
            </h3>

            <p>
              {tenants.length === 0
                ? "Add a new tenant to get started."
                : "Try changing your search or filter."}
            </p>

            {tenants.length === 0 && (
              <button
                type="button"
                className="tenants-add-btn"
                onClick={openAddForm}
              >
                ＋ Add New Tenant
              </button>
            )}
          </div>
        ) : (
          <div className="tenants-table-wrapper">
            <table className="tenants-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>NIC Number</th>
                  <th>Tenant Type</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th className="tenants-actions-heading">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.tenant_id}>
                    <td data-label="Tenant">
                      <div className="tenants-person-cell">
                        <div className="tenants-avatar">
                          {(tenant.tenant_name || "T")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>{tenant.tenant_name || "—"}</strong>

                          <span>ID: {tenant.tenant_id}</span>
                        </div>
                      </div>
                    </td>

                    <td data-label="NIC Number">{tenant.nic || "—"}</td>

                    <td data-label="Tenant Type">
                      <span className="tenants-type-badge">
                        {tenant.tenant_type || "Not specified"}
                      </span>
                    </td>

                    <td data-label="Phone">{tenant.phone || "—"}</td>

                    <td data-label="Address" className="tenants-address-cell">
                      {tenant.address || "—"}
                    </td>

                    <td data-label="Actions">
                      <div className="tenants-actions">
                        <button
                          type="button"
                          className="tenants-action-view"
                          onClick={() => setViewingTenant(tenant)}
                          title="View tenant"
                          aria-label={`View ${tenant.tenant_name}`}
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="tenants-action-edit"
                          onClick={() => openEditForm(tenant)}
                          title="Edit tenant"
                          aria-label={`Edit ${tenant.tenant_name}`}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="tenants-action-delete"
                          onClick={() => handleDelete(tenant)}
                          title="Delete tenant"
                          aria-label={`Delete ${tenant.tenant_name}`}
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

        {/* Footer */}
        <div className="tenants-table-footer">
          <span>
            Showing {filteredTenants.length} of {tenants.length} tenants
          </span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div
          className="tenants-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            className="tenants-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-modal-title"
          >
            <div className="tenants-modal-header">
              <div>
                <span className="tenants-eyebrow">TENANT INFORMATION</span>

                <h2 id="tenant-modal-title">
                  {editingId !== null ? "Edit Tenant" : "Add New Tenant"}
                </h2>

                <p>Enter the tenant's details below.</p>
              </div>

              <button
                type="button"
                className="tenants-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="tenants-form-grid">
                <div className="tenants-form-group">
                  <label htmlFor="tenant_name">
                    Tenant Name <span>*</span>
                  </label>

                  <input
                    id="tenant_name"
                    name="tenant_name"
                    value={form.tenant_name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                    maxLength={150}
                  />
                </div>

                <div className="tenants-form-group">
                  <label htmlFor="nic">
                    NIC Number <span>*</span>
                  </label>

                  <input
                    id="nic"
                    name="nic"
                    value={form.nic}
                    onChange={handleChange}
                    placeholder="Enter NIC number"
                    required
                    maxLength={50}
                  />
                </div>

                <div className="tenants-form-group">
                  <label htmlFor="tenant_type">Tenant Type</label>

                  <input
                    id="tenant_type"
                    name="tenant_type"
                    value={form.tenant_type}
                    onChange={handleChange}
                    placeholder="e.g. Individual, Company"
                    maxLength={100}
                  />
                </div>

                <div className="tenants-form-group">
                  <label htmlFor="phone">Phone Number</label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    maxLength={30}
                  />
                </div>

                <div className="tenants-form-group tenants-form-full">
                  <label htmlFor="address">Address</label>

                  <input
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter complete address"
                    maxLength={250}
                  />
                </div>

                <div className="tenants-form-group tenants-form-full">
                  <label htmlFor="note">Additional Notes</label>

                  <textarea
                    id="note"
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Enter any additional information"
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>

              {error && (
                <div className="tenants-alert tenants-alert-error" role="alert">
                  {error}
                </div>
              )}

              <div className="tenants-modal-actions">
                <button
                  type="button"
                  className="tenants-cancel-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tenants-add-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create Tenant"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* View Tenant Modal */}

      {viewingTenant && (
        <div
          className="tenants-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewingTenant(null);
            }
          }}
        >
          <section
            className="tenants-modal tenants-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-view-title"
          >
            <div className="tenants-modal-header">
              <div>
                <span className="tenants-eyebrow">TENANT PROFILE</span>

                <h2 id="tenant-view-title">Tenant Details</h2>
              </div>

              <button
                type="button"
                className="tenants-modal-close"
                onClick={() => setViewingTenant(null)}
                aria-label="Close tenant details"
              >
                ×
              </button>
            </div>

            <div className="tenants-profile-heading">
              <div className="tenants-profile-avatar">
                {(viewingTenant.tenant_name || "T")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>{viewingTenant.tenant_name || "—"}</h3>
                <p>Tenant ID: {viewingTenant.tenant_id}</p>
              </div>
            </div>

            <div className="tenants-detail-grid">
              <div>
                <span>NIC Number</span>
                <strong>{viewingTenant.nic || "—"}</strong>
              </div>

              <div>
                <span>Tenant Type</span>
                <strong>{viewingTenant.tenant_type || "—"}</strong>
              </div>

              <div>
                <span>Phone Number</span>
                <strong>{viewingTenant.phone || "—"}</strong>
              </div>

              <div>
                <span>Address</span>
                <strong>{viewingTenant.address || "—"}</strong>
              </div>

              <div className="tenants-detail-full">
                <span>Additional Notes</span>
                <strong>{viewingTenant.note || "—"}</strong>
              </div>
            </div>
            {/* Rental Information */}
            <div className="tenants-rentals-section">
              <div className="tenants-rentals-heading">
                <div>
                  <h3>Rental Information</h3>
                  <p>Buildings, offices, and rental contracts</p>
                </div>

                <span className="tenants-rentals-count">
                  {viewingTenantRentals.length} Contracts
                </span>
              </div>

              {/* Loading State */}
              {rentalsLoading && (
                <div className="tenants-rentals-message">
                  Loading rental information...
                </div>
              )}

              {/* Error State */}
              {!rentalsLoading && rentalsError && (
                <div className="tenants-rentals-error" role="alert">
                  {rentalsError}
                </div>
              )}

              {/* Rental Data */}
              {!rentalsLoading && !rentalsError && (
                <>
                  {/* Current Rentals */}
                  <div className="tenants-rental-group">
                    <h4>
                      Current Rentals
                      <span>{currentRentals.length}</span>
                    </h4>

                    {currentRentals.length === 0 ? (
                      <div className="tenants-rentals-empty">
                        <strong>No active rentals</strong>
                        <p>This tenant has no active rental contracts.</p>
                      </div>
                    ) : (
                      <div className="tenants-rental-list">
                        {currentRentals.map((rental) => (
                          <article
                            className="tenants-rental-card"
                            key={rental.rental_id}
                          >
                            <div className="tenants-rental-card-header">
                              <div>
                                <span className="tenants-rental-label">
                                  Building
                                </span>

                                <h5>{rental.building_name || "—"}</h5>
                              </div>

                              <span className="tenants-rental-status tenants-status-active">
                                {rental.status}
                              </span>
                            </div>

                            <div className="tenants-rental-details">
                              <div>
                                <span>Office / Room</span>
                                <strong>{rental.services_no ?? "—"}</strong>
                              </div>

                              <div>
                                <span>Floor</span>
                                <strong>{rental.floor ?? "—"}</strong>
                              </div>

                              <div>
                                <span>Monthly Rent</span>
                                <strong>{formatRent(rental.rent)}</strong>
                              </div>

                              <div>
                                <span>Start Date</span>
                                <strong>
                                  {formatRentalDate(rental.start_date)}
                                </strong>
                              </div>

                              <div>
                                <span>End Date</span>
                                <strong>
                                  {formatRentalDate(rental.end_date)}
                                </strong>
                              </div>

                              <div>
                                <span>Rental ID</span>
                                <strong>{rental.rental_id}</strong>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rental History */}
                  <div className="tenants-rental-group">
                    <h4>
                      Rental History
                      <span>{rentalHistory.length}</span>
                    </h4>

                    {rentalHistory.length === 0 ? (
                      <div className="tenants-rentals-empty">
                        <strong>No rental history</strong>
                        <p>
                          Completed or cancelled contracts will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="tenants-rental-list">
                        {rentalHistory.map((rental) => (
                          <article
                            className="tenants-rental-card"
                            key={rental.rental_id}
                          >
                            <div className="tenants-rental-card-header">
                              <div>
                                <span className="tenants-rental-label">
                                  Building
                                </span>

                                <h5>{rental.building_name || "—"}</h5>
                              </div>

                              <span
                                className={`tenants-rental-status ${
                                  rental.status === "Completed"
                                    ? "tenants-status-completed"
                                    : "tenants-status-cancelled"
                                }`}
                              >
                                {rental.status}
                              </span>
                            </div>

                            <div className="tenants-rental-details">
                              <div>
                                <span>Office / Room</span>
                                <strong>{rental.services_no ?? "—"}</strong>
                              </div>

                              <div>
                                <span>Floor</span>
                                <strong>{rental.floor ?? "—"}</strong>
                              </div>

                              <div>
                                <span>Monthly Rent</span>
                                <strong>{formatRent(rental.rent)}</strong>
                              </div>

                              <div>
                                <span>Start Date</span>
                                <strong>
                                  {formatRentalDate(rental.start_date)}
                                </strong>
                              </div>

                              <div>
                                <span>End Date</span>
                                <strong>
                                  {formatRentalDate(rental.end_date)}
                                </strong>
                              </div>

                              <div>
                                <span>Rental ID</span>
                                <strong>{rental.rental_id}</strong>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="tenants-modal-actions">
              <button
                type="button"
                className="tenants-cancel-btn"
                onClick={() => setViewingTenant(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="tenants-add-btn"
                onClick={() => {
                  const tenant = viewingTenant;
                  setViewingTenant(null);
                  openEditForm(tenant);
                }}
              >
                Edit Tenant
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Tenants;
