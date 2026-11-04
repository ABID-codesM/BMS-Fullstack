import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./ManagerDashboard.css";

const initialStats = [
  { key: "total_buildings", title: "My Buildings" },
  { key: "total_services", title: "Total Rental Services" },
  { key: "available_services", title: "Available Services" },
  { key: "occupied_services", title: "Occupied Services" },
  { key: "pending_requests", title: "Pending Requests" },
  { key: "active_rentals", title: "Active Rentals" },
  { key: "pending_payments", title: "Pending Payments" },
  { key: "total_collected", title: "Total Collected" },
];

export default function ManagerDashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      try {
        const response = await axiosInstance.get("/manager/dashboard");

        if (active) {
          setStats(response.data.dashboard);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load dashboard information.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboard();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="manager-dashboard">
      <div className="manager-dashboard-header">
        <div>
          <h1>Manager Dashboard</h1>
          <p>Overview of your assigned buildings and activities.</p>
        </div>
      </div>

      {loading && <p>Loading dashboard...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <div className="manager-stats-grid">
          {initialStats.map((item) => {
            const value = stats[item.key] ?? 0;

            return (
              <article className="manager-stat-card" key={item.key}>
                <h3>{item.title}</h3>
                <p>
                  {item.key === "total_collected"
                    ? Number(value).toLocaleString()
                    : value}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
