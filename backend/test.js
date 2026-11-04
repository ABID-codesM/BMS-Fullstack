.  
import { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import Buildings from "./pages/Buildings";
import Employees from "./pages/Employees";
import Tenants from "./pages/Tenants";
import Rentals from "./pages/Rentals";
import RentalServices from "./pages/RentalServices";
import TenantPayments from "./pages/TenantPayments";
import Salary from "./pages/Salary";
import Currencies from "./pages/Currencies";
import CurrencyConversions from "./pages/CurrencyConversions";
import PublicRental from "./pages/PublicRental";
import Login from "./pages/Login";

import "./App.css";
import api from "../frontend/src/api/axiosInstance";

function getCurrentUser() {
try {
return JSON.parse(sessionStorage.getItem("bmsUser") || "null");
} catch {
return null;
}
}

function ProtectedRoute() {
const token = sessionStorage.getItem("bmsToken");
const user = getCurrentUser();

if (!token || !user?.role) {
return <Navigate to="/login" replace />;
}

return <Outlet />;
}

function RoleRoute({ allowedRoles, children }) {
const user = getCurrentUser();

if (!user || !allowedRoles.includes(user.role)) {
return (
<Navigate
to={user?.role === "Building Manager" ? "/manager" : "/"}
replace
/>
);
}

return children;
}

function AdminLayout() {
const [sidebarOpen, setSidebarOpen] = useState(false);

function closeSidebar() {
setSidebarOpen(false);
}

return (
<RoleRoute allowedRoles={["Admin"]}>
<div className="app-layout">
<Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} />

    <div className="main-area">
      <Navbar
        onMenuClick={() => setSidebarOpen((previous) => !previous)}
      />

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/Employees" element={<Employees />} />
          <Route path="/Tenants" element={<Tenants />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/rental-services" element={<RentalServices />} />
          <Route path="/tenant-payments" element={<TenantPayments />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/currencies" element={<Currencies />} />
          <Route
            path="/Currency-Conversions"
            element={<CurrencyConversions />}
          />

          <Route
            path="*"
            element={
              <div className="coming-soon">
                <h2>Page Coming Soon</h2>
                <p>This section will be developed next.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  </div>
</RoleRoute>

);
}

function ManagerLayout() {
const [sidebarOpen, setSidebarOpen] = useState(false);

function closeSidebar() {
setSidebarOpen(false);
}

return (
<RoleRoute allowedRoles={["Building Manager"]}>
<div className="app-layout">
<Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} />

    <div className="main-area">
      <Navbar
        onMenuClick={() => setSidebarOpen((previous) => !previous)}
      />

      <main className="page-content">
        <Routes>
          <Route path="/" element={<ManagerDashboard />} />
          <Route
            path="*"
            element={<Navigate to="/manager" replace />}
          />
        </Routes>
      </main>
    </div>
  </div>
</RoleRoute>

);
}

function App() {
return (
<Routes>
<Route path="/public-rentals" element={<PublicRental />} />
<Route path="/login" element={<Login />} />

  <Route element={<ProtectedRoute />}>
    <Route path="/manager/*" element={<ManagerLayout />} />
    <Route path="/*" element={<AdminLayout />} />
  </Route>
</Routes>

);
}

export default app