import { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "./CurrencyConversions.css";

const initialForm = {
  tenant_id: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  from_currency_id: "",
  rate: "",
  to_currency_id: "",
  amount: "",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function CurrencyConversions() {
  const [conversions, setConversions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [conversionRes, tenantRes, currencyRes] = await Promise.all([
        api.get("/currency-conversions"),
        api.get("/tenants"),
        api.get("/currencies"),
      ]);

      setConversions(
        Array.isArray(conversionRes.data) ? conversionRes.data : [],
      );

      setTenants(Array.isArray(tenantRes.data) ? tenantRes.data : []);

      setCurrencies(Array.isArray(currencyRes.data) ? currencyRes.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load currency conversion data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm({
      ...initialForm,
      transaction_date: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.currency_con_id);

    setForm({
      tenant_id: String(item.tenant_id),
      transaction_date: String(item.transaction_date || "").slice(0, 10),
      from_currency_id: String(item.from_currency_id),
      rate: String(item.rate),
      to_currency_id: String(item.to_currency_id),
      amount: String(item.amount),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
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

  const amountReceived = useMemo(() => {
    const amount = Number(form.amount);
    const rate = Number(form.rate);

    if (
      form.amount === "" ||
      form.rate === "" ||
      !Number.isFinite(amount) ||
      !Number.isFinite(rate)
    ) {
      return 0;
    }

    return amount * rate;
  }, [form.amount, form.rate]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const tenantId = Number(form.tenant_id);
    const fromId = Number(form.from_currency_id);
    const toId = Number(form.to_currency_id);
    const rate = Number(form.rate);
    const amount = Number(form.amount);

    if (
      !Number.isSafeInteger(tenantId) ||
      tenantId <= 0 ||
      !Number.isSafeInteger(fromId) ||
      fromId <= 0 ||
      !Number.isSafeInteger(toId) ||
      toId <= 0
    ) {
      setError("Please select a valid tenant and both currencies.");
      return;
    }

    if (fromId === toId) {
      setError("Source and target currencies must be different.");
      return;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Exchange rate must be greater than zero.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (
      form.transaction_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(form.transaction_date)
    ) {
      setError("Please enter a valid transaction date.");
      return;
    }

    const payload = {
      tenant_id: tenantId,
      transaction_date: form.transaction_date || null,
      from_currency_id: fromId,
      rate,
      to_currency_id: toId,
      amount,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/currency-conversions/${editingId}`, payload);
        setSuccess("Currency conversion updated successfully.");
      } else {
        await api.post("/currency-conversions", payload);
        setSuccess("Currency conversion added successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the currency conversion.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/currency-conversions/${deleteItem.currency_con_id}`);

      setDeleteItem(null);
      setSuccess("Currency conversion deleted successfully.");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete the currency conversion.",
      );
      setDeleteItem(null);
    }
  }

  const filteredConversions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversions.filter((item) => {
      const matchesSearch = [
        item.tenant_name,
        item.from_currency,
        item.to_currency,
        item.currency_con_id,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );

      const matchesFrom =
        !fromFilter || String(item.from_currency_id) === fromFilter;

      const matchesTo = !toFilter || String(item.to_currency_id) === toFilter;

      const transactionDate = String(item.transaction_date || "").slice(0, 10);

      const matchesDateFrom = !dateFrom || transactionDate >= dateFrom;

      const matchesDateTo = !dateTo || transactionDate <= dateTo;

      return (
        matchesSearch &&
        matchesFrom &&
        matchesTo &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [conversions, search, fromFilter, toFilter, dateFrom, dateTo]);

  const totalTransactions = conversions.length;

  const totalOriginalAmount = conversions.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const totalConvertedAmount = conversions.reduce(
    (sum, item) => sum + (Number(item.amount) || 0) * (Number(item.rate) || 0),
    0,
  );

  const selectedFromCurrency = currencies.find(
    (currency) => String(currency.currency_id) === form.from_currency_id,
  );

  const selectedToCurrency = currencies.find(
    (currency) => String(currency.currency_id) === form.to_currency_id,
  );

  function resetFilters() {
    setSearch("");
    setFromFilter("");
    setToFilter("");
    setDateFrom("");
    setDateTo("");
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="cc-page">
      <div className="cc-header cc-no-print">
        <div>
          <span className="cc-eyebrow">FINANCIAL MANAGEMENT</span>
          <h1>Currency Conversions</h1>
          <p>
            Manage exchange transactions, currencies, and conversion records.
          </p>
        </div>

        <div className="cc-header-actions">
          <button
            type="button"
            className="cc-btn cc-btn-light"
            onClick={printReport}
          >
            Print Report
          </button>

          <button
            type="button"
            className="cc-btn cc-btn-primary"
            onClick={openAddForm}
          >
            + New Conversion
          </button>
        </div>
      </div>

      {error && (
        <div className="cc-alert cc-alert-error cc-no-print" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="cc-alert cc-alert-success cc-no-print" role="status">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>
            ×
          </button>
        </div>
      )}

      <section className="cc-stats">
        <article className="cc-stat-card">
          <div className="cc-stat-icon">↔</div>
          <div>
            <span>Total Transactions</span>
            <strong>{totalTransactions}</strong>
            <small>All recorded conversions</small>
          </div>
        </article>

        <article className="cc-stat-card">
          <div className="cc-stat-icon">↗</div>
          <div>
            <span>Total Original Amount</span>
            <strong>{formatMoney(totalOriginalAmount)}</strong>
            <small>Across all source currencies</small>
          </div>
        </article>

        <article className="cc-stat-card">
          <div className="cc-stat-icon">⇄</div>
          <div>
            <span>Total Converted Amount</span>
            <strong>{formatMoney(totalConvertedAmount)}</strong>
            <small>Amount multiplied by exchange rate</small>
          </div>
        </article>

        <article className="cc-stat-card">
          <div className="cc-stat-icon">⌕</div>
          <div>
            <span>Filtered Records</span>
            <strong>{filteredConversions.length}</strong>
            <small>Matching current filters</small>
          </div>
        </article>
      </section>

      <section className="cc-panel">
        <div className="cc-panel-heading">
          <div>
            <h2>Conversion Records</h2>
            <p>View, search, update, delete, or print transaction records.</p>
          </div>

          <span className="cc-record-count">
            {filteredConversions.length} records
          </span>
        </div>

        <div className="cc-filters cc-no-print">
          <div className="cc-search">
            <label htmlFor="cc-search">Search</label>
            <input
              id="cc-search"
              type="search"
              placeholder="Tenant, currency, or transaction ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="cc-from-filter">From Currency</label>
            <select
              id="cc-from-filter"
              value={fromFilter}
              onChange={(event) => setFromFilter(event.target.value)}
            >
              <option value="">All currencies</option>
              {currencies.map((currency) => (
                <option key={currency.currency_id} value={currency.currency_id}>
                  {currency.currency_caption}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cc-to-filter">To Currency</label>
            <select
              id="cc-to-filter"
              value={toFilter}
              onChange={(event) => setToFilter(event.target.value)}
            >
              <option value="">All currencies</option>
              {currencies.map((currency) => (
                <option key={currency.currency_id} value={currency.currency_id}>
                  {currency.currency_caption}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cc-date-from">Date From</label>
            <input
              id="cc-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="cc-date-to">Date To</label>
            <input
              id="cc-date-to"
              type="date"
              min={dateFrom || undefined}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="cc-btn cc-btn-light cc-reset-btn"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>

        {loading ? (
          <div className="cc-state">
            <div className="cc-spinner" />
            <p>Loading currency conversions...</p>
          </div>
        ) : filteredConversions.length === 0 ? (
          <div className="cc-state">
            <div className="cc-empty-icon">⇄</div>
            <h3>No conversions found</h3>
            <p>Add a conversion or adjust your search and filters.</p>
          </div>
        ) : (
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tenant</th>
                  <th>Date</th>
                  <th>From</th>
                  <th>Original Amount</th>
                  <th>Exchange Rate</th>
                  <th>To</th>
                  <th>Converted Amount</th>
                  <th className="cc-no-print">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredConversions.map((item) => {
                  const amount = Number(item.amount) || 0;
                  const rate = Number(item.rate) || 0;
                  const converted = amount * rate;

                  return (
                    <tr key={item.currency_con_id}>
                      <td>
                        <span className="cc-id">#{item.currency_con_id}</span>
                      </td>

                      <td className="cc-tenant">{item.tenant_name || "—"}</td>

                      <td>
                        {String(item.transaction_date || "").slice(0, 10)}
                      </td>

                      <td>
                        <span className="cc-currency-badge">
                          {item.from_currency || "—"}
                        </span>
                      </td>

                      <td className="cc-number">{formatMoney(amount)}</td>

                      <td className="cc-number">{formatMoney(rate)}</td>

                      <td>
                        <span className="cc-currency-badge cc-target-badge">
                          {item.to_currency || "—"}
                        </span>
                      </td>

                      <td className="cc-number cc-converted">
                        {formatMoney(converted)}
                      </td>

                      <td className="cc-actions cc-no-print">
                        <button
                          type="button"
                          className="cc-icon-btn cc-edit-btn"
                          title="Edit conversion"
                          aria-label={`Edit conversion ${item.currency_con_id}`}
                          onClick={() => openEditForm(item)}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="cc-icon-btn cc-delete-btn"
                          title="Delete conversion"
                          aria-label={`Delete conversion ${item.currency_con_id}`}
                          onClick={() => setDeleteItem(item)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="cc-panel-footer">
          <span>
            Showing {filteredConversions.length} of {conversions.length}{" "}
            transactions
          </span>
          <span>Currency Conversion Report</span>
        </div>
      </section>

      {showForm && (
        <div
          className="cc-modal-overlay cc-no-print"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="cc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-modal-title"
          >
            <div className="cc-modal-header">
              <div>
                <span className="cc-eyebrow">FINANCIAL TRANSACTION</span>
                <h2 id="cc-modal-title">
                  {editingId !== null ? "Edit Conversion" : "New Conversion"}
                </h2>
              </div>

              <button
                type="button"
                className="cc-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="cc-form-grid">
                <div className="cc-field cc-field-full">
                  <label htmlFor="cc-tenant">Tenant *</label>
                  <select
                    id="cc-tenant"
                    name="tenant_id"
                    value={form.tenant_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.tenant_id} value={tenant.tenant_id}>
                        {tenant.tenant_name} (ID: {tenant.tenant_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cc-field cc-field-full">
                  <label htmlFor="cc-date">Transaction Date</label>
                  <input
                    id="cc-date"
                    name="transaction_date"
                    type="date"
                    value={form.transaction_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="cc-from">From Currency *</label>
                  <select
                    id="cc-from"
                    name="from_currency_id"
                    value={form.from_currency_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option
                        key={currency.currency_id}
                        value={currency.currency_id}
                      >
                        {currency.currency_caption}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cc-field">
                  <label htmlFor="cc-to">To Currency *</label>
                  <select
                    id="cc-to"
                    name="to_currency_id"
                    value={form.to_currency_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option
                        key={currency.currency_id}
                        value={currency.currency_id}
                      >
                        {currency.currency_caption}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cc-field">
                  <label htmlFor="cc-amount">
                    Original Amount *
                    {selectedFromCurrency &&
                      ` (${selectedFromCurrency.currency_caption})`}
                  </label>
                  <input
                    id="cc-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="cc-rate">Exchange Rate *</label>
                  <input
                    id="cc-rate"
                    name="rate"
                    type="number"
                    min="0.000001"
                    step="any"
                    value={form.rate}
                    onChange={handleChange}
                    placeholder="Enter rate"
                    required
                  />
                </div>
              </div>

              <div className="cc-calculation">
                <span>Converted Amount</span>
                <strong>
                  {formatMoney(amountReceived)}{" "}
                  {selectedToCurrency?.currency_caption || ""}
                </strong>
                <small>Original amount × exchange rate</small>
              </div>

              {error && <div className="cc-alert cc-alert-error">{error}</div>}

              <div className="cc-modal-actions">
                <button
                  type="button"
                  className="cc-btn cc-btn-light"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cc-btn cc-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Save Conversion"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteItem && (
        <div className="cc-modal-overlay cc-no-print">
          <section
            className="cc-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cc-delete-title"
          >
            <div className="cc-delete-icon">!</div>
            <h2 id="cc-delete-title">Delete Conversion?</h2>
            <p>
              Are you sure you want to delete transaction #
              {deleteItem.currency_con_id} for{" "}
              <strong>{deleteItem.tenant_name}</strong>? This action cannot be
              undone.
            </p>

            <div className="cc-modal-actions">
              <button
                type="button"
                className="cc-btn cc-btn-light"
                onClick={() => setDeleteItem(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="cc-btn cc-btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default CurrencyConversions;
