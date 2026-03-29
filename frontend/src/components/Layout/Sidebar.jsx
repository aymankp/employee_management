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
  Users,
  BarChart3,
  Settings,
  Briefcase,
} from "lucide-react";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();

  // Function to get menu items based on role
  const getMenuItems = () => {
    const role = user?.role;
    
    // Base items that everyone has
    const baseItems = [
      { path: `/${role}`, label: "Dashboard", icon: LayoutDashboard },
      { path: `/${role}/profile`, label: "My Profile", icon: User },
    ];

    // Role-specific items
    const roleSpecificItems = {
      employee: [
        { path: "/employee/leave/apply", label: "Apply Leave", icon: CalendarDays },
        { path: "/employee/leave/history", label: "Leave History", icon: FileText },
        { path: "/employee/attendance", label: "Attendance", icon: Clock },
        { path: "/employee/documents", label: "Documents", icon: FolderOpen },
      ],
      manager: [
        { path: "/manager/team-leaves", label: "Team Leaves", icon: CalendarDays },
        { path: "/manager/team-documents", label: "Team Documents", icon: FolderOpen },
        { path: "/manager/reports", label: "Reports", icon: BarChart3 },
      ],
      admin: [
        { path: "/admin/employees", label: "Employees", icon: Users },
        { path: "/admin/departments", label: "Departments", icon: Briefcase },
        { path: "/admin/all-leaves", label: "All Leaves", icon: CalendarDays },
        { path: "/admin/all-documents", label: "All Documents", icon: FolderOpen },
         { path: "/admin/attendance", label: "Attendance", icon: Clock },
        { path: "/admin/settings", label: "Settings", icon: Settings },
      ]
    };

    // Combine base items with role-specific items
    return [...baseItems, ...(roleSpecificItems[role] || [])];
  };

  if (!user) {
    return (
      <div className="sidebar-loading">
        Loading...
      </div>
    );
  }

  const menuItems = getMenuItems();

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
              end={item.path === `/${user.role}`}
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