import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import socketService from '../../services/socket'; // Changed from 'socket' to 'socketService'
import { useAuth } from "../../context/AuthContext";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  Calendar,
  FileText,
  PieChart,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import "./Dashboard.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function EmployeeDashboard() {
  const { user: authUser } = useAuth();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [managerOnline, setManagerOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [isIdle, setIsIdle] = useState(false);
  const [balance, setBalance] = useState(null);
  const [leaveType, setLeaveType] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const managerId = authUser?.manager?._id || authUser?.manager;

  // ========== DATA FETCHING ==========
  const fetchMyLeaves = useCallback(async () => {
    try {
      const res = await api.get("/leave/my");
      setLeaves(res.data || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setBalance(res.data.leaveBalance || res.data.profile?.leaveBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, []);

  const fetchManagerStatus = useCallback(async () => {
    if (!managerId) return;
    try {
      const res = await api.get(`/status/${managerId}`);
      setManagerOnline(res.data.online);
      setLastSeen(res.data.lastSeen);
    } catch (error) {
      console.error("Error fetching manager status:", error);
    }
  }, [managerId]);

  // ========== INITIAL DATA LOAD ==========
  useEffect(() => {
    const loadAllData = async () => {
      setPageLoading(true);
      try {
        await Promise.all([
          fetchMyLeaves(),
          fetchBalance(),
          fetchManagerStatus(),
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    loadAllData();
  }, [fetchMyLeaves, fetchBalance, fetchManagerStatus]);

  // ========== SOCKET CONNECTION ==========
  useEffect(() => {
    if (!managerId) {
      console.log("No manager ID found");
      return;
    }

    console.log("Connecting socket for manager:", managerId);
    socketService.connect(authUser?._id); // Connect with employee's own ID

    // Listen for manager status updates
    socketService.on("status-update", (data) => {
      console.log("Status update received:", data);
      if (String(data.userId) === String(managerId)) {
        if (data.idle) {
          setIsIdle(true);
          setManagerOnline(false);
          return;
        }
        setIsIdle(false);
        if (data.online) {
          setManagerOnline(true);
          setLastSeen(null);
        }
        if (!data.online && data.lastSeen) {
          setManagerOnline(false);
          setLastSeen(data.lastSeen);
        }
      }
    });

    return () => {
      socketService.off("status-update");
      // Don't disconnect here - let App.js handle it
    };
  }, [managerId, authUser?._id]);

  // ========== CHART CALCULATIONS ==========
  const usedCasual = balance?.casual?.used || 0;
  const usedSick = balance?.sick?.used || 0;
  const totalCasual = balance?.casual?.total || 0;
  const totalSick = balance?.sick?.total || 0;

  const chartData = {
    labels: ["Casual", "Sick"],
    datasets: [
      {
        label: "Used Leaves",
        data: [usedCasual, usedSick],
        backgroundColor: ["#3b82f6", "#ef4444"], // Fixed typo: 'bbackgroundColor' -> 'backgroundColor'
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: {
          color: "#64748b",
        },
        grid: {
          color: "#e2e8f0",
        },
      },
      y: {
        beginAtZero: true,
        max: Math.max(totalCasual, totalSick, 5),
        ticks: {
          color: "#64748b",
          stepSize: 1,
        },
        grid: {
          color: "#e2e8f0",
        },
      },
    },
  };

  // ========== APPLY LEAVE ==========
  const applyLeave = async (e) => {
    e.preventDefault();

    if (!fromDate || !toDate || !reason || !leaveType) {
      alert("All fields are required");
      return;
    }
    
    // Validate dates
    const todayDate = new Date(today);
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    
    if (fromDateObj < todayDate) {
      alert("From date cannot be in the past");
      return;
    }
    
    if (toDateObj < fromDateObj) {
      alert("To date cannot be before From date");
      return;
    }

    // Check leave balance
    const days = Math.ceil((toDateObj - fromDateObj) / (1000 * 60 * 60 * 24)) + 1;
    if (leaveType === 'casual' && usedCasual + days > totalCasual) {
      alert(`Insufficient casual leave balance. Available: ${totalCasual - usedCasual} days`);
      return;
    }
    if (leaveType === 'sick' && usedSick + days > totalSick) {
      alert(`Insufficient sick leave balance. Available: ${totalSick - usedSick} days`);
      return;
    }

    setLoading(true);
    try {
      await api.post("/leave/apply", {
        fromDate,
        toDate,
        reason,
        leaveType,
      });

      // Reset form
      setFromDate("");
      setToDate("");
      setReason("");
      setLeaveType("");
      
      // Refresh data
      await Promise.all([fetchMyLeaves(), fetchBalance()]);
      
      alert("Leave applied successfully!");
    } catch (error) {
      console.error("Error applying leave:", error);
      alert(error.response?.data?.message || "Failed to apply leave");
    } finally {
      setLoading(false);
    }
  };

  // ========== UTILITIES ==========
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="badge badge-success">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="badge badge-danger">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "pending":
        return (
          <span className="badge badge-warning">
            <AlertCircle size={12} /> Pending
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ========== ROLE CHECK ==========
  if (authUser?.role !== "employee") {
    return <div>Redirecting...</div>;
  }

  // ========== LOADING STATE ==========
  if (pageLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="employee-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Welcome back, {authUser?.name}! 👋</h1>
          <p className="page-subtitle">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline">
            <Calendar size={16} />
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Leave Balance Card */}
        {balance && (
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "#dbeafe", color: "#2563eb" }}
            >
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <h3>Leave Balance</h3>
              <p className="stat-value">
                {(balance.casual?.total || 0) + (balance.sick?.total || 0)} Days
              </p>
              <div className="stat-details">
                <span className="stat-detail">
                  Casual: {balance.casual?.total || 0} (Used: {balance.casual?.used || 0})
                </span>
                <span className="stat-detail">
                  Sick: {balance.sick?.total || 0} (Used: {balance.sick?.used || 0})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total Leaves Card */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Leaves</h3>
            <p className="stat-value">{leaves.length}</p>
            <div className="stat-details">
              <span className="stat-detail">Applied this year</span>
            </div>
          </div>
        </div>

        {/* Manager Status Card */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#fff3cd", color: "#f59e0b" }}
          >
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Manager Status</h3>
            <p className="stat-value">
              {managerOnline ? (
                <span className="status-online">● Online</span>
              ) : isIdle ? (
                <span className="status-idle">● Idle</span>
              ) : (
                <span className="status-offline">● Offline</span>
              )}
            </p>
            {lastSeen && !managerOnline && (
              <div className="stat-details">
                <Clock size={12} />
                <span className="stat-detail">
                  Last seen: {formatLastSeen(lastSeen)}
                </span>
              </div>
            )}
            {!managerId && (
              <div className="stat-details">
                <span className="stat-detail text-muted">
                  No manager assigned
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chart Card */}
        {balance && (
          <div className="stat-card chart-card">
            <div
              className="stat-icon"
              style={{ background: "#f3e8ff", color: "#9333ea" }}
            >
              <PieChart size={24} />
            </div>
            <div className="stat-content">
              <h3>Leave Usage</h3>
              <div className="chart-container" style={{ height: "120px", marginTop: "10px" }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply Leave Form */}
      <div className="card">
        <div className="card-header">
          <h3>Apply for Leave</h3>
          <p>Fill in the details to request leave</p>
        </div>
        <div className="card-body">
          <form className="leave-form" onSubmit={applyLeave}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} />
                  From Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={fromDate}
                  min={today}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} />
                  To Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={toDate}
                  min={fromDate || today}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FileText size={14} />
                  Leave Type
                </label>
                <select
                  className="form-control"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileText size={14} />
                Reason
              </label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Please provide reason for leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Applying..." : "Apply for Leave"}
            </button>
          </form>
        </div>
      </div>

      {/* Leaves History */}
      <div className="card">
        <div className="card-header">
          <h3>Leave History</h3>
          <p>Your recent leave applications</p>
        </div>
        <div className="card-body">
          {leaves.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h4>No leaves found</h4>
              <p>You haven't applied for any leaves yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.slice(0, 5).map((leave) => ( // Show only 5 most recent
                    <tr key={leave._id}>
                      <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
                      <td>{new Date(leave.toDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${leave.leaveType}`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="reason-cell">
                        {leave.reason && leave.reason.length > 40 
                          ? `${leave.reason.substring(0, 40)}...` 
                          : leave.reason}
                      </td>
                      <td>{getStatusBadge(leave.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaves.length > 5 && (
                <div className="view-more">
                  <button className="btn btn-link">View All History →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}