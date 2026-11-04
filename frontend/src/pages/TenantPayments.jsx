/*import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "./TenantPayments.css";

const initialForm = {
  rental_id: "",
  payment_month: "",
  rent: "",
  last_reading_meter: "",
  current_reading_meter: "",
  meter_unit_rate: "0",
  payment_date: "",
  status: "Pending",
};

const currency = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(value) {
  return currency.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = String(value).slice(0, 10);
  const [year, month, day] = date.split("-");

  return year && month && day ? `${year}-${month}-${day}` : date;
}

function getMonthLabel(value) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return formatDate(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function getRentalLabel(rental) {
  const tenant = rental.tenant_name || "Tenant #${rental.tenant_id}";
  const service = rental.services_no || "Service #${rental.rental_services_id}";
  const building = rental.building_name || "Building";

  return "${tenant} — ${service} — ${building}";
}

function getMeterCost(payment) {
  const last = Number(payment.last_reading_meter) || 0;
  const current = Number(payment.current_reading_meter) || 0;
  const rate = Number(payment.meter_unit_rate) || 0;

  return Math.max(0, current - last) * rate;
}

export default function TenantPayments() {
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [form, setForm] = useState(initialForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [paymentsResponse, rentalsResponse] = await Promise.all([
        api.get("/tenant-payments"),
        api.get("/rentals"),
      ]);

      setPayments(
        Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [],
      );

      setRentals(
        Array.isArray(rentalsResponse.data) ? rentalsResponse.data : [],
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesStatus =
        statusFilter === "All" || payment.status === statusFilter;

      const searchableText = [
        payment.tenant_name,
        payment.services_no,
        payment.building_name,
        payment.payment_month,
        payment.payment_date,
        payment.status,
        payment.rental_payment_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableText.includes(query);
    });
  }, [payments, search, statusFilter]);

  const summary = useMemo(() => {
    return payments.reduce(
      (totals, payment) => {
        totals.total += 1;

        if (payment.status === "Paid") {
          totals.paid += 1;
          totals.paidRent += Number(payment.rent) || 0;
        }

        if (payment.status === "Partial") {
          totals.partial += 1;
        }

        if (payment.status === "Pending") {
          totals.pending += 1;
        }

        return totals;
      },
      {
        total: 0,
        paid: 0,
        partial: 0,
        pending: 0,
        paidRent: 0,
      },
    );
  }, [payments]);

  function openAddModal() {
    setEditingPayment(null);
    setForm({ ...initialForm });
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openEditModal(payment) {
    setEditingPayment(payment);

    setForm({
      rental_id: String(payment.rental_id ?? ""),
      payment_month: formatDate(payment.payment_month),
      rent: String(payment.rent ?? ""),
      last_reading_meter:
        payment.last_reading_meter == null
          ? ""
          : String(payment.last_reading_meter),
      current_reading_meter:
        payment.current_reading_meter == null
          ? ""
          : String(payment.current_reading_meter),
      meter_unit_rate: String(payment.meter_unit_rate ?? 0),
      payment_date: payment.payment_date
        ? formatDate(payment.payment_date)
        : "",
      status: payment.status || "Pending",
    });

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingPayment(null);
    setForm({ ...initialForm });
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  const selectedRental = rentals.find(
    (rental) => String(rental.rental_id) === String(form.rental_id),
  );

  const calculatedMeterCost = useMemo(() => {
    const last = Number(form.last_reading_meter) || 0;
    const current = Number(form.current_reading_meter) || 0;
    const rate = Number(form.meter_unit_rate) || 0;

    return Math.max(0, current - last) * rate;
  }, [
    form.last_reading_meter,
    form.current_reading_meter,
    form.meter_unit_rate,
  ]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.rental_id) {
      setError("Please select a rental.");
      return;
    }

    if (!form.payment_month) {
      setError("Please select the payment month.");
      return;
    }

    if (form.rent === "" || !Number.isFinite(Number(form.rent))) {
      setError("Please enter a valid rent amount.");
      return;
    }

    if (Number(form.rent) < 0) {
      setError("Rent cannot be negative.");
      return;
    }

    const last =
      form.last_reading_meter === "" ? null : Number(form.last_reading_meter);

    const current =
      form.current_reading_meter === ""
        ? null
        : Number(form.current_reading_meter);

    const rate = form.meter_unit_rate === "" ? 0 : Number(form.meter_unit_rate);

    if (
      (last !== null && (!Number.isFinite(last) || last < 0)) ||
      (current !== null && (!Number.isFinite(current) || current < 0))
    ) {
      setError("Meter readings must be valid non-negative numbers.");
      return;
    }

    if (last !== null && current !== null && current < last) {
      setError("Current meter reading cannot be less than the last reading.");
      return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
      setError("Meter unit rate must be a non-negative number.");
      return;
    }

    if (form.payment_date && form.payment_date < form.payment_month) {
      setError(
        "Payment date cannot be earlier than the selected payment month.",
      );
      return;
    }

    const payload = {
      rental_id: Number(form.rental_id),
      payment_month: form.payment_month,
      rent: Number(form.rent),
      last_reading_meter: last,
      current_reading_meter: current,
      meter_unit_rate: rate,
      payment_date: form.payment_date || null,
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingPayment) {
        await api.put(
          `/tenant-payments/${editingPayment.rental_payment_id}`,
          payload,
        );

        setSuccess("Payment updated successfully.");
      } else {
        await api.post("/tenant-payments", payload);
        setSuccess("Payment created successfully.");
      }

      setIsModalOpen(false);
      setEditingPayment(null);
      setForm({ ...initialForm });

      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(payment) {
    const confirmed = window.confirm(
      `Delete payment #${payment.rental_payment_id} for ${payment.tenant_name || "this tenant"}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/tenant-payments/${payment.rental_payment_id}`);

      setSuccess("Payment deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function printPayments() {
    window.print();
  }

  return (
    <main className="payments-page">
      <header className="payments-header">
        <div>
          <span className="payments-eyebrow">FINANCIAL MANAGEMENT</span>
          <h1>Tenant Payments</h1>
          <p>Manage rental payments, monthly rent, and meter readings.</p>
        </div>

        <div className="payments-header-actions">
          <button
            type="button"
            className="payments-btn payments-btn-secondary"
            onClick={printPayments}
          >
            Print Report
          </button>

          <button
            type="button"
            className="payments-btn payments-btn-primary"
            onClick={openAddModal}
          >
            + Add Payment
          </button>
        </div>
      </header>

      {error && !isModalOpen && (
        <div className="payments-alert payments-alert-error" role="alert">
          {error}
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
        <div className="payments-alert payments-alert-success" role="status">
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}

      <section className="payments-summary">
        <article className="payments-summary-card">
          <span>Total Payments</span>
          <strong>{summary.total}</strong>
          <small>All recorded payments</small>
        </article>

        <article className="payments-summary-card">
          <span>Paid</span>
          <strong>{summary.paid}</strong>
          <small>Fully paid records</small>
        </article>

        <article className="payments-summary-card">
          <span>Partial</span>
          <strong>{summary.partial}</strong>
          <small>Partially paid records</small>
        </article>

        <article className="payments-summary-card">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
          <small>Awaiting payment</small>
        </article>

        <article className="payments-summary-card payments-summary-highlight">
          <span>Paid Rent Total</span>
          <strong>{formatAmount(summary.paidRent)}</strong>
          <small>Rent amount for Paid records</small>
        </article>
      </section>

      <section className="payments-panel">
        <div className="payments-toolbar">
          <div>
            <h2>Payment Records</h2>
            <p>{filteredPayments.length} records found</p>
          </div>

          <div className="payments-filters">
            <label className="payments-search">
              <span className="sr-only">Search payments</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tenant, building, service..."
              />
            </label>

            <label>
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </label>

            <button
              type="button"
              className="payments-btn payments-btn-secondary"
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="payments-state">Loading payment records...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="payments-state">
            <span className="payments-empty-icon">▤</span>
            <h3>No payments found</h3>
            <p>Try changing your search or add a new rental payment.</p>
          </div>
        ) : (
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tenant / Property</th>
                  <th>Payment Month</th>
                  <th>Rent</th>
                  <th>Meter Readings</th>
                  <th>Meter Cost</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.rental_payment_id}>
                    <td data-label="ID">
                      <span className="payments-id">
                        #{payment.rental_payment_id}
                      </span>
                    </td>

                    <td data-label="Tenant / Property">
                      <div className="payments-tenant-name">
                        {payment.tenant_name || "Unknown tenant"}
                      </div>
                      <div className="payments-property">
                        {payment.services_no || "No service number"}
                      </div>
                      <div className="payments-property">
                        {payment.building_name || "Unknown building"}
                      </div>
                    </td>

                    <td data-label="Payment Month">
                      {getMonthLabel(payment.payment_month)}
                    </td>

                    <td data-label="Rent" className="payments-money">
                      {formatAmount(payment.rent)}
                    </td>

                    <td data-label="Meter Readings">
                      <div>Last: {payment.last_reading_meter ?? "—"}</div>
                      <div>Current: {payment.current_reading_meter ?? "—"}</div>
                      <small>
                        Rate: {formatAmount(payment.meter_unit_rate)}
                      </small>
                    </td>

                    <td data-label="Meter Cost" className="payments-money">
                      {formatAmount(
                        payment.meter_cost ?? getMeterCost(payment),
                      )}
                    </td>

                    <td data-label="Payment Date">
                      {formatDate(payment.payment_date)}
                    </td>

                    <td data-label="Status">
                      <span
                        className={`payments-status payments-status-${String(
                          payment.status || "Pending",
                        ).toLowerCase()}`}
                      >
                        {payment.status || "Pending"}
                      </span>
                    </td>

                    <td data-label="Actions" className="no-print">
                      <div className="payments-row-actions">
                        <button
                          type="button"
                          className="payments-action-edit"
                          onClick={() => openEditModal(payment)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="payments-action-delete"
                          onClick={() => handleDelete(payment)}
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
      </section>

      {isModalOpen && (
        <div
          className="payments-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="payments-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payments-modal-title"
          >
            <header className="payments-modal-header">
              <div>
                <span className="payments-eyebrow">PAYMENT MANAGEMENT</span>
                <h2 id="payments-modal-title">
                  {editingPayment ? "Edit Payment" : "Add Payment"}
                </h2>
              </div>

              <button
                type="button"
                className="payments-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </header>

            {error && (
              <div className="payments-alert payments-alert-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="payments-form-grid">
                <label className="payments-field payments-field-full">
                  <span>Rental / Tenant / Property *</span>
                  <select
                    name="rental_id"
                    value={form.rental_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a rental</option>

                    {rentals.map((rental) => (
                      <option key={rental.rental_id} value={rental.rental_id}>
                        {getRentalLabel(rental)}
                      </option>
                    ))}
                  </select>

                  {rentals.length === 0 && (
                    <small>
                      No rentals found. Create a rental before adding payments.
                    </small>
                  )}
                </label>

                {selectedRental && (
                  <div className="payments-selected-rental payments-field-full">
                    <span>
                      Tenant:{" "}
                      <strong>{selectedRental.tenant_name || "Unknown"}</strong>
                    </span>
                    <span>
                      Service:{" "}
                      <strong>{selectedRental.services_no || "Unknown"}</strong>
                    </span>
                    <span>
                      Building:{" "}
                      <strong>
                        {selectedRental.building_name || "Unknown"}
                      </strong>
                    </span>
                  </div>
                )}

                <label className="payments-field">
                  <span>Payment Month *</span>
                  <input
                    type="date"
                    name="payment_month"
                    value={form.payment_month}
                    onChange={handleChange}
                    required
                  />
                  <small>
                    Select the date representing this payment period.
                  </small>
                </label>

                <label className="payments-field">
                  <span>Rent Amount *</span>
                  <input
                    type="number"
                    name="rent"
                    value={form.rent}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                    placeholder="e.g. 12000"
                  />
                </label>

                <label className="payments-field">
                  <span>Last Meter Reading</span>
                  <input
                    type="number"
                    name="last_reading_meter"
                    value={form.last_reading_meter}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    placeholder="e.g. 120"
                  />
                </label>

                <label className="payments-field">
                  <span>Current Meter Reading</span>
                  <input
                    type="number"
                    name="current_reading_meter"
                    value={form.current_reading_meter}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    placeholder="e.g. 150"
                  />
                </label>

                <label className="payments-field">
                  <span>Meter Unit Rate</span>
                  <input
                    type="number"
                    name="meter_unit_rate"
                    value={form.meter_unit_rate}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    placeholder="e.g. 5"
                  />
                </label>

                <label className="payments-field">
                  <span>Payment Date</span>
                  <input
                    type="date"
                    name="payment_date"
                    value={form.payment_date}
                    onChange={handleChange}
                  />
                </label>

                <label className="payments-field">
                  <span>Payment Status *</span>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </label>

                <div className="payments-calculation payments-field-full">
                  <span>Calculated Meter Cost</span>
                  <strong>{formatAmount(calculatedMeterCost)}</strong>
                  <small>(Current reading − Last reading) × Unit rate</small>
                </div>
              </div>

              <footer className="payments-modal-footer">
                <button
                  type="button"
                  className="payments-btn payments-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payments-btn payments-btn-primary"
                  disabled={saving || rentals.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : editingPayment
                      ? "Update Payment"
                      : "Save Payment"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
*/
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "./TenantPayments.css";

