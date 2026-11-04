import { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "./Salary.css";

const initialForm = {
  eid: "",
  amount: "",
  bonus: "0",
  month_of_payment: "",
  payment_date: "",
  paid: "0",
};

const money = (value) =>
  `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} AFN`;

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

function getStatus(row) {
  const total = Number(row.amount || 0) + Number(row.bonus || 0);
  const paid = Number(row.paid || 0);

  if (paid >= total) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
}

export default function Salary() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalSalary = Number(form.amount || 0) + Number(form.bonus || 0);

  const balance = Math.max(0, totalSalary - Number(form.paid || 0));

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [salaryResponse, employeeResponse] = await Promise.all([
        api.get("/salaries"),
        api.get("/employees"),
      ]);

      setSalaries(salaryResponse.data);
      setEmployees(employeeResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load salary information. Check the API routes.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    return salaries.reduce(
      (totals, row) => {
        const total = Number(row.amount || 0) + Number(row.bonus || 0);
        const paid = Number(row.paid || 0);
        const remaining = Math.max(0, total - paid);

        totals.totalSalary += total;
        totals.paid += paid;
        totals.balance += remaining;

        const status = getStatus(row);

        if (status === "Paid") totals.paidCount += 1;
        if (status === "Partial") totals.partialCount += 1;
        if (status === "Pending") totals.pendingCount += 1;

        return totals;
      },
      {
        totalSalary: 0,
        paid: 0,
        balance: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
      },
    );
  }, [salaries]);

  const filteredSalaries = salaries.filter((row) => {
    const status = getStatus(row);

    const matchesSearch = [row.ename, row.month_of_payment, row.sal_id].some(
      (value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
    );

    const matchesStatus = statusFilter === "All" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openAddModal() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(row) {
    setEditingId(row.sal_id);

    setForm({
      eid: String(row.eid),
      amount: String(row.amount ?? 0),
      bonus: String(row.bonus ?? 0),
      month_of_payment: dateOnly(row.month_of_payment),
      payment_date: dateOnly(row.payment_date),
      paid: String(row.paid ?? 0),
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
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const employeeId = Number(form.eid);
    const amount = Number(form.amount);
    const bonus = Number(form.bonus);
    const paid = Number(form.paid);

    if (!form.eid || !form.month_of_payment) {
      setError("Please select an employee and salary month.");
      return;
    }

    if (
      !Number.isFinite(amount) ||
      !Number.isFinite(bonus) ||
      !Number.isFinite(paid) ||
      amount < 0 ||
      bonus < 0 ||
      paid < 0 ||
      paid > amount + bonus
    ) {
      setError("Please enter valid salary amounts.");
      return;
    }

    const payload = {
      eid: employeeId,
      amount,
      bonus,
      month_of_payment: form.month_of_payment,
      payment_date: form.payment_date || null,
      paid,
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/salaries/${editingId}`, payload);
        setSuccess("Salary record updated successfully.");
      } else {
        await api.post("/salaries", payload);
        setSuccess("Salary record created successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save salary record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const confirmed = window.confirm(
      `Delete the salary record for ${row.ename}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/salaries/${row.sal_id}`);
      setSuccess("Salary record deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to delete salary record.",
      );
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="salary-page">
      <div className="salary-header no-print">
        <div>
          <span className="salary-eyebrow">PAYROLL MANAGEMENT</span>
          <h1>Employee Salaries</h1>
          <p>Manage salary records, payments and outstanding balances.</p>
        </div>

        <div className="salary-header-actions">
          <button
            type="button"
            className="salary-btn salary-btn-secondary"
            onClick={handlePrint}
          >
            Print Report
          </button>

          <button
            type="button"
            className="salary-btn salary-btn-primary"
            onClick={openAddModal}
          >
            + Add Salary
          </button>
        </div>
      </div>

      {error && (
        <div className="salary-alert salary-alert-error" role="alert">
          {error}
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
        <div className="salary-alert salary-alert-success no-print">
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      <section className="salary-summary">
        <article className="salary-summary-card">
          <span>Total Salary</span>
          <strong>{money(summary.totalSalary)}</strong>
          <small>Salary plus bonuses</small>
        </article>

        <article className="salary-summary-card">
          <span>Total Paid</span>
          <strong>{money(summary.paid)}</strong>
          <small>Payments recorded</small>
        </article>

        <article className="salary-summary-card">
          <span>Outstanding Balance</span>
          <strong>{money(summary.balance)}</strong>
          <small>Amount still due</small>
        </article>

        <article className="salary-summary-card">
          <span>Fully Paid</span>
          <strong>{summary.paidCount}</strong>
          <small>Salary records</small>
        </article>
      </section>

      <section className="salary-status-summary">
        <div>
          <span className="salary-status-dot dot-paid" />
          Paid
          <strong>{summary.paidCount}</strong>
        </div>

        <div>
          <span className="salary-status-dot dot-partial" />
          Partial
          <strong>{summary.partialCount}</strong>
        </div>

        <div>
          <span className="salary-status-dot dot-pending" />
          Pending
          <strong>{summary.pendingCount}</strong>
        </div>
      </section>

      <section className="salary-panel">
        <div className="salary-panel-header no-print">
          <div>
            <h2>Salary Records</h2>
            <p>{filteredSalaries.length} records found</p>
          </div>

          <div className="salary-filters">
            <input
              type="search"
              placeholder="Search employee or month..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search salary records"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="salary-empty">Loading salary records...</div>
        ) : filteredSalaries.length === 0 ? (
          <div className="salary-empty">No salary records found.</div>
        ) : (
          <div className="salary-table-wrapper">
            <table className="salary-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Month</th>
                  <th>Base Salary</th>
                  <th>Bonus</th>
                  <th>Total Salary</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredSalaries.map((row) => {
                  const total =
                    Number(row.amount || 0) + Number(row.bonus || 0);

                  const paid = Number(row.paid || 0);

                  const remaining = Math.max(0, total - paid);

                  const status = getStatus(row);

                  return (
                    <tr key={row.sal_id}>
                      <td>#{row.sal_id}</td>
                      <td className="salary-employee-name">{row.ename}</td>
                      <td>{dateOnly(row.month_of_payment)}</td>
                      <td>{money(row.amount)}</td>
                      <td>{money(row.bonus)}</td>
                      <td>{money(total)}</td>
                      <td>{money(paid)}</td>
                      <td className="salary-balance">{money(remaining)}</td>
                      <td>{dateOnly(row.payment_date) || "—"}</td>
                      <td>
                        <span
                          className={`salary-status status-${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="salary-actions no-print">
                        <button
                          type="button"
                          className="salary-action-edit"
                          onClick={() => openEditModal(row)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="salary-action-delete"
                          onClick={() => handleDelete(row)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="salary-modal-backdrop no-print"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="salary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="salary-modal-title"
          >
            <div className="salary-modal-header">
              <div>
                <span className="salary-eyebrow">PAYROLL</span>
                <h2 id="salary-modal-title">
                  {editingId ? "Edit Salary" : "Add Salary"}
                </h2>
              </div>

              <button
                type="button"
                className="salary-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="salary-form-grid">
                <label className="salary-field salary-field-full">
                  Employee
                  <select
                    name="eid"
                    value={form.eid}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select employee</option>

                    {employees.map((employee) => (
                      <option key={employee.eid} value={employee.eid}>
                        {employee.ename} — ID {employee.eid}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="salary-field">
                  Salary Month
                  <input
                    type="date"
                    name="month_of_payment"
                    value={form.month_of_payment}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="salary-field">
                  Payment Date
                  <input
                    type="date"
                    name="payment_date"
                    value={form.payment_date}
                    onChange={handleChange}
                  />
                </label>

                <label className="salary-field">
                  Base Salary (AFN)
                  <input
                    type="number"
                    name="amount"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="salary-field">
                  Bonus (AFN)
                  <input
                    type="number"
                    name="bonus"
                    min="0"
                    step="0.01"
                    value={form.bonus}
                    onChange={handleChange}
                  />
                </label>

                <label className="salary-field salary-field-full">
                  Amount Paid (AFN)
                  <input
                    type="number"
                    name="paid"
                    min="0"
                    max={totalSalary}
                    step="0.01"
                    value={form.paid}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              <div className="salary-calculation">
                <div>
                  <span>Total Salary</span>
                  <strong>{money(totalSalary)}</strong>
                </div>

                <div>
                  <span>Remaining Balance</span>
                  <strong>{money(balance)}</strong>
                </div>
              </div>

              <p className="salary-form-note">
                Payment status is calculated automatically from the total salary
                and amount paid.
              </p>

              {error && (
                <div className="salary-alert salary-alert-error">{error}</div>
              )}

              <div className="salary-modal-actions">
                <button
                  type="button"
                  className="salary-btn salary-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="salary-btn salary-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Salary"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
