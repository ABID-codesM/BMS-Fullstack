import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./ManagerRentalServices.css";

function ManagerRentalServices() {
  const [services, setServices] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    description: "",
    floor: "",
    status: "",
    rent: "",
  });
  // jest fro rent
  const [canChangeRent, setCanChangeRent] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get("/manager/my-permissions");
      setCanChangeRent(response.data.permissions?.change_rent == true);
    } catch (err) {
      console.error("Permission loading error:", err);
      setCanChangeRent(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const response = await axiosInstance.get("/manager/buildings");
      setBuildings(response.data.buildings || []);
    } catch (err) {
      console.error("Buildings loading error:", err);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (buildingFilter) {
        params.building_id = buildingFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await axiosInstance.get("/manager/rental-services", {
        params,
      });

      setServices(response.data.rental_services || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load rental services.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
    fetchPermissions();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [buildingFilter, statusFilter]);

  const openEditModal = (service) => {
    setEditingService(service);

    setFormData({
      description: service.description || "",
      floor: service.floor ?? "",
      status: service.status || "Available",
      rent: service.rent ?? "",
    });

    setError("");
    setSuccess("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");

      const updateData = {
        //description: formData.description,
        floor: Number(formData.floor),
        status: formData.status,
      };
      // description  یوازی هغه وخت  updage  کیږی چی  بدل شوی وی
      if (formData.description !== (editingService.description || "")) {
        updateData.description = formData.description;
      }

      if (canChangeRent) {
        const rent = Number(formData.rent);

        if (!Number.isFinite(rent) || rent < 0) {
          setError("Please enter a valid rental amount.");
          return;
        }

        updateData.rent = rent;
      }

      await axiosInstance.patch(
        `/manager/rental-services/${editingService.rental_services_id}`,
        updateData,
      );

      setSuccess("Rental Service updated successfully.");
      setEditingService(null);

      await fetchServices();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update Rental Service.",
      );
    }
  };

  const filteredServices = services.filter((service) => {
    const searchText = search.toLowerCase();

    return (
      String(service.services_no || "")
        .toLowerCase()
        .includes(searchText) ||
      String(service.description || "")
        .toLowerCase()
        .includes(searchText) ||
      String(service.building_name || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "Available":
        return "mrs-available";
      case "Occupied":
        return "mrs-occupied";
      case "Maintenance":
        return "mrs-maintenance";
      default:
        return "";
    }
  };

  return (
    <div className="mrs-page">
      <div className="mrs-header">
        <div>
          <h2>Rental Services</h2>
          <p>Manage rental services in your assigned buildings.</p>
        </div>

        <div className="mrs-total">
          <span>Total Services</span>
          <strong>{services.length}</strong>
        </div>
      </div>

      {error && <div className="mrs-alert mrs-error">{error}</div>}

      {success && <div className="mrs-alert mrs-success">{success}</div>}

      <div className="mrs-filters">
        <input
          type="text"
          placeholder="Search service, building..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
        >
          <option value="">All Buildings</option>

          {buildings.map((building) => (
            <option key={building.building_id} value={building.building_id}>
              {building.building_name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
          <option value="Maintenance">Maintenance</option>
        </select>
      </div>

      {loading ? (
        <div className="mrs-message">Loading Rental Services...</div>
      ) : filteredServices.length === 0 ? (
        <div className="mrs-message">No Rental Services found.</div>
      ) : (
        <div className="mrs-table-wrapper">
          <table className="mrs-table">
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

                  <td>{service.services_no}</td>

                  <td>{service.building_name}</td>

                  <td>{service.description || "-"}</td>

                  <td>{service.floor ?? "-"}</td>

                  <td>{Number(service.rent || 0).toLocaleString()}</td>

                  <td>
                    <span
                      className={`mrs-status ${getStatusClass(service.status)}`}
                    >
                      {service.status}
                    </span>
                  </td>

                  <td>
                    <div className="mrs-actions">
                      <button
                        className="mrs-view-btn"
                        onClick={() => setSelectedService(service)}
                      >
                        View
                      </button>

                      <button
                        className="mrs-edit-btn"
                        onClick={() => openEditModal(service)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Service Details Modal */}

      {selectedService && (
        <div
          className="mrs-modal-overlay"
          onClick={() => setSelectedService(null)}
        >
          <div className="mrs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mrs-modal-header">
              <h3>Rental Service Details</h3>

              <button onClick={() => setSelectedService(null)}>×</button>
            </div>

            <div className="mrs-details">
              <p>
                <strong>Service Number:</strong>
                {selectedService.services_no}
              </p>

              <p>
                <strong>Building:</strong>
                {selectedService.building_name}
              </p>

              <p>
                <strong>Description:</strong>
                {selectedService.description || "-"}
              </p>

              <p>
                <strong>Floor:</strong>
                {selectedService.floor ?? "-"}
              </p>

              <p>
                <strong>Monthly Rent:</strong>
                {Number(selectedService.rent || 0).toLocaleString()}
              </p>

              <p>
                <strong>Status:</strong>
                {selectedService.status}
              </p>
            </div>

            <button
              className="mrs-close-btn"
              onClick={() => setSelectedService(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}

      {editingService && (
        <div className="mrs-modal-overlay">
          <div className="mrs-modal">
            <div className="mrs-modal-header">
              <h3>Edit Rental Service</h3>

              <button onClick={() => setEditingService(null)}>×</button>
            </div>

            <form onSubmit={handleUpdate}>
              <label>Description</label>

              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                // required
              />

              <label>Floor</label>

              <input
                type="number"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                min="0"
                required
              />

              {canChangeRent && (
                <>
                  <label>Monthly Rent</label>

                  <input
                    type="number"
                    name="rent"
                    value={formData.rent}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </>
              )}

              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>

              <div className="mrs-form-actions">
                <button
                  type="button"
                  className="mrs-cancel-btn"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </button>

                <button type="submit" className="mrs-save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerRentalServices;
