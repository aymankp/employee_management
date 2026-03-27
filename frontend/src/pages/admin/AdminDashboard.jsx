import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Calendar,
  LogOut,
  Shield,
  UserCheck,
  UserCog,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  TrendingUp,
  Building2,
  Filter,
  Search,
  Activity,
  FileText,
  Briefcase,
  Loader,
  Eye,
} from "lucide-react";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    role: "all",
    team: "all",
    search: "",
  });
  const [users, setUsers] = useState([]);

  // ========== FETCH DASHBOARD DATA ==========
  const fetchDashboardData = async () => {
  setLoading(true);
  setError(null);

  try {
    const [usersRes, leavesRes, attendanceRes, docsRes, deptsRes, perfRes] =
      await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/leaves"),
        api.get("/attendance/today-summary"),
        api.get("/documents/pending"),
        api.get("/departments"),
        api.get("/performance/status/pending"),
      ]);

    const employees = usersRes.data || [];
    const leaves = leavesRes.data || [];
    const attendance = attendanceRes.data || { present: 0, absent: 0 };
    const documents = docsRes.data || { pending: 0 };

    const departments = Array.isArray(deptsRes.data)
      ? deptsRes.data
      : deptsRes.data?.departments || [];

    const performance = perfRes.data || { pending: 0 };

    setUsers(employees);

    setData({
      employees: {
        total: employees.length,
        active: employees.filter((e) => e.isActive !== false).length,
        admins: employees.filter((e) => e.role === "admin").length,
        managers: employees.filter((e) => e.role === "manager").length,
        employees: employees.filter((e) => e.role === "employee").length,
      },
      leaves: {
        total: leaves.length,
        pending: leaves.filter((l) => l.status === "pending").length,
        approved: leaves.filter((l) => l.status === "approved").length,
        rejected: leaves.filter((l) => l.status === "rejected").length,
      },
      attendance: {
        present: attendance.present || 0,
        absent: attendance.absent || 0,
        total: (attendance.present || 0) + (attendance.absent || 0),
      },
      documents: {
        pending: documents.pending || 0,
      },
      departments: {
        total: departments.length,
        active: departments.filter((d) => d.status === "active").length,
      },
      performance: {
        pending: performance.pending || 0,
      },
    });

  } catch (err) {
    console.error("REAL ERROR:", err.response?.data || err.message);
    setError("Failed to load dashboard data");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ========== HANDLERS ==========
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/user/${userId}/role`, { role: newRole });
      fetchDashboardData();
      // Show success message (you can add a toast notification here)
      alert("✅ Role updated successfully");
    } catch (error) {
      alert("Failed to update role");
    }
  };

  const handleViewEmployee = (id) => {
    console.log("CLICKED ID:", id); // debug
    navigate(`/admin/employees/${id}`);
  };

  // ========== FILTERS ==========
  const getFilteredUsers = () => {
    return users.filter((user) => {
      if (filters.role !== "all" && user.role !== filters.role) return false;
      if (filters.team !== "all" && user.team !== filters.team) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  };

  const teams = [...new Set(users.map((u) => u.team).filter(Boolean))];

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="loading-container">
        <Loader size={40} className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-container">
        <AlertCircle size={48} />
        <h3>Error Loading Dashboard</h3>
        <p>{error || "Unknown error occurred"}</p>
        <button className="btn btn-primary" onClick={fetchDashboardData}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name} • System Overview
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchDashboardData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="btn btn-outline"
            onClick={() => window.open("/api/admin/export", "_blank")}
          >
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{data.employees.total}</span>
            <div className="stat-details">
              <span className="stat-detail">
                <Shield size={12} /> {data.employees.admins} Admin
              </span>
              <span className="stat-detail">
                <UserCog size={12} /> {data.employees.managers} Manager
              </span>
              <span className="stat-detail">
                <UserCheck size={12} /> {data.employees.employees} Employee
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Employees</span>
            <span className="stat-value">{data.employees.active}</span>
            <div className="stat-progress">
              <div
                className="progress-bar"
                style={{
                  width: `${(data.employees.active / data.employees.total) * 100}%`,
                }}
              ></div>
            </div>
            <span className="stat-percent">
              {Math.round((data.employees.active / data.employees.total) * 100)}
              % active
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon leaves">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Leave Statistics</span>
            <span className="stat-value">{data.leaves.total}</span>
            <div className="stat-tags">
              <span className="tag tag-success">
                {data.leaves.approved} Approved
              </span>
              <span className="tag tag-warning">
                {data.leaves.pending} Pending
              </span>
              <span className="tag tag-danger">
                {data.leaves.rejected} Rejected
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon departments">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Organization</span>
            <span className="stat-value">{data.departments.total}</span>
            <div className="stat-tags">
              <span className="tag tag-info">
                {data.departments.active} Active Depts
              </span>
              <span className="tag tag-primary">{teams.length} Teams</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="stats-grid secondary">
        <div className="stat-card small">
          <div className="stat-icon attendance">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Attendance</span>
            <div className="stat-row">
              <span className="stat-value small">
                {data.attendance.present}
              </span>
              <span className="stat-detail">Present</span>
            </div>
            <div className="stat-row">
              <span className="stat-value small">{data.attendance.absent}</span>
              <span className="stat-detail">Absent</span>
            </div>
          </div>
        </div>

        <div className="stat-card small">
          <div className="stat-icon docs">
            <FileText size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Documents</span>
            <span className="stat-value">{data.documents.pending}</span>
            <span className="stat-detail">Pending Verification</span>
          </div>
        </div>

        <div className="stat-card small">
          <div className="stat-icon performance">
            <Briefcase size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Performance</span>
            <span className="stat-value">{data.performance.pending}</span>
            <span className="stat-detail">Pending Reviews</span>
          </div>
        </div>

        <div className="stat-card small">
          <div className="stat-icon trend">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Approval Rate</span>
            <span className="stat-value">
              {data.leaves.total > 0
                ? Math.round((data.leaves.approved / data.leaves.total) * 100)
                : 0}
              %
            </span>
            <span className="stat-detail">Leave approvals</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <Filter size={16} />
          <h3>Quick User Filter</h3>
        </div>
        <div className="filters-grid">
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>

          <select
            value={filters.team}
            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Teams</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>User Overview</h3>
          <span className="user-count">{getFilteredUsers().length} users</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredUsers()
                .slice(0, 10)
                .map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{u.name}</span>
                          <span className="user-id">
                            ID: {u.employeeId || "N/A"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === "admin" && <Shield size={12} />}
                        {u.role === "manager" && <UserCog size={12} />}
                        {u.role === "employee" && <UserCheck size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="team-badge">{u.team || "—"}</span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${u.isActive ? "active" : "inactive"}`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => handleViewEmployee(u._id)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {u.role !== "admin" && (
                          <select
                            className="role-select"
                            value={u.role}
                            onChange={(e) =>
                              handleUpdateRole(u._id, e.target.value)
                            }
                            title="Change Role"
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {getFilteredUsers().length > 10 && (
            <div className="table-footer">
              <button
                className="btn btn-link"
                onClick={() => navigate("/admin/employees")}
              >
                View all {getFilteredUsers().length} users →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
