import { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
} from "lucide-react";
import "./Leave.css";

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    search: "",
  });

  useEffect(() => {
    let mounted = true;

    const fetchLeaves = async () => {
      try {
        const res = await api.get("/leave/my");
        if (mounted) setLeaves(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load leave history");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLeaves();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Filter Logic ---------- */

  const filteredLeaves = useMemo(() => {
    let filtered = [...leaves].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    const search = filters.search.toLowerCase();
    if (filters.status !== "all") {
      filtered = filtered.filter(
        (l) => l.status?.toLowerCase() === filters.status.toLowerCase(),
      );
    }

    if (filters.type !== "all") {
      filtered = filtered.filter(
        (l) => l.leaveType?.toLowerCase() === filters.type.toLowerCase(),
      );
    }

    if (search.trim()) {
      filtered = filtered.filter((l) =>
        (l.reason || "").toLowerCase().includes(search),
      );
    }
    return filtered;
  }, [leaves, filters]);

  /* ---------- Helpers ---------- */

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const getDays = (from, to) => {
    const diff = new Date(to) - new Date(from);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

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

  const getTypeBadge = (type) => {
    switch (type) {
      case "casual":
        return <span className="badge badge-casual">Casual</span>;

      case "sick":
        return <span className="badge badge-sick">Sick</span>;

      case "emergency":
        return <span className="badge badge-danger">Emergency</span>;

      case "other":
        return <span className="badge badge-secondary">Other</span>;

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

      {/* Error */}

      {error && <div className="error-box">{error}</div>}

      {/* Filters */}

      <div className="filters-card">
        <div className="filters-header">
          <Filter size={16} />
          <h3>Filters</h3>
        </div>

        <div className="filters-grid">
          {/* Status */}

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Leave Type */}

          <div className="filter-group">
            <label>Leave Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Search */}

          <div className="filter-group search-group">
            <label>Search</label>

            <div className="search-input">
              <Search size={14} />

              <input
                type="text"
                placeholder="Search by reason..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}

      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />

            <h3>No leaves found</h3>

            <p>
              {leaves.length === 0
                ? "You haven't applied for any leaves yet."
                : "No leaves match your filters."}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>{formatDate(leave.fromDate)}</td>

                    <td>{formatDate(leave.toDate)}</td>

                    <td>{getDays(leave.fromDate, leave.toDate)}</td>

                    <td>{getTypeBadge(leave.leaveType)}</td>

                    <td className="reason-cell">
                      {leave.reason || "No reason"}
                    </td>

                    <td>{getStatusBadge(leave.status)}</td>

                    <td>{formatDate(leave.createdAt)}</td>
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
