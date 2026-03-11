import { useState, useEffect } from "react";
import api from '../../../services/api';
import { 
  Calendar, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search
} from 'lucide-react';
// import "./Leave.css";

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    filterLeaves();
  }, [leaves, filters]);

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leave/my");
      setLeaves(res.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeaves = () => {
    let filtered = [...leaves];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(l => l.status === filters.status);
    }

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(l => l.leaveType === filters.type);
    }

    // Filter by search (reason)
    if (filters.search) {
      filtered = filtered.filter(l => 
        l.reason.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredLeaves(filtered);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="badge badge-success"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      case 'pending':
        return <span className="badge badge-warning"><AlertCircle size={12} /> Pending</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getTypeBadge = (type) => {
    switch(type) {
      case 'casual':
        return <span className="badge badge-casual">Casual</span>;
      case 'sick':
        return <span className="badge badge-sick">Sick</span>;
      case 'emergency':
        return <span className="badge badge-danger">Emergency</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  return (
    <div className="leave-history-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Leave History</h1>
        <p className="page-subtitle">View all your leave applications</p>
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

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by reason..."
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
          <div className="loading-state">Loading...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No leaves found</h3>
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
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(leave.toDate).toLocaleDateString()}</td>
                    <td>{getTypeBadge(leave.leaveType)}</td>
                    <td className="reason-cell">{leave.reason}</td>
                    <td>{getStatusBadge(leave.status)}</td>
                    <td>{new Date(leave.createdAt).toLocaleDateString()}</td>
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