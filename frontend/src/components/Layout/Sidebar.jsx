import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  LogOut,
  CalendarDays,
  Clock,
  FileText,
  FolderOpen,
  User,
} from "lucide-react";
import "./Sidebar.css";
const Sidebar = () => {
  const { user, logout } = useAuth();

  const employeeMenu = [
    { path: "/employee", label: "Dashboard", icon: LayoutDashboard },
    { path: "/employee/leave/apply", label: "Apply Leave", icon: CalendarDays },
    { path: "/employee/leave/history", label: "Leave History", icon: FileText },
    { path: "/employee/attendance", label: "Attendance", icon: Clock },
    { path: "/employee/documents", label: "Documents", icon: FolderOpen },
    { path: "/employee/profile", label: "Profile", icon: User },
  ];

  const managerMenu = [
    { path: "/manager", label: "Dashboard", icon: LayoutDashboard },
    { path: "/manager/team-leaves", label: "Team Leaves", icon: CalendarDays },
    {
      path: "/manager/team-documents",
      label: "Team Documents",
      icon: FolderOpen,
    },
    { path: "/manager/reports", label: "Reports", icon: FileText },
  ];

  const adminMenu = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/employees", label: "Employees", icon: User },
    { path: "/admin/departments", label: "Departments", icon: FileText },
    { path: "/admin/settings", label: "Settings", icon: FolderOpen },
  ];

  let menuItems = [];

  if (user.role === "employee") menuItems = employeeMenu;
  if (user.role === "manager") menuItems = managerMenu;
  if (user.role === "admin") menuItems = adminMenu;
  if (!user) {
    return (
      <div
        style={{
          width: "280px",
          backgroundColor: "#ffffff",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">HRMS</h2>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={
                item.path === "/employee" ||
                item.path === "/manager" ||
                item.path === "/admin"
              }
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-name">{user.name || "User"}</div>

          <div className="user-role">{user.role || "employee"}</div>
        </div>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
