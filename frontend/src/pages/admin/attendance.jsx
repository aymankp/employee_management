import { useEffect, useState } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import "./attendance.css";

export default function AdminAttendance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    halfDay: 0,
    attendanceRate: 0,
    onTime: 0,
    late: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/attendance/team");
      setData(res.data.data || []);

      const total = res.data.total || 0;

      const halfDay =
        res.data.data?.filter((emp) => emp.attendance?.status === "half-day")
          .length || 0;

      const present =
        res.data.data?.filter(
          (emp) =>
            emp.attendance?.status === "present" ||
            emp.attendance?.status === "half-day",
        ).length || 0;

      const absent = total - present;

      setStats({
        total,
        present,
        absent,
        halfDay,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        onTime: res.data.onTime || 0,
        late: res.data.late || 0,
      });

      // Extract unique departments
      const depts = [
        ...new Set(
          res.data.data
            ?.map((emp) => emp.employee?.employmentDetails?.department)
            .filter(Boolean),
        ),
      ];
      setDepartments(depts);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const filteredData = data.filter((emp) => {
    const matchesSearch =
      emp.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (emp.attendance ? emp.attendance.status : "absent") === filterStatus;
    const matchesDept =
      filterDepartment === "all" ||
      emp.employee?.employmentDetails?.department === filterDepartment;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case "name":
        aVal = a.employee?.name || "";
        bVal = b.employee?.name || "";
        break;
      case "checkIn":
        aVal = a.attendance?.checkIn
          ? new Date(a.attendance.checkIn).getTime()
          : 0;
        bVal = b.attendance?.checkIn
          ? new Date(b.attendance.checkIn).getTime()
          : 0;
        break;
      case "workHours":
        aVal = a.attendance?.workHours || 0;
        bVal = b.attendance?.workHours || 0;
        break;
      case "status":
        aVal = a.attendance ? a.attendance.status : "absent";
        bVal = b.attendance ? b.attendance.status : "absent";
        break;
      default:
        aVal = a.employee?.name || "";
        bVal = b.employee?.name || "";
    }

    if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const getStatusBadge = (status, checkIn) => {
    switch (status) {
      case "present":
        return (
          <span className="status-badge present">
            <CheckCircle size={12} /> Present
          </span>
        );
      case "absent":
        return (
          <span className="status-badge absent">
            <XCircle size={12} /> Absent
          </span>
        );
      case "half-day":
        return (
          <span className="status-badge half-day">
            <Clock size={12} /> Half Day
          </span>
        );
      default:
        return <span className="status-badge unknown">Unknown</span>;
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleExport = () => {
    // Export to CSV
    const headers = [
      "Employee",
      "Email",
      "Check In",
      "Check Out",
      "Work Hours",
      "Status",
    ];
    const rows = sortedData.map((emp) => [
      emp.employee?.name,
      emp.employee?.email,
      formatTime(emp.attendance?.checkIn),
      formatTime(emp.attendance?.checkOut),
      emp.attendance?.workHours || 0,
      emp.attendance ? emp.attendance.status : "absent",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="admin-attendance loading">
        <div className="spinner"></div>
        <p>Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="admin-attendance">
      {/* Header */}
      <div className="attendance-header">
        <div>
          <h1 className="page-title">Attendance Overview</h1>
          <p className="page-subtitle">
            Track and manage employee attendance across departments
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Date Display */}
      <div className="date-badge">
        <Calendar size={16} />
        <span>{formatDate()}</span>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-trend">Active today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon present">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Present</span>
            <span className="stat-value">{stats.present}</span>
            <span className="stat-trend">
              {stats.attendanceRate}% attendance
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon absent">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Absent</span>
            <span className="stat-value">{stats.absent}</span>
            <span className="stat-trend">Need follow-up</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon half-day">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Half Day</span>
            <span className="stat-value">{stats.halfDay}</span>
            <span className="stat-trend">Partial attendance</span>
          </div>
        </div>
      </div>

      {/* Punctuality Stats */}
      <div className="punctuality-section">
        <div className="punctuality-card">
          <div className="punctuality-header">
            <TrendingUp size={18} />
            <span>Attendance Insights</span>
          </div>
          <div className="punctuality-stats">
            <div className="punctuality-item">
              <span className="label">On Time</span>
              <span className="value">{stats.onTime}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill on-time"
                  style={{
                    width:
                      stats.present > 0
                        ? `${(stats.onTime / stats.present) * 100}%`
                        : "0%",
                  }}
                ></div>
              </div>
            </div>
            <div className="punctuality-item">
              <span className="label">Late Arrival</span>
              <span className="value">{stats.late}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill late"
                  style={{
                    width:
                      stats.present > 0
                        ? `${(stats.late / stats.present) * 100}%`
                        : "0%",
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <Filter size={16} />
          <h3>Filters</h3>
        </div>
        <div className="filters-grid">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half-day">Half Day</option>
          </select>

          <select
            className="filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>
                Employee {getSortIcon("name")}
              </th>
              <th onClick={() => handleSort("checkIn")}>
                Check In {getSortIcon("checkIn")}
              </th>
              <th>Check Out</th>
              <th onClick={() => handleSort("workHours")}>
                Work Hours {getSortIcon("workHours")}
              </th>
              <th onClick={() => handleSort("status")}>
                Status {getSortIcon("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  <AlertCircle size={32} />
                  <p>No attendance records found</p>
                </td>
              </tr>
            ) : (
              sortedData.map((emp, index) => (
                <tr key={emp.employee?._id || index}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {emp.employee?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="employee-name">
                          {emp.employee?.name}
                        </div>
                        <div className="employee-email">
                          {emp.employee?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatTime(emp.attendance?.checkIn)}</td>
                  <td>{formatTime(emp.attendance?.checkOut)}</td>
                  <td>
                    <span className="hours-badge">
                      {emp.attendance?.workHours?.toFixed(1) || 0}h
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(
                      emp.attendance ? emp.attendance.status : "absent",
                      emp.attendance?.checkIn,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="table-footer">
        <div className="footer-info">
          Showing {sortedData.length} of {data.length} employees
        </div>
        <div className="footer-stats">
          <span className="stat-dot present-dot"></span>
          <span>Present: {stats.present}</span>
          <span className="stat-dot absent-dot"></span>
          <span>Absent: {stats.absent}</span>
          <span className="stat-dot half-dot"></span>
          <span>Half Day: {stats.halfDay}</span>
        </div>
      </div>
    </div>
  );
}
