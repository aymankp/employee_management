import { useState, useEffect, useCallback } from "react";  // ✅ Added useCallback
import api from '../../services/api';
import { 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Brain,
  RefreshCw,
  Download
} from 'lucide-react';
import "./TeamLeaves.css";

export default function TeamLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  });
  const [filters, setFilters] = useState({
    status: 'pending',
    employee: 'all',
    type: 'all',
    search: '',
    risk: 'all'
  });
  const [employees, setEmployees] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState({});

  // ========== FETCH FUNCTIONS ==========
  const fetchTeamLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/leave/team/pending");
      setLeaves(res.data);
      
      // Fetch AI recommendations for each leave
      res.data.forEach(leave => {
        fetchAIRecommendation(leave._id);
      });
    } catch (error) {
      console.error("Error fetching team leaves:", error);
      showMessage("error", "Failed to load team leaves");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await api.get("/employees/team");
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  }, []);

  const fetchAIRecommendation = useCallback(async (leaveId) => {
    try {
      const res = await api.get(`/leave/${leaveId}/analyze`);
      setAiRecommendations(prev => ({
        ...prev,
        [leaveId]: res.data.risk || 'Medium'
      }));
    } catch (error) {
      console.error("Error fetching AI recommendation:", error);
    }
  }, []);

  // ========== FILTER & STATS ==========
  const filterLeaves = useCallback(() => {
    let filtered = [...leaves];

    if (filters.status !== 'all') {
      filtered = filtered.filter(l => l.status === filters.status);
    }

    if (filters.employee !== 'all') {
      filtered = filtered.filter(l => l.employee?._id === filters.employee);
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(l => l.leaveType === filters.type);
    }

    if (filters.risk !== 'all') {
      filtered = filtered.filter(l => aiRecommendations[l._id] === filters.risk);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(l => 
        l.reason?.toLowerCase().includes(searchLower) ||
        l.employee?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLeaves(filtered);
  }, [leaves, filters, aiRecommendations]);

  const calculateStats = useCallback(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === 'pending').length;
    const approved = leaves.filter(l => l.status === 'approved').length;
    const rejected = leaves.filter(l => l.status === 'rejected').length;
    
    const highRisk = Object.values(aiRecommendations).filter(r => r === 'High').length;
    const mediumRisk = Object.values(aiRecommendations).filter(r => r === 'Medium').length;
    const lowRisk = Object.values(aiRecommendations).filter(r => r === 'Low').length;

    setStats({
      total,
      pending,
      approved,
      rejected,
      highRisk,
      mediumRisk,
      lowRisk
    });
  }, [leaves, aiRecommendations]);

  // ========== USE EFFECTS ==========
  useEffect(() => {
    fetchTeamLeaves();
    fetchTeamMembers();
  }, [fetchTeamLeaves, fetchTeamMembers]);

  useEffect(() => {
    filterLeaves();
    calculateStats();
  }, [leaves, filters, aiRecommendations, filterLeaves, calculateStats]);

  // ========== MESSAGE HELPER ==========
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // ========== ACTIONS ==========
  const handleApprove = async (leaveId) => {
    setProcessing(prev => ({ ...prev, [leaveId]: true }));
    try {
      await api.put(`/leave/${leaveId}/status`, { status: 'approved' });
      showMessage("success", "Leave approved successfully");
      fetchTeamLeaves();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to approve");
    } finally {
      setProcessing(prev => ({ ...prev, [leaveId]: false }));
    }
  };

  const handleReject = async (leaveId) => {
    const reason = window.prompt("Please provide reason for rejection:");
    if (!reason) return;

    setProcessing(prev => ({ ...prev, [leaveId]: true }));
    try {
      await api.put(`/leave/${leaveId}/status`, { 
        status: 'rejected',
        reason 
      });
      showMessage("success", "Leave rejected successfully");
      fetchTeamLeaves();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to reject");
    } finally {
      setProcessing(prev => ({ ...prev, [leaveId]: false }));
    }
  };

  const handleBulkAction = async (action) => {
    const selectedLeaves = filteredLeaves
      .filter(l => l.status === 'pending')
      .map(l => l._id);

    if (selectedLeaves.length === 0) {
      showMessage("error", "No pending leaves selected");
      return;
    }

    if (!window.confirm(`Are you sure you want to ${action} ${selectedLeaves.length} leaves?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/leave/bulk-status", {
        leaveIds: selectedLeaves,
        status: action
      });
      showMessage("success", `${selectedLeaves.length} leaves ${action} successfully`);
      fetchTeamLeaves();
    } catch (error) {
      showMessage("error", "Failed to process bulk action");
    } finally {
      setLoading(false);
    }
  };

  // ========== BADGES ==========
  const getRiskBadge = (risk) => {
    switch(risk) {
      case 'High':
        return <span className="risk-badge risk-high"><AlertCircle size={12} /> High Risk</span>;
      case 'Medium':
        return <span className="risk-badge risk-medium"><Brain size={12} /> Medium Risk</span>;
      case 'Low':
        return <span className="risk-badge risk-low"><CheckCircle size={12} /> Low Risk</span>;
      default:
        return <span className="risk-badge">Unknown</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="badge badge-success"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="team-leaves-container">
      {/* Header - same as before */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Leaves</h1>
          <p className="page-subtitle">Manage your team's leave requests</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchTeamLeaves}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => handleBulkAction('approved')}
          >
            <CheckCircle size={16} />
            Approve All
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => handleBulkAction('rejected')}
          >
            <XCircle size={16} />
            Reject All
          </button>
          <button className="btn btn-primary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Leaves</h3>
            <p className="stat-value">{stats.total}</p>
            <span className="stat-label">This month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-value">{stats.pending}</p>
            <span className="stat-label">Awaiting review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Approved</h3>
            <p className="stat-value">{stats.approved}</p>
            <span className="stat-label">This month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Rejected</h3>
            <p className="stat-value">{stats.rejected}</p>
            <span className="stat-label">This month</span>
          </div>
        </div>
      </div>

      {/* Risk Stats */}
      <div className="risk-stats">
        <div className="risk-stat risk-high-bg">
          <AlertCircle size={16} />
          <span>High Risk: {stats.highRisk}</span>
        </div>
        <div className="risk-stat risk-medium-bg">
          <Brain size={16} />
          <span>Medium Risk: {stats.mediumRisk}</span>
        </div>
        <div className="risk-stat risk-low-bg">
          <CheckCircle size={16} />
          <span>Low Risk: {stats.lowRisk}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-header">
          <Filter size={16} />
          <h3>Filters</h3>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Employee</label>
            <select 
              value={filters.employee}
              onChange={(e) => setFilters({...filters, employee: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Leave Type</label>
            <select 
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Risk Level</label>
            <select 
              value={filters.risk}
              onChange={(e) => setFilters({...filters, risk: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Risks</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by reason or employee..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leaves Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading leaves...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No leaves found</h3>
            <p>No leave requests match your filters</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Period</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Duration</th>
                  <th>AI Analysis</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id} className={aiRecommendations[leave._id] === 'High' ? 'high-risk-row' : ''}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">
                          {leave.employee?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="employee-name">{leave.employee?.name}</div>
                          <div className="employee-email">{leave.employee?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={12} />
                        <span>{formatDate(leave.fromDate)} - {formatDate(leave.toDate)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${leave.leaveType}`}>
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="reason-cell">{leave.reason}</td>
                    <td>
                      <span className="duration-badge">
                        {Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1} days
                      </span>
                    </td>
                    <td>
                      {aiRecommendations[leave._id] ? (
                        getRiskBadge(aiRecommendations[leave._id])
                      ) : (
                        <span className="loading-risk">Analyzing...</span>
                      )}
                    </td>
                    <td>{getStatusBadge(leave.status)}</td>
                    <td>
                      {leave.status === 'pending' ? (
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-icon-success"
                            onClick={() => handleApprove(leave._id)}
                            disabled={processing[leave._id]}
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleReject(leave._id)}
                            disabled={processing[leave._id]}
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="summary-card">
        <h3>Quick Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Team Size:</span>
            <strong>{employees.length} members</strong>
          </div>
          <div className="summary-item">
            <span>Pending Actions:</span>
            <strong className="text-warning">{stats.pending} leaves</strong>
          </div>
          <div className="summary-item">
            <span>Approval Rate:</span>
            <strong className="text-success">
              {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
            </strong>
          </div>
          <div className="summary-item">
            <span>High Risk Leaves:</span>
            <strong className="text-danger">{stats.highRisk}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}