import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const pageTitles = {
  "/": "Dashboard",
  "/buildings": "Buildings",
  "/Employees": "Employees",
  "/Tenants": "Tenants",
  "/rental-services": "Rental Services",
  "/rentals": "Rentals",
  "/tenant-payments": "Tenant Payments",
  "/salary": "Salary Management",
  "/currencies": "Currencies",
  "/Currency-Conversions": "Currency Conversion",

  "/manager": "Manager Dashboard",
  "/manager/buildings": "My Buildings",
  "/manager/rental-services": "Rental Services",
  "/manager/rental-requests": "Rental Requests",
  "/manager/tenants": "Tenants",
  "/manager/rentals": "Rentals / Contracts",
  "/manager/rental-payments": "Rental Payments",
  "/manager/reports": "Reports",
};

// const pageTitles = {
//   "/": "Dashboard",
//   "/buildings": "Buildings",
//   "/employees": "Employees",
//   "/tenants": "Tenants",
//   "/rental-services": "Rental Services",
//   "/rentals": "Rentals",
//   "/tenant-payments": "Tenant Payments",
//   "/salary": "Salary Management",
//   "/currencies": "Currencies",
//   "/currency-conversions": "Currency Conversion",
// };

function Navbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = pageTitles[location.pathname] || "Management System";

  let currentUser = null;

  try {
    currentUser = JSON.parse(sessionStorage.getItem("bmsUser") || "null");
  } catch {
    currentUser = null;
  }

  const isManager = currentUser?.role === "Building Manager";

  const displayName =
    currentUser?.full_name ||
    (isManager ? "Building Manager" : "Administrator");

  function handleLogout() {
    sessionStorage.removeItem("bmsToken");
    sessionStorage.removeItem("bmsUser");

    navigate("/login", { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          ≡
        </button>

        <div>
          <h1>{pageTitle}</h1>
          <p>Welcome back! Here's your overview.</p>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-date">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>

        {/* <div className="navbar-admin" title={adminName}>
          <div className="navbar-avatar" aria-hidden="true">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <span className="navbar-admin-name">{adminName}</span>
        </div> */}
        <div className="navbar-admin" title={displayName}>
          <div className="navbar-avatar" aria-hidden="true">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="navbar-admin-name">{displayName}</span>
        </div>

        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
