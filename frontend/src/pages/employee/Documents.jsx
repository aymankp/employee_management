import { useState, useEffect } from "react";
import api from '../../services/api';
import { useAuth } from "../../context/AuthContext";
import { 
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Trash2,
  Plus,
  FolderOpen,
  File,
  Image,
  FileSpreadsheet,
  FileArchive
} from 'lucide-react';
import "./Documents.css";

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    search: ''
  });
  const [uploadData, setUploadData] = useState({
    category: 'personal',
    documentType: 'aadhar',
    title: '',
    description: '',
    documentNumber: '',
    issuedBy: '',
    issuedDate: '',
    expiryDate: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, filters]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/documents/my");
      setDocuments(res.data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      showMessage("error", "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    if (filters.category !== 'all') {
      filtered = filtered.filter(d => d.category === filters.category);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.verificationStatus === filters.status);
    }

    if (filters.search) {
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        d.documentNumber?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredDocs(filtered);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);

    // Create preview URL for images
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      showMessage("error", "Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('category', uploadData.category);
    formData.append('documentType', uploadData.documentType);
    formData.append('title', uploadData.title);
    formData.append('description', uploadData.description);
    formData.append('documentNumber', uploadData.documentNumber);
    formData.append('issuedBy', uploadData.issuedBy);
    formData.append('issuedDate', uploadData.issuedDate);
    formData.append('expiryDate', uploadData.expiryDate);

    setUploading(true);
    try {
      await api.post("/documents/upload", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showMessage("success", "Document uploaded successfully!");
      setShowUploadModal(false);
      resetUploadForm();
      fetchDocuments();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      category: 'personal',
      documentType: 'aadhar',
      title: '',
      description: '',
      documentNumber: '',
      issuedBy: '',
      issuedDate: '',
      expiryDate: ''
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      await api.delete(`/documents/${docId}`);
      showMessage("success", "Document deleted successfully");
      fetchDocuments();
    } catch (error) {
      showMessage("error", "Failed to delete document");
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <Image size={20} />;
    if (mimeType?.includes('pdf')) return <FileText size={20} />;
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileSpreadsheet size={20} />;
    if (mimeType?.includes('zip') || mimeType?.includes('archive')) return <FileArchive size={20} />;
    return <File size={20} />;
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

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'personal':
        return '👤';
      case 'education':
        return '🎓';
      case 'work':
        return '💼';
      case 'id-proof':
        return '🆔';
      case 'medical':
        return '🏥';
      default:
        return '📄';
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 30;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return "expired";
    if (daysLeft <= 30) return "expiring";
    return "valid";
  };

  return (
    <div className="documents-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Documents</h1>
          <p className="page-subtitle">Manage and upload your documents</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
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
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by title or number..."
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
          <FolderOpen size={48} />
          <h3>No documents found</h3>
          <p>Upload your first document to get started</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={16} />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocs.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiryDate);
            
            return (
              <div key={doc._id} className="document-card">
                <div className="document-icon">
                  {getFileIcon(doc.mimeType)}
                </div>
                
                <div className="document-info">
                  <div className="document-header">
                    <h3>{doc.title}</h3>
                    <span className="document-category">
                      {getCategoryIcon(doc.category)} {doc.category}
                    </span>
                  </div>
                  
                  <p className="document-description">{doc.description}</p>
                  
                  <div className="document-meta">
                    <span className="meta-item">
                      <FileText size={12} />
                      {doc.documentType}
                    </span>
                    {doc.documentNumber && (
                      <span className="meta-item">#{doc.documentNumber}</span>
                    )}
                    <span className="meta-item">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  {doc.issuedBy && (
                    <div className="document-issuer">
                      Issued by: {doc.issuedBy}
                    </div>
                  )}

                  {doc.expiryDate && (
                    <div className={`expiry-badge expiry-${expiryStatus}`}>
                      <Clock size={12} />
                      {expiryStatus === 'expired' ? 'Expired' : 
                       expiryStatus === 'expiring' ? 'Expiring soon' : 
                       `Valid till ${new Date(doc.expiryDate).toLocaleDateString()}`}
                    </div>
                  )}

                  <div className="document-footer">
                    <div className="document-status">
                      {getStatusBadge(doc.verificationStatus)}
                    </div>
                    
                    <div className="document-actions">
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
                      <button 
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDelete(doc._id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {doc.verificationStatus === 'rejected' && doc.rejectionReason && (
                    <div className="rejection-reason">
                      <AlertCircle size={12} />
                      {doc.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Document</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpload} className="upload-form">
              {/* File Upload Area */}
              <div className="file-upload-area">
                <input
                  type="file"
                  id="file"
                  onChange={handleFileSelect}
                  className="file-input"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  required
                />
                <label htmlFor="file" className="file-label">
                  {selectedFile ? (
                    <div className="file-selected">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="file-preview" />
                      ) : (
                        getFileIcon(selectedFile.type)
                      )}
                      <span>{selectedFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span>Click to upload or drag and drop</span>
                      <small>PDF, Images, DOC, XLS (Max 5MB)</small>
                    </>
                  )}
                </label>
              </div>

              {/* Form Fields */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="personal">Personal</option>
                    <option value="education">Education</option>
                    <option value="work">Work</option>
                    <option value="id-proof">ID Proof</option>
                    <option value="medical">Medical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Document Type</label>
                  <select
                    value={uploadData.documentType}
                    onChange={(e) => setUploadData({...uploadData, documentType: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="aadhar">Aadhar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="passport">Passport</option>
                    <option value="driving-license">Driving License</option>
                    <option value="10th-marksheet">10th Marksheet</option>
                    <option value="12th-marksheet">12th Marksheet</option>
                    <option value="graduation-degree">Graduation Degree</option>
                    <option value="experience-letter">Experience Letter</option>
                    <option value="offer-letter">Offer Letter</option>
                    <option value="resume">Resume</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Title</label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                    className="form-control"
                    placeholder="e.g., My Aadhar Card"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    className="form-control"
                    rows="2"
                    placeholder="Brief description of the document"
                  />
                </div>

                <div className="form-group">
                  <label>Document Number</label>
                  <input
                    type="text"
                    value={uploadData.documentNumber}
                    onChange={(e) => setUploadData({...uploadData, documentNumber: e.target.value})}
                    className="form-control"
                    placeholder="e.g., 1234-5678-9012"
                  />
                </div>

                <div className="form-group">
                  <label>Issued By</label>
                  <input
                    type="text"
                    value={uploadData.issuedBy}
                    onChange={(e) => setUploadData({...uploadData, issuedBy: e.target.value})}
                    className="form-control"
                    placeholder="e.g., UIDAI"
                  />
                </div>

                <div className="form-group">
                  <label>Issued Date</label>
                  <input
                    type="date"
                    value={uploadData.issuedDate}
                    onChange={(e) => setUploadData({...uploadData, issuedDate: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={uploadData.expiryDate}
                    onChange={(e) => setUploadData({...uploadData, expiryDate: e.target.value})}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}