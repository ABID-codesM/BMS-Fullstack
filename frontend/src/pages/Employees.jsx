import { useCallback, useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./Employees.css";

//const API_URL = "http://localhost:5000/api/employees";

const emptyForm = {
  ename: "",
  nic: "",
  job: "",
  hire_date: "",
  end_date: "",
};

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  // 1. Fetch Employees
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/employees");
      const data = response.data;
      // const response = await fetch(API_URL);

      // if (!response.ok) {
      //   throw new Error("Failed to fetch employees.");
      // }

      // const data = await response.json();

      setEmployees(
        Array.isArray(data)
          ? data
          : Array.isArray(data.employees)
            ? data.employees
            : [],
      );
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 2. Handle Input Changes
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // 3. Open Add Form
  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // 4. Open Edit Form
  function openEditForm(employee) {
    setEditingId(employee.eid);

    setForm({
      ename: employee.ename ?? "",
      nic: employee.nic ?? "",
      job: employee.job ?? "",
      hire_date: employee.hire_date
        ? String(employee.hire_date).slice(0, 10)
        : "",
      end_date: employee.end_date ? String(employee.end_date).slice(0, 10) : "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // 5. Close Form
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // 6. Add or Update Employee
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.ename.trim();
    const nic = form.nic.trim();
    const job = form.job.trim();

    if (!name || !nic || !job || !form.hire_date) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.end_date && form.end_date < form.hire_date) {
      setError("End date cannot be earlier than hire date.");
      return;
    }

    const payload = {
      ename: name,
      nic,
      job,
      hire_date: form.hire_date,
      end_date: form.end_date || null,
    };

    try {
      setSaving(true);
      if (editingId) {
        // Update an existing employee
        await api.put(`/employees/${editingId}`, payload);
      } else {
        // Create a new employee
        await api.post("/employees", payload);
      }

      //const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      // const response = await fetch(url, {
      //   method: editingId ? "PUT" : "POST",

      //   headers: {
      //     "Content-Type": "application/json",
      //   },

      //   body: JSON.stringify(payload),
      // });

      // const result = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     result?.message || result?.error || "Failed to save employee.",
      //   );
      // }

      setSuccess(
        editingId
          ? "Employee updated successfully."
          : "Employee added successfully.",
      );

      closeForm();

      await fetchEmployees();
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // 7. Delete Employee
  async function handleDelete(employee) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.ename}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/employees/${employee.eid}`);
      // const response = await fetch(`${API_URL}/${employee.eid}`, {
      //   method: "DELETE",
      // });

      // const result = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     result?.message || result?.error || "Failed to delete employee.",
      //   );
      // }

      setSuccess("Employee deleted successfully.");

      await fetchEmployees();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Could not delete employee.",
      );
    }
  }

  // 8. Search Employees
  const filteredEmployees = employees.filter((employee) => {
    const query = search.toLowerCase();

    return (
      String(employee.eid ?? "").includes(query) ||
      String(employee.ename ?? "")
        .toLowerCase()
        .includes(query) ||
      String(employee.nic ?? "")
        .toLowerCase()
        .includes(query) ||
      String(employee.job ?? "")
        .toLowerCase()
        .includes(query)
    );
  });

  // 9. Calculate Summary
  const activeEmployees = employees.filter(
    (employee) => !employee.end_date,
  ).length;

  return (
    <div className="employees-page">
      {/* Page Heading */}
      <section className="employees-heading">
        <div>
          <span className="employees-eyebrow">HUMAN RESOURCES</span>

          <h2>Employees Management</h2>

          <p>Manage employee records and employment information.</p>
        </div>

        <button
          type="button"
          className="employee-primary-button"
          onClick={openAddForm}
        >
          + Add Employee
        </button>
      </section>

      {/* Alerts */}
      {error && (
        <div className="employee-alert employee-alert-error" role="alert">
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
        <div className="employee-alert employee-alert-success" role="status">
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
      <section className="employee-summary">
        <article className="employee-summary-card">
          <div className="employee-summary-icon blue">♙</div>

          <div>
            <p>Total Employees</p>

            <h3>{loading ? "..." : employees.length}</h3>

            <span>Registered employees</span>
          </div>
        </article>

        <article className="employee-summary-card">
          <div className="employee-summary-icon green">✓</div>

          <div>
            <p>Active Employees</p>

            <h3>{loading ? "..." : activeEmployees}</h3>

            <span>Without an end date</span>
          </div>
        </article>

        <article className="employee-summary-card">
          <div className="employee-summary-icon purple">▤</div>

          <div>
            <p>Filtered Results</p>

            <h3>{loading ? "..." : filteredEmployees.length}</h3>

            <span>Matching records</span>
          </div>
        </article>
      </section>

      {/* Employee Table */}
      <section className="employees-panel">
        <div className="employees-toolbar">
          <div>
            <h3>All Employees</h3>

            <p>Employee records from the database</p>
          </div>

          <input
            type="search"
            className="employee-search"
            placeholder="Search name, NIC, job..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search employees"
          />
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form className="employee-form" onSubmit={handleSubmit}>
            <div className="employee-form-heading">
              <div>
                <h3>{editingId ? "Edit Employee" : "Register New Employee"}</h3>

                <p>Fields marked with * are required.</p>
              </div>

              <button
                type="button"
                className="employee-close-button"
                onClick={closeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <div className="employee-form-grid">
              <label>
                Employee Name *
                <input
                  type="text"
                  name="ename"
                  value={form.ename}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                  maxLength={150}
                />
              </label>

              <label>
                NIC / Identification Number *
                <input
                  type="text"
                  name="nic"
                  value={form.nic}
                  onChange={handleChange}
                  placeholder="Enter identification number"
                  required
                  maxLength={50}
                />
              </label>

              <label>
                Job Title *
                <input
                  type="text"
                  name="job"
                  value={form.job}
                  onChange={handleChange}
                  placeholder="e.g. Manager"
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Hire Date *
                <input
                  type="date"
                  name="hire_date"
                  value={form.hire_date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Employment End Date
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  min={form.hire_date || undefined}
                />
                <span className="employee-field-hint">
                  Leave blank if currently employed.
                </span>
              </label>
            </div>

            <div className="employee-form-actions">
              <button
                type="button"
                className="employee-secondary-button"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="employee-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Employee"
                    : "Save Employee"}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="employees-table-wrapper">
          {loading ? (
            <div className="employee-message">
              <div className="employee-spinner" />
              <p>Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="employee-message">
              <div className="employee-empty-icon">♙</div>

              <h3>No employees found</h3>

              <p>
                {search
                  ? "Try another search term."
                  : "Add your first employee to get started."}
              </p>
            </div>
          ) : (
            <table className="employees-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>NIC</th>
                  <th>Job Title</th>
                  <th>Hire Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => {
                  const isActive = !employee.end_date;

                  return (
                    <tr key={employee.eid}>
                      <td>
                        <span className="employee-id">#{employee.eid}</span>
                      </td>

                      <td>
                        <div className="employee-name-cell">
                          <div className="employee-avatar">
                            {String(employee.ename || "?")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>{employee.ename}</strong>
                        </div>
                      </td>

                      <td>{employee.nic || "—"}</td>

                      <td>{employee.job || "—"}</td>

                      <td>
                        {employee.hire_date
                          ? String(employee.hire_date).slice(0, 10)
                          : "—"}
                      </td>

                      <td>
                        {employee.end_date
                          ? String(employee.end_date).slice(0, 10)
                          : "—"}
                      </td>

                      <td>
                        <span
                          className={`employee-status ${
                            isActive ? "status-active" : "status-ended"
                          }`}
                        >
                          {isActive ? "Active" : "Ended"}
                        </span>
                      </td>

                      <td>
                        <div className="employee-actions">
                          <button
                            type="button"
                            className="employee-edit-button"
                            onClick={() => openEditForm(employee)}
                            aria-label={`Edit ${employee.ename}`}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="employee-delete-button"
                            onClick={() => handleDelete(employee)}
                            aria-label={`Delete ${employee.ename}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default Employees;
