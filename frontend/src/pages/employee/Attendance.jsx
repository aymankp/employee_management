import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  History,
  LogIn,
  LogOut,
} from "lucide-react";
import "./Attendance.css";

export default function Attendance() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [liveHours, setLiveHours] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });
  const DAILY_WORK_HOURS = 8;
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    totalHours: 0,
    averageHours: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (!todayStatus?.checkedOut) {
      const interval = setInterval(() => {
        fetchTodayStatus();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [todayStatus]);
  useEffect(() => {
    if (!todayStatus?.checkedIn || todayStatus?.checkedOut) return;

    const interval = setInterval(() => {
      const checkInTime = new Date(todayStatus.checkInTime);
      const now = new Date();

      const diff = (now - checkInTime) / (1000 * 60 * 60);
      setLiveHours(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [todayStatus]);

  useEffect(() => {
    calculateStats();
  }, [attendanceHistory]);

  const fetchTodayStatus = async () => {
    try {
      const res = await api.get("/attendance/today");
      setTodayStatus(res.data.status);
    } catch (error) {
      console.error("Error fetching today status:", error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/attendance/my?month=${selectedMonth}&year=${selectedYear}`,
      );
      setAttendanceHistory(res.data.attendance || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = attendanceHistory.length;
    const present = attendanceHistory.filter(
      (a) => a.status === "present",
    ).length;
    const absent = attendanceHistory.filter(
      (a) => a.status === "absent",
    ).length;
    const half = attendanceHistory.filter(
      (a) => a.status === "half-day",
    ).length;
    const totalHours = attendanceHistory.reduce(
      (sum, a) => sum + Number(a.workHours || 0),
      0,
    );

    setStats({
      totalDays: total,
      presentDays: present,
      absentDays: absent,
      halfDays: half,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHours: total > 0 ? Math.round((totalHours / total) * 10) / 10 : 0,
    });
  };

  const handleCheckIn = async () => {
    setChecking(true);
    setMessage({ type: "", text: "" });

    try {
      // Get user location (optional)
      let location = "office";

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });

          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch {
          location = "office";
        }
      }
      await api.post("/attendance/checkin", { location });

      setMessage({
        type: "success",
        text: "Check-in successful! Have a great day!",
      });

      // fetchTodayStatus();
      fetchAttendanceHistory();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Check-in failed",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await api.put("/attendance/checkout", {
        notes: "",
      });

      setTodayStatus(res.data.status); // ✅ now works

      setMessage({
        type: "success",
        text: "Check-out successful! Goodbye!",
      });

      fetchAttendanceHistory(); // optional now
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Check-out failed",
      });
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle size={16} className="status-present" />;
      case "absent":
        return <XCircle size={16} className="status-absent" />;
      case "half-day":
        return <AlertCircle size={16} className="status-half" />;
      default:
        return null;
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";

    return new Date(time).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLiveHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);

    return `${h}h ${m}m ${s}s`;
  };

  const progressPercent = Math.min((liveHours / DAILY_WORK_HOURS) * 100, 100);

  const getProgressColor = () => {
    if (progressPercent < 50) return "#3b82f6";
    if (progressPercent < 80) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="attendance-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">
            Track your daily attendance and work hours
          </p>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="today-card">
        <div className="today-header">
          <h2>Today's Attendance</h2>
          <div className="today-date">
            <Calendar size={16} />
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="today-content">
          <div className="status-section">
            {!todayStatus?.checkedIn ? (
              <div className="status-message absent">
                <XCircle size={48} />
                <h3>Not Checked In</h3>
                <p>You haven't checked in today</p>
              </div>
            ) : !todayStatus?.checkedOut ? (
              <div className="status-message present">
                <CheckCircle size={48} />
                <h3>Working</h3>

                <p>Checked in at {formatTime(todayStatus.checkInTime)}</p>

                {/* ✅ NEW STATUS */}
                {todayStatus?.early && (
                  <p className="status-early">🟢 Early Check-in</p>
                )}

                {todayStatus?.late && (
                  <p className="status-late">🔴 Late Check-in</p>
                )}

                {!todayStatus?.early && !todayStatus?.late && (
                  <p className="status-normal">🟡 On Time</p>
                )}

                {liveHours > 0 && (
                  <p className="hours">
                    Working for: {formatLiveHours(liveHours)}
                  </p>
                )}

                {/* Work Progress */}
                <div className="work-progress">
                  <div className="progress-header">
                    <span>Work Progress</span>
                    <span>{liveHours.toFixed(1)} / 8 hrs</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPercent}%`,
                        background: getProgressColor(),
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="status-message completed">
                <LogOut size={48} />
                <h3>Completed</h3>
                {todayStatus?.early && <p>🟢 Early</p>}
                {todayStatus?.late && <p>🔴 Late</p>}
                <p>Checked out at {formatTime(todayStatus.checkOutTime)}</p>
                <p className="hours">
                  Total:{" "}
                  {todayStatus?.workHours
                    ? `${todayStatus.workHours} hrs`
                    : formatLiveHours(liveHours)}
                </p>
              </div>
            )}
          </div>

          <div className="action-section">
            {!todayStatus?.checkedIn ? (
              <button
                className="btn btn-primary btn-large"
                onClick={handleCheckIn}
                disabled={checking}
              >
                <LogIn size={20} />
                {checking ? "Checking in..." : "Check In"}
              </button>
            ) : !todayStatus?.checkedOut ? (
              <button
                className="btn btn-success btn-large"
                onClick={handleCheckOut}
                disabled={checking}
              >
                <LogOut size={20} />
                {checking ? "Checking out..." : "Check Out"}
              </button>
            ) : (
              <div className="completed-message">
                <CheckCircle size={16} />
                <span>You have completed your day</span>
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#dbeafe", color: "#2563eb" }}
          >
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Days</h3>
            <p className="stat-value">{stats.totalDays}</p>
            <span className="stat-label">This month</span>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Present</h3>
            <p className="stat-value">{stats.presentDays}</p>
            <span className="stat-label">
              {stats.totalDays > 0
                ? Math.round((stats.presentDays / stats.totalDays) * 100)
                : 0}
              % attendance
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#fee2e2", color: "#dc2626" }}
          >
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Absent</h3>
            <p className="stat-value">{stats.absentDays}</p>
            <span className="stat-label">
              {stats.totalDays > 0
                ? Math.round((stats.absentDays / stats.totalDays) * 100)
                : 0}
              % absence
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#fef3c7", color: "#d97706" }}
          >
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Work Hours</h3>
            <p className="stat-value">{stats.totalHours}</p>
            <span className="stat-label">Avg {stats.averageHours} hrs/day</span>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="history-card">
        <div className="history-header">
          <h2>
            <History size={20} />
            Attendance History
          </h2>

          <div className="month-filter">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="month-select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-select"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading history...</div>
        ) : attendanceHistory.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No attendance records</h3>
            <p>No attendance data found for this month</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Work Hours</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <div className="date-cell">
                        {getStatusIcon(record.status)}
                        {new Date(record.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td>
                      <span className="hours-badge">
                        {record.workHours ? `${record.workHours}h` : "-"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${record.status}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <span className="location-badge">
                        <MapPin size={12} />
                        {typeof record.location === "string"
                          ? record.location
                          : record.location
                            ? `${record.location.lat}, ${record.location.lng}`
                            : "office"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
