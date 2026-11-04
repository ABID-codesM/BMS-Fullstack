import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import { Link } from "react-router-dom";

import "./Dashboard.css";

//const API_URL = "http://localhost:5000/api/buildings";

function Dashboard() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBuildings() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/buildings");
        console.log(response);
        // const response = await fetch(API_URL);

        // if (!response.ok) {
        //   throw new Error("Failed to load buildings.");
        // }
        const data = response.data;
        //const data = await response.json();

        setBuildings(
          Array.isArray(data)
            ? data
            : Array.isArray(data.buildings)
              ? data.buildings
              : [],
        );
      } catch (err) {
        setError(
          "Could not connect to the backend. Make sure the server is running.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBuildings();
  }, []);

  const totalFloors = buildings.reduce(
    (total, building) => total + (Number(building.floor) || 0),
    0,
  );

  const stats = [
    {
      title: "Total Buildings",
      value: loading ? "..." : buildings.length,
      icon: "▤",
      color: "blue",
      description: "Registered buildings",
    },
    {
      title: "Total Floors",
      value: loading ? "..." : totalFloors,
      icon: "▥",
      color: "purple",
      description: "Across all buildings",
    },
    {
      title: "API Status",
      value: loading ? "Checking" : error ? "Offline" : "Online",
      icon: "↗",
      color: error ? "red" : "green",
      description: "Backend connection",
    },
    {
      title: "System Modules",
      value: 10,
      icon: "▦",
      color: "orange",
      description: "Planned management sections",
    },
  ];

  return (
    <div className="dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="welcome-label">OVERVIEW</span>

          <h2>Building Management Dashboard</h2>

          <p>Manage your buildings and monitor your system from one place.</p>
        </div>

        <Link to="/buildings" className="primary-button">
          + Manage Buildings
        </Link>
      </section>

      {error && (
        <div className="dashboard-error" role="alert">
          {error}
        </div>
      )}

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.title}>
            <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>

            <div className="stat-content">
              <p>{stat.title}</p>
              <h3>{stat.value}</h3>
              <span>{stat.description}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Recent Buildings</h2>
            <p>Buildings currently registered in the system.</p>
          </div>

          <Link to="/buildings" className="text-link">
            View all →
          </Link>
        </div>

        <div className="dashboard-table-wrapper">
          {loading ? (
            <div className="dashboard-message">Loading buildings...</div>
          ) : buildings.length === 0 ? (
            <div className="dashboard-message">
              No buildings found. Add your first building.
            </div>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Building Name</th>
                  <th>Location</th>
                  <th>Floors</th>
                </tr>
              </thead>

              <tbody>
                {buildings.slice(0, 5).map((building) => (
                  <tr key={building.building_id}>
                    <td>#{building.building_id}</td>

                    <td className="building-name-cell">
                      {building.building_name}
                    </td>

                    <td>{building.location}</td>

                    <td>{building.floor ?? 1}</td>
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

export default Dashboard;
