import { useCallback, useEffect, useState } from "react";
import api from "../api/axiosInstance";
import "./Buildings.css";

//const API_URL = "http://localhost:5000/api/buildings";

const emptyForm = {
  building_name: "",
  location: "",
  office_phone: "",
  floor: 1,
  note: "",
};

function Buildings() {
  const [buildings, setBuildings] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const fetchBuildings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      //const response = await fetch(API_URL);
      const response = await api.get("/buildings");

      // if (!response.ok) {
      //   throw new Error("Could not load buildings.");
      // }

      //const data = await response.json();
      const data = response.data;

      setBuildings(
        Array.isArray(data)
          ? data
          : Array.isArray(data.buildings)
            ? data.buildings
            : [],
      );
    } catch (err) {
      setError(err.message || "Failed to load buildings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(building) {
    setEditingId(building.building_id);

    setForm({
      building_name: building.building_name ?? "",
      location: building.location ?? "",
      office_phone: building.office_phone ?? "",
      floor: building.floor ?? 1,
      note: building.note ?? "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      building_name: form.building_name.trim(),
      location: form.location.trim(),
      office_phone: form.office_phone.trim(),
      floor: Number(form.floor),
      note: form.note.trim(),
    };

    try {
      let response;
      if (editingId) {
        response = await api.put(`/buildings/${editingId}`, payload);
      } else {
        // Create a new building
        response = await api.post("/buildings", payload);
      }
      //   const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      //   const response = await fetch(url, {
      //     method: editingId ? "PUT" : "POST",

      //     headers: {
      //       "Content-Type": "application/json",
      //     },

      //     body: JSON.stringify(payload),
      //   });

      //   const result = await response.json().catch(() => null);

      //   if (!response.ok) {
      //     throw new Error(
      //       result?.message || result?.error || "Could not save the building.",
      //     );
      //   }

      setSuccess(
        editingId
          ? "Building updated successfully."
          : "Building added successfully.",
      );

      closeForm();

      await fetchBuildings();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(building) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${building.building_name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/buildings/${building.building_id}`);
      // const response = await fetch(`${API_URL}/${building.building_id}`, {
      //   method: "DELETE",
      // });

      // const result = await response.json().catch(() => null);

      // if (!response.ok) {
      //   throw new Error(
      //     result?.message || result?.error || "Could not delete the building.",
      //   );
      // }

      setSuccess("Building deleted successfully.");

      await fetchBuildings();
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  }

  const filteredBuildings = buildings.filter((building) => {
    const query = search.toLowerCase();

    return (
      String(building.building_name ?? "")
        .toLowerCase()
        .includes(query) ||
      String(building.location ?? "")
        .toLowerCase()
        .includes(query) ||
      String(building.building_id ?? "").includes(query)
    );
  });

  return (
    <div className="buildings-page">
      <section className="buildings-intro">
        <div>
          <h2>Buildings Management</h2>

          <p>Add, view, update and manage registered buildings.</p>
        </div>

        <button
          type="button"
          className="building-primary-button"
          onClick={openAddForm}
        >
          + Add Building
        </button>
      </section>

      {error && (
        <div className="building-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="building-alert success" role="status">
          {success}
        </div>
      )}

      <section className="buildings-panel">
        <div className="buildings-toolbar">
          <div>
            <h3>All Buildings</h3>

            <p>
              {buildings.length} registered building
              {buildings.length === 1 ? "" : "s"}
            </p>
          </div>

          <input
            type="search"
            className="building-search"
            placeholder="Search buildings..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search buildings"
          />
        </div>

        {showForm && (
          <form className="building-form" onSubmit={handleSubmit}>
            <div className="building-form-heading">
              <h3>{editingId ? "Update Building" : "Add New Building"}</h3>

              <button
                type="button"
                className="building-close-button"
                onClick={closeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <div className="building-form-grid">
              <label>
                Building Name *
                <input
                  name="building_name"
                  value={form.building_name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="Enter building name"
                />
              </label>

              <label>
                Location *
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                  placeholder="Enter location"
                />
              </label>

              <label>
                Office Phone
                <input
                  name="office_phone"
                  value={form.office_phone}
                  onChange={handleChange}
                  type="tel"
                  placeholder="Enter phone number"
                />
              </label>

              <label>
                Number of Floors *
                <input
                  name="floor"
                  type="number"
                  min="1"
                  step="1"
                  value={form.floor}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="building-note-field">
                Notes
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Additional information..."
                />
              </label>
            </div>

            <div className="building-form-actions">
              <button
                type="button"
                className="building-secondary-button"
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="building-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Building"
                    : "Save Building"}
              </button>
            </div>
          </form>
        )}

        <div className="buildings-table-wrapper">
          {loading ? (
            <div className="buildings-message">Loading buildings...</div>
          ) : filteredBuildings.length === 0 ? (
            <div className="buildings-message">
              {search
                ? "No buildings match your search."
                : "No buildings found. Add your first building."}
            </div>
          ) : (
            <table className="buildings-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Building</th>
                  <th>Location</th>
                  <th>Phone</th>
                  <th>Floors</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBuildings.map((building) => (
                  <tr key={building.building_id}>
                    <td>#{building.building_id}</td>

                    <td>
                      <div className="building-name">
                        <span className="building-table-icon">▤</span>

                        <strong>{building.building_name}</strong>
                      </div>
                    </td>

                    <td>{building.location}</td>

                    <td>{building.office_phone || "—"}</td>

                    <td>
                      <span className="floor-badge">
                        {building.floor ?? 1} Floors
                      </span>
                    </td>

                    <td>
                      <div className="building-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => openEditForm(building)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDelete(building)}
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
      </section>
    </div>
  );
}

export default Buildings;
