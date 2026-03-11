import { useState, useEffect } from "react";
import api from '../../services/api';
import { useAuth } from "../../context/AuthContext";
import { 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Download,
  Eye,
  Calendar,
  RefreshCw,
  FileWarning
} from 'lucide-react';
import "./TeamDocuments.css";

export default function TeamDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    expired: 0,
    expiring: 0
  });
  const [filters, setFilters] = useState({
    employee: 'all',
    category: 'all',
    status: 'pending',
    expiry: 'all',
    search: ''
  });
  const [employees, setEmployees] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationNote, setVerificationNote] = useState("");

  useEffect(() => {
    fetchTeamDocuments();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    filterDocuments();
    calculateStats();
  }, [documents, filters]);

  const fetchTeamDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/documents/team");
      setDocuments(res.data.documents || []);
    } catch (error) {
      console.error("Error fetching team documents:", error);
      showMessage("error", "Failed to load team documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get("/employees/team");
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    if (filters.employee !== 'all') {
      filtered = filtered.filter(d => d.employee?._id === filters.employee);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(d => d.category === filters.category);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.verificationStatus === filters.status);
    }

    if (filters.expiry !== 'all') {
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      filtered = filtered.filter(d => {
        if (!d.expiryDate) return false;
        const expiry = new Date(d.expiryDate);
        
        if (filters.expiry === 'expired') return expiry < today;
        if (filters.expiry === 'expiring') return expiry > today && expiry <= thirtyDaysLater;
        if (filters.expiry === 'valid') return expiry > thirtyDaysLater;
        return true;
      });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(d => 
        d.title?.toLowerCase().includes(searchLower) ||
        d.employee?.name?.toLowerCase().includes(searchLower) ||
        d.documentNumber?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDocs(filtered);
  };

  const calculateStats = () => {
    const total = documents.length;
    const verified = documents.filter(d => d.verificationStatus === 'verified').length;
    const pending = documents.filter(d => d.verificationStatus === 'pending').length;
    const rejected = documents.filter(d => d.verificationStatus === 'rejected').length;
    
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expired = documents.filter(d => d.expiryDate && new Date(d.expiryDate) < today).length;
    const expiring = documents.filter(d => 
      d.expiryDate && 
      new Date(d.expiryDate) > today && 
      new Date(d.expiryDate) <= thirtyDaysLater
    ).length;

    setStats({
      total,
      verified,
      pending,
      rejected,
      expired,
      expiring
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleVerify = async (docId, status) => {
    if (!verificationNote && status === 'rejected') {
      showMessage("error", "Please provide a reason for rejection");
      return;
    }

    setProcessing(prev => ({ ...prev, [docId]: true }));
    try {
      await api.put(`/documents/${docId}/verify`, {
        status,
        notes: verificationNote
      });
      
      showMessage("success", `Document ${status} successfully`);
      setShowVerifyModal(false);
      setSelectedDoc(null);
      setVerificationNote("");
      fetchTeamDocuments();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to verify document");
    } finally {
      setProcessing(prev => ({ ...prev, [docId]: false }));
    }
  };

  const handleBulkVerify = async (status) => {
    const pendingDocs = filteredDocs
      .filter(d => d.verificationStatus === 'pending')
      .map(d => d._id);

    if (pendingDocs.length === 0) {
      showMessage("error", "No pending documents to verify");
      return;
    }

    if (!window.confirm(`Are you sure you want to ${status} ${pendingDocs.length} documents?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/documents/bulk-verify", {
        documentIds: pendingDocs,
        status
      });
      showMessage("success", `${pendingDocs.length} documents ${status} successfully`);
      fetchTeamDocuments();
    } catch (error) {
      showMessage("error", "Failed to process bulk verification");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'verified':
        return <span className="badge badge-success"><CheckCircle size={12} /> Verified</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      case 'expired':
        return <span className="badge badge-danger"><AlertCircle size={12} /> Expired</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { type: 'expired', text: 'Expired', icon: XCircle };
    if (daysLeft <= 30) return { type: 'expiring', text: `Expires in ${daysLeft} days`, icon: Clock };
    return { type: 'valid', text: `Valid till ${expiry.toLocaleDateString()}`, icon: CheckCircle };
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'personal': return '👤';
      case 'education': return '🎓';
      case 'work': return '💼';
      case 'id-proof': return '🆔';
      case 'medical': return '🏥';
      default: return '📄';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="team-documents-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Documents</h1>
          <p className="page-subtitle">Review and verify your team's documents</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchTeamDocuments}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-success"
            onClick={() => handleBulkVerify('verified')}
          >
            <CheckCircle size={16} />
            Verify All
          </button>
          <button 
            className="btn btn-danger"
            onClick={() => handleBulkVerify('rejected')}
          >
            <XCircle size={16} />
            Reject All
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
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Documents</h3>
            <p className="stat-value">{stats.total}</p>
            <span className="stat-label">Team documents</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Verified</h3>
            <p className="stat-value">{stats.verified}</p>
            <span className="stat-label">{Math.round((stats.verified / stats.total) * 100 || 0)}% verified</span>
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
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <FileWarning size={24} />
          </div>
          <div className="stat-content">
            <h3>Issues</h3>
            <p className="stat-value">{stats.rejected + stats.expired}</p>
            <span className="stat-label">Rejected or Expired</span>
          </div>
        </div>
      </div>

      {/* Expiry Alerts */}
      {(stats.expiring > 0 || stats.expired > 0) && (
        <div className="alerts-section">
          {stats.expiring > 0 && (
            <div className="alert alert-warning">
              <Clock size={16} />
              <span>{stats.expiring} documents are expiring within 30 days</span>
            </div>
          )}
          {stats.expired > 0 && (
            <div className="alert alert-danger">
              <XCircle size={16} />
              <span>{stats.expired} documents have expired</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-header">
          <Filter size={16} />
          <h3>Filters</h3>
        </div>
        
        <div className="filters-grid">
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
            <label>Category</label>
            <select 
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="personal">Personal</option>
              <option value="education">Education</option>
              <option value="work">Work</option>
              <option value="id-proof">ID Proof</option>
              <option value="medical">Medical</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Expiry</label>
            <select 
              value={filters.expiry}
              onChange={(e) => setFilters({...filters, expiry: e.target.value})}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="valid">Valid</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by title, employee, or number..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No documents found</h3>
          <p>No documents match your filters</p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocs.map((doc) => {
            const expiryStatus = doc.expiryDate ? getExpiryStatus(doc.expiryDate) : null;
            
            return (
              <div key={doc._id} className="document-card">
                <div className="document-header">
                  <div className="document-icon">
                    {getCategoryIcon(doc.category)}
                  </div>
                  <div className="document-title">
                    <h3>{doc.title}</h3>
                    <span className="document-type">{doc.documentType}</span>
                  </div>
                  <div className="document-status">
                    {getStatusBadge(doc.verificationStatus)}
                  </div>
                </div>

                <div className="document-body">
                  <div className="employee-info">
                    <div className="employee-avatar">
                      {doc.employee?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="employee-name">{doc.employee?.name}</div>
                      <div className="employee-email">{doc.employee?.email}</div>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="document-description">{doc.description}</p>
                  )}

                  <div className="document-details">
                    {doc.documentNumber && (
                      <div className="detail-item">
                        <span>Number:</span>
                        <strong>{doc.documentNumber}</strong>
                      </div>
                    )}
                    {doc.issuedBy && (
                      <div className="detail-item">
                        <span>Issued by:</span>
                        <strong>{doc.issuedBy}</strong>
                      </div>
                    )}
                    {doc.issuedDate && (
                      <div className="detail-item">
                        <span>Issued:</span>
                        <strong>{formatDate(doc.issuedDate)}</strong>
                      </div>
                    )}
                    {doc.expiryDate && (
                      <div className={`detail-item expiry-${expiryStatus?.type}`}>
                        <span>Expiry:</span>
                        <strong>{formatDate(doc.expiryDate)}</strong>
                        {expiryStatus && (
                          <span className="expiry-badge">
                            <expiryStatus.icon size={12} />
                            {expiryStatus.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="document-meta">
                    <span className="meta-item">
                      <FileText size={12} />
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </span>
                    <span className="meta-item">
                      <Calendar size={12} />
                      Uploaded {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                </div>

                <div className="document-footer">
                  <div className="footer-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>

                  {doc.verificationStatus === 'pending' && (
                    <div className="verification-actions">
                      <button
                        className="btn-icon btn-icon-success"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setVerificationNote("");
                          handleVerify(doc._id, 'verified');
                        }}
                        disabled={processing[doc._id]}
                        title="Verify"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setShowVerifyModal(true);
                        }}
                        disabled={processing[doc._id]}
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {doc.rejectionReason && (
                  <div className="rejection-reason">
                    <AlertCircle size={12} />
                    {doc.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && selectedDoc && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Document</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedDoc(null);
                  setVerificationNote("");
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>Are you sure you want to reject this document?</p>
              
              <div className="document-preview">
                <strong>{selectedDoc.title}</strong>
                <span>by {selectedDoc.employee?.name}</span>
              </div>

              <div className="form-group">
                <label>Reason for rejection</label>
                <textarea
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  className="form-control"
                  rows="3"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedDoc(null);
                  setVerificationNote("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleVerify(selectedDoc._id, 'rejected')}
                disabled={!verificationNote || processing[selectedDoc._id]}
              >
                {processing[selectedDoc._id] ? 'Processing...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}