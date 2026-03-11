import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import socket from "../../socket";
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

  const managerId = authUser?.manager;

  // ========== DATA FETCHING ==========
  const fetchMyLeaves = useCallback(async () => {
    try {
      const res = await api.get("/leave/my");
      setLeaves(res.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setBalance(res.data.leaveBalance);
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
      await Promise.all([
        fetchMyLeaves(),
        fetchBalance(),
        fetchManagerStatus(),
      ]);
      setPageLoading(false);
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
    socket.connect();

    socket.on("status-update", (data) => {
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
      socket.off("status-update");
    };
  }, [managerId]);

  // ========== CHART CALCULATIONS ==========
  const usedCasual = balance
    ? (balance.casual?.total || 0) - (balance.casual?.used || 0)
    : 0;
  const usedSick = balance
    ? (balance.sick?.total || 0) - (balance.sick?.used || 0)
    : 0;

  const chartData = {
    labels: ["Casual", "Sick"],
    datasets: [
      {
        label: "Used Leaves",
        data: [usedCasual, usedSick],
        backgroundColor: ["#4e73df", "#e74a3b"],
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
      y: { beginAtZero: true },
    },
  };

  // ========== APPLY LEAVE ==========
  const applyLeave = async (e) => {
    e.preventDefault();

    if (!fromDate || !toDate || !reason || !leaveType) {
      alert("All fields are required");
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

      setFromDate("");
      setToDate("");
      setReason("");
      setLeaveType("");
      await Promise.all([fetchMyLeaves(), fetchBalance()]);
    } catch (error) {
      console.error("Error applying leave:", error);
      alert("Failed to apply leave");
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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <div className="spinner"></div>
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
                  Casual: {balance.casual?.total || 0}
                </span>
                <span className="stat-detail">
                  Sick: {balance.sick?.total || 0}
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
            {lastSeen && (
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
              <div style={{ height: "60px", marginTop: "10px" }}>
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
              className="btn btn-primary btn-block"
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
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
                      <td>{new Date(leave.toDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${leave.leaveType}`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td>{leave.reason}</td>
                      <td>{getStatusBadge(leave.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