const emptyForm = {
  rental_id: "",
  payment_month: new Date().toISOString().slice(0, 7) + "-01",
  rent: "",
  last_reading_meter: "",
  current_reading_meter: "",
  meter_unit_rate: "",
  paid_amount: "0",
  payment_date: "",
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const numberValue = (value) =>
  value === "" || value == null ? 0 : Number(value);

const getMeterCost = (payment) => {
  const last = numberValue(payment.last_reading_meter);
  const current = numberValue(payment.current_reading_meter);
  const rate = numberValue(payment.meter_unit_rate);

  return Math.max(0, current - last) * rate;
};

const getTotal = (payment) => numberValue(payment.rent) + getMeterCost(payment);

const getBalance = (payment) =>
  Math.max(0, getTotal(payment) - numberValue(payment.paid_amount));

const getStatus = (payment) => {
  const total = getTotal(payment);
  const paid = numberValue(payment.paid_amount);

  if (paid >= total && total > 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong.";

function TenantPayments() {
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [paymentsResponse, rentalsResponse] = await Promise.all([
        api.get("/tenant-payments"),
        api.get("/rentals"),
      ]);

      setPayments(
        Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [],
      );

      setRentals(
        Array.isArray(rentalsResponse.data) ? rentalsResponse.data : [],
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    const totalAmount = payments.reduce(
      (sum, payment) => sum + getTotal(payment),
      0,
    );

    const paidAmount = payments.reduce(
      (sum, payment) => sum + numberValue(payment.paid_amount),
      0,
    );

    return {
      totalAmount,
      paidAmount,
      remainingAmount: payments.reduce(
        (sum, payment) => sum + getBalance(payment),
        0,
      ),
      totalPayments: payments.length,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch = [
        payment.tenant_name,
        payment.building_name,
        payment.services_no,
        payment.payment_month,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );

      const matchesStatus =
        statusFilter === "All" || getStatus(payment) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (payment) => {
    setEditingId(payment.rental_payment_id);

    setForm({
      rental_id: String(payment.rental_id),
      payment_month: String(payment.payment_month).slice(0, 10),
      rent: String(payment.rent ?? ""),
      last_reading_meter:
        payment.last_reading_meter == null
          ? ""
          : String(payment.last_reading_meter),
      current_reading_meter:
        payment.current_reading_meter == null
          ? ""
          : String(payment.current_reading_meter),
      meter_unit_rate: String(payment.meter_unit_rate ?? 0),
      paid_amount: String(payment.paid_amount ?? 0),
      payment_date: payment.payment_date
        ? String(payment.payment_date).slice(0, 10)
        : "",
    });

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const selectedRental = rentals.find(
    (rental) => Number(rental.rental_id) === Number(form.rental_id),
  );

  const preview = {
    rent: numberValue(form.rent),
    last_reading_meter:
      form.last_reading_meter === ""
        ? null
        : numberValue(form.last_reading_meter),
    current_reading_meter:
      form.current_reading_meter === ""
        ? null
        : numberValue(form.current_reading_meter),
    meter_unit_rate: numberValue(form.meter_unit_rate),
    paid_amount: numberValue(form.paid_amount),
  };

  const previewTotal = getTotal(preview);
  const previewRemaining = getBalance(preview);
  const previewStatus = getStatus(preview);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const rent = Number(form.rent);
    const paidAmount = Number(form.paid_amount);
    const lastReading =
      form.last_reading_meter === "" ? null : Number(form.last_reading_meter);
    const currentReading =
      form.current_reading_meter === ""
        ? null
        : Number(form.current_reading_meter);
    const unitRate =
      form.meter_unit_rate === "" ? 0 : Number(form.meter_unit_rate);

    if (!form.rental_id) {
      setError("Please select a rental.");
      return;
    }

    if (!form.payment_month) {
      setError("Please select the payment month.");
      return;
    }

    if (!Number.isFinite(rent) || rent < 0) {
      setError("Rent must be a valid non-negative number.");
      return;
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      setError("Paid amount must be a non-negative number.");
      return;
    }

    if (
      [lastReading, currentReading].some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      setError("Meter readings must be non-negative numbers.");
      return;
    }

    if (
      lastReading !== null &&
      currentReading !== null &&
      currentReading < lastReading
    ) {
      setError("Current meter reading cannot be less than the last reading.");
      return;
    }

    if (!Number.isFinite(unitRate) || unitRate < 0) {
      setError("Meter unit rate must be non-negative.");
      return;
    }

    const total =
      rent +
      (lastReading !== null && currentReading !== null
        ? Math.max(0, currentReading - lastReading) * unitRate
        : 0);

    if (paidAmount > total) {
      setError("Paid amount cannot exceed the total rent and meter cost.");
      return;
    }

    const paymentData = {
      rental_id: Number(form.rental_id),
      payment_month: form.payment_month,
      rent,
      last_reading_meter: lastReading,
      current_reading_meter: currentReading,
      meter_unit_rate: unitRate,
      paid_amount: paidAmount,
      payment_date: form.payment_date || null,
      status:
        paidAmount >= total && total > 0
          ? "Paid"
          : paidAmount > 0
            ? "Partial"
            : "Pending",
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/tenant-payments/${editingId}`, paymentData);
        setSuccess("Payment updated successfully.");
      } else {
        await api.post("/tenant-payments", paymentData);
        setSuccess("Payment created successfully.");
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payment) => {
    const confirmed = window.confirm(
      `Delete payment #${payment.rental_payment_id} for ${payment.tenant_name}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/tenant-payments/${payment.rental_payment_id}`);

      setSuccess("Payment deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <main className="tp-page">
      <header className="tp-header">
        <div>
          <h1>Tenant Payments</h1>
          <p>Manage rent, meter costs, and tenant payments.</p>
        </div>

        <button
          className="tp-btn tp-btn-primary"
          onClick={openAddModal}
          type="button"
        >
          + Add Payment
        </button>
      </header>

      {error && !isModalOpen && (
        <div className="tp-alert tp-alert-error" role="alert">
          {error}
          <button onClick={() => setError("")} type="button">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="tp-alert tp-alert-success" role="status">
          {success}
          <button onClick={() => setSuccess("")} type="button">
            ×
          </button>
        </div>
      )}

      <section className="tp-summary">
        <article className="tp-card tp-card-total">
          <span>Total Rent + Meter Cost</span>
          <strong>{money(totals.totalAmount)}</strong>
          <small>Total amount due</small>
        </article>

        <article className="tp-card tp-card-paid">
          <span>Total Paid</span>
          <strong>{money(totals.paidAmount)}</strong>
          <small>Money received</small>
        </article>

        <article className="tp-card tp-card-pending">
          <span>Total Remaining</span>
          <strong>{money(totals.remainingAmount)}</strong>
          <small>Outstanding balance</small>
        </article>

        <article className="tp-card tp-card-count">
          <span>Total Payments</span>
          <strong>{totals.totalPayments}</strong>
          <small>Payment records</small>
        </article>
      </section>

      <section className="tp-toolbar">
        <input
          type="search"
          placeholder="Search tenant, building, unit..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search payments"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter payment status"
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Pending">Pending</option>
        </select>

        <button
          className="tp-btn tp-btn-light"
          onClick={fetchData}
          type="button"
        >
          Refresh
        </button>
      </section>

      <section className="tp-table-card">
        {loading ? (
          <div className="tp-empty">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="tp-empty">No payments found.</div>
        ) : (
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Tenant / Unit</th>
                  <th>Payment Month</th>
                  <th>Rent</th>
                  <th>Meter Cost</th>
                  <th>Total Due</th>
                  <th>Paid Amount</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => {
                  const total = getTotal(payment);
                  const paid = numberValue(payment.paid_amount);
                  const remaining = getBalance(payment);
                  const status = getStatus(payment);

                  return (
                    <tr key={payment.rental_payment_id}>
                      <td>
                        <strong>{payment.tenant_name}</strong>
                        <small>
                          {payment.building_name} · {payment.services_no}
                        </small>
                      </td>

                      <td>{String(payment.payment_month).slice(0, 7)}</td>

                      <td>{money(payment.rent)}</td>
                      <td>{money(getMeterCost(payment))}</td>
                      <td className="tp-amount">{money(total)}</td>
                      <td className="tp-paid-value">{money(paid)}</td>
                      <td className="tp-balance-value">{money(remaining)}</td>

                      <td>
                        <span
                          className={`tp-status tp-status-${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td>
                        {payment.payment_date
                          ? String(payment.payment_date).slice(0, 10)
                          : "—"}
                      </td>

                      <td>
                        <div className="tp-actions">
                          <button
                            className="tp-btn-edit"
                            type="button"
                            onClick={() => openEditModal(payment)}
                          >
                            Edit
                          </button>

                          <button
                            className="tp-btn-delete"
                            type="button"
                            onClick={() => handleDelete(payment)}
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
          </div>
        )}
      </section>

      {isModalOpen && (
        <div
          className="tp-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="tp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tp-modal-title"
          >
            <header className="tp-modal-header">
              <div>
                <h2 id="tp-modal-title">
                  {editingId ? "Edit Payment" : "Add Payment"}
                </h2>
                <p>Enter the rent and payment details below.</p>
              </div>

              <button
                className="tp-close"
                onClick={closeModal}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="tp-alert tp-alert-error" role="alert">
                  {error}
                </div>
              )}

              <div className="tp-form-grid">
                <label className="tp-field tp-field-full">
                  Rental / Tenant / Unit
                  <select
                    name="rental_id"
                    value={form.rental_id}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select a rental</option>

                    {rentals.map((rental) => (
                      <option key={rental.rental_id} value={rental.rental_id}>
                        #{rental.rental_id} — {rental.tenant_name}
                        {" · "}
                        {rental.building_name} / {rental.services_no}
                        {" · "}
                        {rental.status}
                      </option>
                    ))}
                  </select>
                  {selectedRental && (
                    <small className="tp-hint">
                      Selected: {selectedRental.tenant_name} —{" "}
                      {selectedRental.services_no}
                    </small>
                  )}
                </label>

                <label className="tp-field">
                  Payment Month
                  <input
                    type="date"
                    name="payment_month"
                    value={form.payment_month}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tp-field">
                  Monthly Rent
                  <input
                    type="number"
                    name="rent"
                    min="0"
                    step="0.01"
                    value={form.rent}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tp-field">
                  Last Meter Reading
                  <input
                    type="number"
                    name="last_reading_meter"
                    min="0"
                    step="0.01"
                    value={form.last_reading_meter}
                    onChange={updateField}
                    placeholder="Optional"
                  />
                </label>

                <label className="tp-field">
                  Current Meter Reading
                  <input
                    type="number"
                    name="current_reading_meter"
                    min="0"
                    step="0.01"
                    value={form.current_reading_meter}
                    onChange={updateField}
                    placeholder="Optional"
                  />
                </label>

                <label className="tp-field">
                  Meter Unit Rate
                  <input
                    type="number"
                    name="meter_unit_rate"
                    min="0"
                    step="0.01"
                    value={form.meter_unit_rate}
                    onChange={updateField}
                  />
                </label>

                <label className="tp-field">
                  Amount Paid
                  <input
                    type="number"
                    name="paid_amount"
                    min="0"
                    step="0.01"
                    value={form.paid_amount}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tp-field">
                  Payment Date
                  <input
                    type="date"
                    name="payment_date"
                    value={form.payment_date}
                    onChange={updateField}
                  />
                </label>
              </div>

              <div className="tp-preview">
                <div>
                  <span>Meter Cost</span>
                  <strong>{money(getMeterCost(preview))}</strong>
                </div>

                <div>
                  <span>Total Due</span>
                  <strong>{money(previewTotal)}</strong>
                </div>

                <div>
                  <span>Remaining</span>
                  <strong>{money(previewRemaining)}</strong>
                </div>

                <div>
                  <span>Automatic Status</span>
                  <strong
                    className={`tp-status tp-status-${previewStatus.toLowerCase()}`}
                  >
                    {previewStatus}
                  </strong>
                </div>
              </div>

              <footer className="tp-modal-footer">
                <button
                  className="tp-btn tp-btn-light"
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="tp-btn tp-btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Payment"
                      : "Save Payment"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default TenantPayments;
