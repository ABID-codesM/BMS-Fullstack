import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./ManagerTenantRegistration.css";

const emptyForm = {
  tenant_name: "",
  address: "",
  nic: "",
  tenant_type: "",
  phone: "",
  note: "",
  building_id: "",
  rental_services_id: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
};

function ManagerTenantRegistration() {
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({});

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [tenantResponse, buildingResponse] = await Promise.all([
        axiosInstance.get("/manager/tenants"),
        axiosInstance.get("/manager/buildings"),
      ]);

      const tenantData = tenantResponse.data;
      const buildingData = buildingResponse.data;

      setTenants(
        Array.isArray(tenantData) ? tenantData : tenantData.tenants || [],
      );

      setBuildings(
        Array.isArray(buildingData)
          ? buildingData
          : buildingData.buildings || [],
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to load tenant information.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (buildingId) => {
    setServices([]);

    setForm((prev) => ({
      ...prev,
      building_id: buildingId,
      rental_services_id: "",
    }));

    if (!buildingId) return;

    try {
      const response = await axiosInstance.get(
        `/manager/rental-services?building_id=${buildingId}`,
      );

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data.rental_services || data.services || [];

      setServices(list.filter((item) => item.status === "Available"));
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load available rental spaces.",
      );
    }
  };

  const openAddForm = () => {
    setForm(emptyForm);
    setServices([]);
    setShowForm(true);
    setMessage("");
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!form.tenant_name.trim()) {
      setMessage("Tenant name is required.");
      return;
    }

    if (!form.rental_services_id) {
      setMessage("Please select an available rental space.");
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setMessage("End date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);

      await axiosInstance.post("/manager/tenants/register-and-rent", {
        tenant_name: form.tenant_name.trim(),
        address: form.address,
        nic: form.nic,
        tenant_type: form.tenant_type,
        phone: form.phone,
        note: form.note,
        rental_services_id: Number(form.rental_services_id),
        start_date: form.start_date,
        end_date: form.end_date || null,
      });

      setShowForm(false);
      setMessage("Tenant registered and rental created successfully.");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to register tenant.");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (tenant) => {
    try {
      const response = await axiosInstance.get(
        `/manager/tenants/${tenant.tenant_id}`,
      );

      setSelectedTenant(response.data.tenant || response.data);
      setShowDetails(true);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to load tenant details.",
      );
    }
  };

  const openEdit = (tenant) => {
    setSelectedTenant(tenant);

    setEditForm({
      tenant_name: tenant.tenant_name || "",
      address: tenant.address || "",
      nic: tenant.nic || "",
      tenant_type: tenant.tenant_type || "",
      phone: tenant.phone || "",
      note: tenant.note || "",
    });

    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      await axiosInstance.put(
        `/manager/tenants/${selectedTenant.tenant_id}`,
        editForm,
      );

      setShowEdit(false);
      setMessage("Tenant information updated successfully.");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update tenant.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tenant) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${tenant.tenant_name}?`,
    );

    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/manager/tenants/${tenant.tenant_id}`);

      setMessage("Tenant deleted successfully.");
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Tenant could not be deleted. Related rental records may exist.",
      );
    }
  };

  const openTenantPrint = (tenant) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setMessage("Please allow pop-ups to print tenant information.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tenant Information</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #222;
          }
          h1 { text-align: center; }
          .row {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 100px;
          }
          .signature {
            width: 40%;
            border-top: 1px solid #222;
            padding-top: 12px;
            text-align: center;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Tenant Information Form</h1>
        <div class="row"><b>Tenant ID:</b> ${tenant.tenant_id}</div>
        <div class="row"><b>Name:</b> ${escapeHtml(tenant.tenant_name)}</div>
        <div class="row"><b>Phone:</b> ${escapeHtml(tenant.phone || "-")}</div>
        <div class="row"><b>NIC:</b> ${escapeHtml(tenant.nic || "-")}</div>
        <div class="row"><b>Tenant Type:</b> ${escapeHtml(tenant.tenant_type || "-")}</div>
        <div class="row"><b>Address:</b> ${escapeHtml(tenant.address || "-")}</div>
        <div class="row"><b>Note:</b> ${escapeHtml(tenant.note || "-")}</div>

        <div class="signatures">
          <div class="signature">Tenant Signature</div>
          <div class="signature">Manager Signature</div>
        </div>

        <script>
          window.onload = () => window.print();
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );

  const filteredTenants = tenants.filter((tenant) =>
    [tenant.tenant_name, tenant.phone, tenant.nic, String(tenant.tenant_id)]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="mtm-page">
      <header className="mtm-header">
        <div>
          <h1>Tenant Management</h1>
          <p>Manage tenants, rental contracts and payments.</p>
        </div>

        <button className="mtm-primary" onClick={openAddForm}>
          + Add New Tenant
        </button>
      </header>

      {message && (
        <div className="mtm-message" role="status">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <div className="mtm-toolbar">
        <input
          type="search"
          placeholder="Search by name, phone, NIC or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <span>{filteredTenants.length} Tenants</span>
      </div>

      <div className="mtm-table-wrap">
        {loading ? (
          <p className="mtm-empty">Loading tenants...</p>
        ) : filteredTenants.length === 0 ? (
          <p className="mtm-empty">No tenants found.</p>
        ) : (
          <table className="mtm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tenant</th>
                <th>Phone</th>
                <th>NIC</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.tenant_id}>
                  <td>{tenant.tenant_id}</td>
                  <td>{tenant.tenant_name}</td>
                  <td>{tenant.phone || "-"}</td>
                  <td>{tenant.nic || "-"}</td>
                  <td>{tenant.tenant_type || "-"}</td>

                  <td>
                    <div className="mtm-actions">
                      <button onClick={() => openDetails(tenant)}>View</button>

                      <button onClick={() => openEdit(tenant)}>Edit</button>

                      <button onClick={() => openTenantPrint(tenant)}>
                        Print
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/manager/rentals?tenant_id=${tenant.tenant_id}`,
                          )
                        }
                      >
                        Contracts
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/manager/rental-payments?tenant_id=${tenant.tenant_id}`,
                          )
                        }
                      >
                        Payments
                      </button>

                      <button
                        className="mtm-delete"
                        onClick={() => handleDelete(tenant)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="mtm-overlay">
          <form className="mtm-modal" onSubmit={handleAdd}>
            <div className="mtm-modal-head">
              <h2>Register Tenant & Create Rental</h2>
              <button type="button" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <div className="mtm-form-grid">
              <label>
                Tenant Name *
                <input
                  required
                  value={form.tenant_name}
                  onChange={(e) =>
                    setForm({ ...form, tenant_name: e.target.value })
                  }
                />
              </label>

              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label>
                NIC
                <input
                  value={form.nic}
                  onChange={(e) => setForm({ ...form, nic: e.target.value })}
                />
              </label>

              <label>
                Tenant Type
                <select
                  value={form.tenant_type}
                  onChange={(e) =>
                    setForm({ ...form, tenant_type: e.target.value })
                  }
                >
                  <option value="">Select Type</option>
                  <option value="Individual">Individual</option>
                  <option value="Company">Company</option>
                  <option value="Organization">Organization</option>
                </select>
              </label>

              <label className="mtm-wide">
                Address
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>

              <label className="mtm-wide">
                Note
                <textarea
                  rows="2"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>

              <label>
                Building *
                <select
                  required
                  value={form.building_id}
                  onChange={(e) => loadServices(e.target.value)}
                >
                  <option value="">Select Building</option>
                  {buildings.map((b) => (
                    <option key={b.building_id} value={b.building_id}>
                      {b.building_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Available Space *
                <select
                  required
                  value={form.rental_services_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rental_services_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select Space</option>
                  {services.map((s) => (
                    <option
                      key={s.rental_services_id}
                      value={s.rental_services_id}
                    >
                      {s.services_no} — Rent: {s.rent}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Start Date *
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </label>

              <label>
                End Date
                <input
                  type="date"
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="mtm-modal-actions">
              <button
                type="button"
                className="mtm-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button className="mtm-primary" disabled={saving}>
                {saving ? "Saving..." : "Register & Create Contract"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEdit && (
        <div className="mtm-overlay">
          <form className="mtm-modal" onSubmit={handleEdit}>
            <div className="mtm-modal-head">
              <h2>Edit Tenant</h2>
              <button type="button" onClick={() => setShowEdit(false)}>
                ×
              </button>
            </div>

            <div className="mtm-form-grid">
              {[
                ["tenant_name", "Tenant Name"],
                ["phone", "Phone"],
                ["nic", "NIC"],
                ["tenant_type", "Tenant Type"],
                ["address", "Address"],
                ["note", "Note"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={editForm[key] || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        [key]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>

            <div className="mtm-modal-actions">
              <button
                type="button"
                className="mtm-secondary"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>

              <button className="mtm-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDetails && selectedTenant && (
        <div className="mtm-overlay">
          <div className="mtm-modal">
            <div className="mtm-modal-head">
              <h2>Tenant Details</h2>
              <button onClick={() => setShowDetails(false)}>×</button>
            </div>

            <div className="mtm-details">
              {Object.entries({
                "Tenant ID": selectedTenant.tenant_id,
                Name: selectedTenant.tenant_name,
                Phone: selectedTenant.phone,
                NIC: selectedTenant.nic,
                Type: selectedTenant.tenant_type,
                Address: selectedTenant.address,
                Note: selectedTenant.note,
              }).map(([label, value]) => (
                <div key={label}>
                  <strong>{label}</strong>
                  <span>{value || "-"}</span>
                </div>
              ))}
            </div>

            <div className="mtm-modal-actions">
              <button
                className="mtm-secondary"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>

              <button
                className="mtm-primary"
                onClick={() => openTenantPrint(selectedTenant)}
              >
                Print Information
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerTenantRegistration;
