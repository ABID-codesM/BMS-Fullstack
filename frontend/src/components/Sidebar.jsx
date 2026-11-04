// import { NavLink } from "react-router-dom";
// import "./Sidebar.css";

// const menuItems = [
//   {
//     title: "Dashboard",
//     path: "/",
//     icon: "▦",
//   },
//   {
//     title: "Buildings",
//     path: "/buildings",
//     icon: "▤",
//   },
//   {
//     title: "Employees",
//     path: "/employees",
//     icon: "♙",
//   },
//   {
//     title: "Tenants",
//     path: "/tenants",
//     icon: "♧",
//   },
//   {
//     title: "Rental Services",
//     path: "/rental-services",
//     icon: "⌂",
//   },
//   {
//     title: "Rentals",
//     path: "/rentals",
//     icon: "▣",
//   },
//   {
//     title: "Payments",
//     path: "/tenant-payments",
//     icon: "$",
//   },
//   {
//     title: "Salary",
//     path: "/salary",
//     icon: "≡",
//   },
//   {
//     title: "Currencies",
//     path: "/currencies",
//     icon: "◎",
//   },
//   {
//     title: "Currency Conversion",
//     path: "/currency-conversions",
//     icon: "⇄",
//   },
// ];

// function Sidebar({ isOpen, closeSidebar }) {
//   return (
//     <>
//       {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

//       <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
//         <div className="sidebar-brand">
//           <div className="brand-logo">B</div>

//           <div className="brand-text">
//             {/* <h2>BuildWise</h2> */}
//             <h2>Buildings</h2>
//             <span>Management System</span>
//           </div>
//         </div>

//         <div className="sidebar-section-title">MAIN MENU</div>

//         <nav className="sidebar-menu">
//           {menuItems.map((item) => (
//             <NavLink
//               key={item.path}
//               to={item.path}
//               end={item.path === "/"}
//               className={({ isActive }) =>
//                 `sidebar-link ${isActive ? "active" : ""}`
//               }
//               onClick={closeSidebar}
//             >
//               <span className="sidebar-icon">{item.icon}</span>

//               <span>{item.title}</span>
//             </NavLink>
//           ))}
//         </nav>

//         <div className="sidebar-footer">
//           <div className="sidebar-footer-icon">⚙</div>

//           <div>
//             <strong>System Admin</strong>
//             <span>Management Panel</span>
//           </div>
//         </div>
//       </aside>
//     </>
//   );
// }

// export default Sidebar;

import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar({ isOpen, closeSidebar }) {
  const navigate = useNavigate();

  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("bmsUser") || "null");
  } catch {
    user = null;
  }

  const isManager = user?.role === "Building Manager";

  const adminMenuItems = [
    { title: "Dashboard", path: "/", icon: "▦" },
    { title: "Buildings", path: "/buildings", icon: "🏢" },
    { title: "Employees", path: "/Employees", icon: "👥" },
    { title: "Tenants", path: "/Tenants", icon: "👤" },

    { title: "Rental Services", path: "/rental-services", icon: "🏠" },
    { title: "Rentals", path: "/rentals", icon: "📄" },
    { title: "Tenant Payments", path: "/tenant-payments", icon: "💳" },
    { title: "Salary", path: "/salary", icon: "💰" },
    { title: "Currencies", path: "/currencies", icon: "💱" },
    {
      title: "Currency Conversion",
      path: "/Currency-Conversions",
      icon: "⇄",
    },
    { title: "Manager Management", path: "/manager-management", icon: "👥" },

    { title: "Manager Permissions", path: "/manager-permissions", icon: "👥" },
    { title: "Managers", path: "/managers", icon: "👥" },
  ];

  const managerMenuItems = [
    { title: "Dashboard", path: "/manager", icon: "▦" },
    { title: "My Buildings", path: "/manager/buildings", icon: "🏢" },
    {
      title: "Rental Services",
      path: "/manager/rental-services",
      icon: "🏠",
    },
    {
      title: "Rental Requests",
      path: "/manager/rental-requests",
      icon: "📨",
    },
    { title: "Tenants", path: "/manager/tenants", icon: "👤" },
    { title: "Rentals / Contracts", path: "/manager/rentals", icon: "📄" },
    {
      title: "Rental Payments",
      path: "/manager/rental-payments",
      icon: "💳",
    },
    { title: "Reports", path: "/manager/reports", icon: "📊" },
  ];

  const menuItems = isManager ? managerMenuItems : adminMenuItems;

  function handleLogout() {
    sessionStorage.removeItem("bmsToken");
    sessionStorage.removeItem("bmsUser");
    closeSidebar();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">B</div>

          <div className="brand-text">
            <h2>Buildings</h2>
            <span>Management System</span>
          </div>
        </div>

        <div className="sidebar-section-title">
          {isManager ? "MANAGER MENU" : "ADMIN MENU"}
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/" || item.path === "/manager"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={closeSidebar}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-icon">↪</span>
          <span>Logout</span>
        </button>

        <div className="sidebar-footer">
          <div className="sidebar-footer-icon">⚙</div>

          <div>
            <strong>
              {user?.full_name ||
                (isManager ? "Building Manager" : "System Admin")}
            </strong>
            <span>{user?.role || "Management Panel"}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
