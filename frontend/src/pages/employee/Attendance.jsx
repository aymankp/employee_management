import { useState, useEffect } from "react";
import api from '../../services/api';
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
  LogOut
} from 'lucide-react';
import "./Attendance.css";

export default function Attendance() {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    totalHours: 0,
    averageHours: 0
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTodayStatus();
    fetchAttendanceHistory();
  }, []);

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
      const res = await api.get(`/attendance/my?month=${selectedMonth}&year=${selectedYear}`);
      setAttendanceHistory(res.data.attendance || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = attendanceHistory.length;
    const present = attendanceHistory.filter(a => a.status === 'present').length;
    const absent = attendanceHistory.filter(a => a.status === 'absent').length;
    const half = attendanceHistory.filter(a => a.status === 'half-day').length;
    const totalHours = attendanceHistory.reduce((sum, a) => sum + (a.workHours || 0), 0);
    
    setStats({
      totalDays: total,
      presentDays: present,
      absentDays: absent,
      halfDays: half,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHours: total > 0 ? Math.round((totalHours / total) * 10) / 10 : 0
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
          location = `${position.coords.latitude},${position.coords.longitude}`;
        } catch (error) {
          console.log("Location access denied, using default");
        }
      }

      await api.post("/attendance/checkin", { location });
      
      setMessage({ 
        type: "success", 
        text: "Check-in successful! Have a great day!" 
      });
      
      fetchTodayStatus();
      fetchAttendanceHistory();

    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error.response?.data?.message || "Check-in failed" 
      });
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    setMessage({ type: "", text: "" });

    try {
      await api.put("/attendance/checkout");
      
      setMessage({ 
        type: "success", 
        text: "Check-out successful! Goodbye!" 
      });
      
      fetchTodayStatus();
      fetchAttendanceHistory();

    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error.response?.data?.message || "Check-out failed" 
      });
    } finally {
      setChecking(false);
    }
  };

  const handleMonthChange = () => {
    fetchAttendanceHistory();
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present':
        return <CheckCircle size={16} className="status-present" />;
      case 'absent':
        return <XCircle size={16} className="status-absent" />;
      case 'half-day':
        return <AlertCircle size={16} className="status-half" />;
      default:
        return null;
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="attendance-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track your daily attendance and work hours</p>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="today-card">
        <div className="today-header">
          <h2>Today's Attendance</h2>
          <div className="today-date">
            <Calendar size={16} />
            <span>{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
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
                {todayStatus.workHours > 0 && (
                  <p className="hours">Worked: {todayStatus.workHours} hours</p>
                )}
              </div>
            ) : (
              <div className="status-message completed">
                <LogOut size={48} />
                <h3>Completed</h3>
                <p>Checked out at {formatTime(todayStatus.checkOutTime)}</p>
                <p className="hours">Total: {todayStatus.workHours} hours</p>
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
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Days</h3>
            <p className="stat-value">{stats.totalDays}</p>
            <span className="stat-label">This month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Present</h3>
            <p className="stat-value">{stats.presentDays}</p>
            <span className="stat-label">{Math.round((stats.presentDays / stats.totalDays) * 100 || 0)}% attendance</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Absent</h3>
            <p className="stat-value">{stats.absentDays}</p>
            <span className="stat-label">{Math.round((stats.absentDays / stats.totalDays) * 100 || 0)}% absence</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
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
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
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
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>

            <button 
              className="btn btn-outline btn-sm"
              onClick={handleMonthChange}
            >
              Go
            </button>
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
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td>
                      <span className="hours-badge">
                        {record.workHours ? `${record.workHours}h` : '-'}
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
                        {record.location || 'office'}
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