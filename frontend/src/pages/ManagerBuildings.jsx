import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./ManagerBuildings.css";

function ManagerBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchBuildings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get("/manager/buildings");

        if (active) {
          setBuildings(response.data.buildings || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Failed to load assigned buildings.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchBuildings();

    return () => {
      active = false;
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="manager-buildings-page">
      <div className="manager-buildings-header">
        <div>
          <h1>My Buildings</h1>
          <p>View the buildings assigned to your account.</p>
        </div>

        <div className="buildings-count">
          <span>Total Buildings</span>
          <strong>{buildings.length}</strong>
        </div>
      </div>

      {loading ? (
        <div className="buildings-state">
          <div className="buildings-loader"></div>
          <p>Loading your buildings...</p>
        </div>
      ) : error ? (
        <div className="buildings-error">
          <strong>Unable to load buildings</strong>
          <p>{error}</p>
        </div>
      ) : buildings.length === 0 ? (
        <div className="buildings-empty">
          <div className="empty-icon">🏢</div>
          <h3>No Buildings Assigned</h3>
          <p>
            No buildings have been assigned to your account yet. Please contact
            the system administrator.
          </p>
        </div>
      ) : (
        <div className="manager-buildings-grid">
          {buildings.map((building) => (
            <div className="manager-building-card" key={building.building_id}>
              <div className="building-card-top">
                <div className="building-card-icon">🏢</div>

                <span className="building-status">Assigned</span>
              </div>

              <h2>{building.building_name}</h2>

              <div className="building-details">
                <div className="building-detail">
                  <span className="detail-icon">📍</span>
                  <div>
                    <small>Location</small>
                    <strong>{building.location || "Not provided"}</strong>
                  </div>
                </div>

                <div className="building-detail">
                  <span className="detail-icon">📞</span>
                  <div>
                    <small>Office Phone</small>
                    <strong>{building.office_phone || "Not provided"}</strong>
                  </div>
                </div>

                <div className="building-detail">
                  <span className="detail-icon">🏬</span>
                  <div>
                    <small>Total Floors</small>
                    <strong>{building.floor ?? "Not provided"}</strong>
                  </div>
                </div>

                <div className="building-detail">
                  <span className="detail-icon">📅</span>
                  <div>
                    <small>Assigned Date</small>
                    <strong>{formatDate(building.assigned_at)}</strong>
                  </div>
                </div>
              </div>

              {building.note && (
                <div className="building-note">
                  <small>Additional Notes</small>
                  <p>{building.note}</p>
                </div>
              )}

              <div className="building-card-footer">
                <span>Building ID</span>
                <strong>#{building.building_id}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerBuildings;
