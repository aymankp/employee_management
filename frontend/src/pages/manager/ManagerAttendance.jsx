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
  Briefcase
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./ManagerAttendance.css";

export default function ManagerAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [teamInfo, setTeamInfo] = useState({
    teamName: "",
    memberCount: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    halfDay: 0,
    attendanceRate: 0,
    onTime: 0,
    late: 0
  });

  useEffect(() => {
    fetchTeamAttendance();
  }, []);

  const fetchTeamAttendance = async () => {
    setLoading(true);
    try {
      // Get team attendance data (only manager's team)
      const res = await api.get("/attendance/team");
      
      // Handle different response structures
      const attendanceData = res.data?.data || res.data || [];
      const totalCount = res.data?.total || attendanceData.length;
      const presentCount = res.data?.present || 0;
      const absentCount = res.data?.absent || 0;
      const halfDayCount = res.data?.halfDay || 0;
      const onTimeCount = res.data?.onTime || 0;
      const lateCount = res.data?.late || 0;
      
      setData(attendanceData);
      
      setTeamInfo({
        teamName: user?.team || "Your Team",
        memberCount: totalCount
      });
      
      setStats({
        total: totalCount,
        present: presentCount,
        absent: absentCount,
        halfDay: halfDayCount,
        attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0,
        onTime: onTimeCount,
        late: lateCount
      });
      
    } catch (error) {
      console.error("Error fetching team attendance:", error);
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
    return sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const filteredData = data.filter(emp => {
    const employee = emp.employee || emp;
    const matchesSearch = employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          employee?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const attendance = emp.attendance || emp;
    const matchesStatus = filterStatus === "all" || attendance?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const empA = a.employee || a;
    const empB = b.employee || b;
    const attA = a.attendance || a;
    const attB = b.attendance || b;
    
    let aVal, bVal;
    switch(sortField) {
      case "name":
        aVal = empA?.name || "";
        bVal = empB?.name || "";
        break;
      case "checkIn":
        aVal = attA?.checkIn ? new Date(attA.checkIn).getTime() : 0;
        bVal = attB?.checkIn ? new Date(attB.checkIn).getTime() : 0;
        break;
      case "workHours":
        aVal = attA?.workHours || 0;
        bVal = attB?.workHours || 0;
        break;
      case "status":
        aVal = attA?.status || "";
        bVal = attB?.status || "";
        break;
      default:
        aVal = empA?.name || "";
        bVal = empB?.name || "";
    }
    
    if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case "present":
        return <span className="status-badge present"><CheckCircle size={12} /> Present</span>;
      case "absent":
        return <span className="status-badge absent"><XCircle size={12} /> Absent</span>;
      case "half-day":
        return <span className="status-badge half-day"><Clock size={12} /> Half Day</span>;
      default:
        return <span className="status-badge unknown">Unknown</span>;
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleExport = () => {
    const headers = ["Employee", "Email", "Check In", "Check Out", "Work Hours", "Status"];
    const rows = sortedData.map(item => {
      const emp = item.employee || item;
      const att = item.attendance || item;
      return [
        emp?.name || "",
        emp?.email || "",
        formatTime(att?.checkIn),
        formatTime(att?.checkOut),
        att?.workHours || 0,
        att?.status || "absent"
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="manager-attendance loading">
        <div className="spinner"></div>
        <p>Loading your team's attendance...</p>
      </div>
    );
  }

  return (
    <div className="manager-attendance">
      <div className="attendance-header">
        <div>
          <h1 className="page-title">Team Attendance</h1>
          <p className="page-subtitle">Track your team's daily attendance</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchTeamAttendance}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="team-banner">
        <div className="team-icon">
          <Briefcase size={20} />
        </div>
        <div className="team-info">
          <span className="team-label">Your Team</span>
          <span className="team-name">{teamInfo.teamName}</span>
          <span className="team-count">{teamInfo.memberCount} members</span>
        </div>
      </div>

      <div className="date-badge">
        <Calendar size={16} />
        <span>{formatDate()}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Team Members</span>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-trend">Total in your team</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon present">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Present Today</span>
            <span className="stat-value">{stats.present}</span>
            <span className="stat-trend">{stats.attendanceRate}% attendance</span>
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

      {stats.present > 0 && (
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
                  <div className="progress-fill on-time" style={{ width: `${(stats.onTime / stats.present) * 100 || 0}%` }}></div>
                </div>
              </div>
              <div className="punctuality-item">
                <span className="label">Late Arrival</span>
                <span className="value">{stats.late}</span>
                <div className="progress-bar">
                  <div className="progress-fill late" style={{ width: `${(stats.late / stats.present) * 100 || 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="filters-section">
        <div className="filters-header">
          <Filter size={16} />
          <h3>Filter Team Members</h3>
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
        </div>
      </div>

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
                  <p>No attendance records found for your team</p>
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => {
                const emp = item.employee || item;
                const att = item.attendance || item;
                return (
                  <tr key={emp?._id || index}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">
                          {emp?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="employee-name">{emp?.name}</div>
                          <div className="employee-email">{emp?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{formatTime(att?.checkIn)}</td>
                    <td>{formatTime(att?.checkOut)}</td>
                    <td>
                      <span className="hours-badge">
                        {att?.workHours?.toFixed(1) || 0}h
                      </span>
                    </td>
                    <td>{getStatusBadge(att?.status)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="footer-info">
          Showing {sortedData.length} of {stats.total} team members
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