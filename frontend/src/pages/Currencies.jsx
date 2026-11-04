import { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "./Currencies.css";

export default function Currencies() {
  const [currencies, setCurrencies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currencyCaption, setCurrencyCaption] = useState("");

  useEffect(() => {
    fetchCurrencies();
  }, []);

  async function fetchCurrencies() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/currencies");
      setCurrencies(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load currencies.");
    } finally {
      setLoading(false);
    }
  }

  const filteredCurrencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return currencies.filter((currency) =>
      currency.currency_caption.toLowerCase().includes(query),
    );
  }, [currencies, search]);

  function openAddModal() {
    setEditingId(null);
    setCurrencyCaption("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(currency) {
    setEditingId(currency.currency_id);
    setCurrencyCaption(currency.currency_caption);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setCurrencyCaption("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const caption = currencyCaption.trim();

    if (!caption) {
      setError("Please enter a currency name.");
      return;
    }

    const duplicate = currencies.some(
      (currency) =>
        currency.currency_caption.toLowerCase() === caption.toLowerCase() &&
        currency.currency_id !== editingId,
    );

    if (duplicate) {
      setError("This currency already exists.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId !== null) {
        await api.put(`/currencies/${editingId}`, {
          currency_caption: caption,
        });

        setSuccess("Currency updated successfully.");
      } else {
        await api.post("/currencies", {
          currency_caption: caption,
        });

        setSuccess("Currency added successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setCurrencyCaption("");

      await fetchCurrencies();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save currency.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(currency) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${currency.currency_caption}?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/currencies/${currency.currency_id}`);

      setCurrencies((previous) =>
        previous.filter((item) => item.currency_id !== currency.currency_id),
      );

      setSuccess("Currency deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete currency. It may be used in currency conversions.",
      );
    }
  }

  return (
    <div className="currencies-page">
      <div className="currencies-header">
        <div>
          <h1>Currencies</h1>
          <p>Manage the currencies used in the Building Management System.</p>
        </div>

        <button
          type="button"
          className="currency-primary-btn"
          onClick={openAddModal}
        >
          <span>＋</span> Add Currency
        </button>
      </div>

      <div className="currency-summary-grid">
        <div className="currency-summary-card">
          <div className="currency-summary-icon">💱</div>
          <div>
            <span>Total Currencies</span>
            <h2>{currencies.length}</h2>
          </div>
        </div>

        <div className="currency-summary-card">
          <div className="currency-summary-icon">🔎</div>
          <div>
            <span>Search Results</span>
            <h2>{filteredCurrencies.length}</h2>
          </div>
        </div>
      </div>

      {success && (
        <div className="currency-alert currency-alert-success">
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

      {error && (
        <div className="currency-alert currency-alert-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}

      <section className="currency-content-card">
        <div className="currency-toolbar">
          <div>
            <h2>Currency List</h2>
            <p>View, search, add, edit, or delete currencies.</p>
          </div>

          <div className="currency-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search currencies..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search currencies"
            />
          </div>
        </div>

        {loading ? (
          <div className="currency-state">
            <div className="currency-spinner" />
            <p>Loading currencies...</p>
          </div>
        ) : filteredCurrencies.length === 0 ? (
          <div className="currency-state">
            <div className="currency-empty-icon">💱</div>
            <h3>{search ? "No matching currencies" : "No currencies found"}</h3>
            <p>
              {search
                ? "Try another search term."
                : "Add your first currency to get started."}
            </p>

            {!search && (
              <button
                type="button"
                className="currency-primary-btn"
                onClick={openAddModal}
              >
                Add Currency
              </button>
            )}
          </div>
        ) : (
          <div className="currency-table-wrapper">
            <table className="currency-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Currency Name / Code</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCurrencies.map((currency) => (
                  <tr key={currency.currency_id}>
                    <td>
                      <span className="currency-id">
                        #{currency.currency_id}
                      </span>
                    </td>

                    <td>
                      <div className="currency-name-cell">
                        <span className="currency-name-icon">💵</span>
                        <strong>{currency.currency_caption}</strong>
                      </div>
                    </td>

                    <td>
                      <div className="currency-actions">
                        <button
                          type="button"
                          className="currency-edit-btn"
                          onClick={() => openEditModal(currency)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="currency-delete-btn"
                          onClick={() => handleDelete(currency)}
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

        <div className="currency-table-footer">
          Showing {filteredCurrencies.length} of {currencies.length} currencies
        </div>
      </section>

      {modalOpen && (
        <div
          className="currency-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="currency-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="currency-modal-title"
          >
            <div className="currency-modal-header">
              <div>
                <h2 id="currency-modal-title">
                  {editingId !== null ? "Edit Currency" : "Add Currency"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Update the currency name or code."
                    : "Enter the new currency name or code."}
                </p>
              </div>

              <button
                type="button"
                className="currency-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="currency-form-group">
                <label htmlFor="currency-caption">
                  Currency Name / Code <span>*</span>
                </label>

                <input
                  id="currency-caption"
                  type="text"
                  value={currencyCaption}
                  onChange={(event) => setCurrencyCaption(event.target.value)}
                  placeholder="e.g. AFN, USD, EUR"
                  maxLength={50}
                  required
                  autoFocus
                />

                <small>
                  Enter a unique currency name or code, such as AFN or USD.
                </small>
              </div>

              {error && <div className="currency-form-error">{error}</div>}

              <div className="currency-modal-actions">
                <button
                  type="button"
                  className="currency-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="currency-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Add Currency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
