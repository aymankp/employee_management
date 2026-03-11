import api from '../../services/api';
import socket from "../../socket";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Users,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Brain,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import "./Dashboard.css";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState({});
  const [recommendations, setRecommendations] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  });

  const fetchPendingLeaves = async () => {
    try {
      const res = await api.get("/leave/pending");
      setLeaves(res.data);
      
      // Update stats based on recommendations
      const high = res.data.filter(l => recommendations[l._id] === 'High').length;
      const medium = res.data.filter(l => recommendations[l._id] === 'Medium').length;
      const low = res.data.filter(l => recommendations[l._id] === 'Low').length;
      
      setStats({
        total: res.data.length,
        highRisk: high,
        mediumRisk: medium,
        lowRisk: low
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 SOCKET LOGIC (FIXED) & idle detectection
  useEffect(() => {
    if (!user?.id) return;

    socket.connect();

    socket.on("connect", () => {
      socket.emit("user-online", user.id);
    });

    let idleTimeout;

    const goIdle = () => {
      socket.emit("user-idle", user.id);
    };

    const resetTimer = () => {
      clearTimeout(idleTimeout);
      socket.emit("user-online", user.id);
      idleTimeout = setTimeout(goIdle, 300000); // 5 minutes
    };

    resetTimer();

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    return () => {
      clearTimeout(idleTimeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      socket.disconnect();
    };
  }, [user?.id]);

  const updateStatus = async (leaveId, status) => {
    try {
      setLoading(true);
      await api.put(
        `/leave/${leaveId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      // Remove from list after action
      setLeaves(prev => prev.filter(l => l._id !== leaveId));
      
      // Show success message
      alert(`Leave ${status} successfully!`);
    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendation = async (leaveId) => {
    try {
      setAiLoading(prev => ({ ...prev, [leaveId]: true }));
      console.log("Fetching AI for:", leaveId);
      
      const res = await api.get(
        `/leave/${leaveId}/analyze`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setRecommendations((prev) => ({
        ...prev,
        [leaveId]: res.data.risk || 'Medium',
      }));
      
      setAiLoading(prev => ({ ...prev, [leaveId]: false }));
    } catch (err) {
      console.log(err);
      setRecommendations((prev) => ({
        ...prev,
        [leaveId]: 'Medium',
      }));
      setAiLoading(prev => ({ ...prev, [leaveId]: false }));
    }
  };

  const fetchLeaves = useCallback(async () => {
    const res = await api.get("/leave/pending");
    setLeaves(res.data);

    res.data.forEach((leave) => {
      fetchRecommendation(leave._id);
    });
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Update stats when recommendations change
  useEffect(() => {
    const high = leaves.filter(l => recommendations[l._id] === 'High').length;
    const medium = leaves.filter(l => recommendations[l._id] === 'Medium').length;
    const low = leaves.filter(l => recommendations[l._id] === 'Low').length;
    
    setStats({
      total: leaves.length,
      highRisk: high,
      mediumRisk: medium,
      lowRisk: low
    });
  }, [recommendations, leaves]);

  const getRiskBadge = (risk) => {
    switch(risk) {
      case 'High':
        return <span className="badge badge-danger"><AlertCircle size={12} /> High Risk</span>;
      case 'Medium':
        return <span className="badge badge-warning"><AlertCircle size={12} /> Medium Risk</span>;
      case 'Low':
        return <span className="badge badge-success"><CheckCircle size={12} /> Low Risk</span>;
      default:
        return <span className="badge badge-secondary">Unknown</span>;
    }
  };

  return (
    <div className="manager-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Manager Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}! Here are the pending leave requests for your team.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchLeaves}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary">
            <Users size={16} />
            <span>Team Overview</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Pending</h3>
            <p className="stat-value">{stats.total}</p>
            <span className="stat-label">Awaiting your review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>High Risk</h3>
            <p className="stat-value">{stats.highRisk}</p>
            <span className="stat-label">Need careful review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Medium Risk</h3>
            <p className="stat-value">{stats.mediumRisk}</p>
            <span className="stat-label">Standard review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Low Risk</h3>
            <p className="stat-value">{stats.lowRisk}</p>
            <span className="stat-label">Quick approval likely</span>
          </div>
        </div>
      </div>

      {/* Pending Leaves Table */}
      <div className="card">
        <div className="card-header">
          <h3>Pending Leave Requests</h3>
          <p>Review and take action on employee leave applications</p>
        </div>
        <div className="card-body">
          {leaves.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h4>No pending leaves</h4>
              <p>All caught up! No leave requests waiting for your review.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Contact</th>
                    <th>Leave Period</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>AI Analysis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id} className={recommendations[l._id] === 'High' ? 'high-risk-row' : ''}>
                      <td>
                        <div className="employee-info">
                          <div className="employee-avatar">
                            {l.employee?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="employee-name">{l.employee?.name}</div>
                            <div className="employee-role">{l.employee?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <Mail size={14} />
                          <span>{l.employee?.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-range">
                          <Calendar size={14} />
                          <span>{new Date(l.fromDate).toLocaleDateString()} - {new Date(l.toDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${l.leaveType}`}>
                          {l.leaveType}
                        </span>
                      </td>
                      <td>
                        <div className="reason-cell">
                          <MessageSquare size={14} />
                          <span>{l.reason}</span>
                        </div>
                      </td>
                      <td>
                        {aiLoading[l._id] ? (
                          <div className="ai-loading">
                            <Brain size={16} className="spinning" />
                            <span>Analyzing...</span>
                          </div>
                        ) : (
                          <div className="ai-suggestion">
                            <Brain size={16} />
                            {getRiskBadge(recommendations[l._id])}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-success btn-sm"
                            disabled={loading}
                            onClick={() => updateStatus(l._id, "approved")}
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={loading}
                            onClick={() => updateStatus(l._id, "rejected")}
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
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