import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../../services/api";
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
  FileArchive,
} from "lucide-react";
import "./Documents.css";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const documentTypes = {
  personal: [
    { value: "aadhar", label: "Aadhar Card" },
    { value: "pan", label: "PAN Card" },
    { value: "passport", label: "Passport" },
    { value: "driving-license", label: "Driving License" },
  ],
  education: [
    { value: "10th-marksheet", label: "10th Marksheet" },
    { value: "12th-marksheet", label: "12th Marksheet" },
    { value: "graduation-degree", label: "Graduation Degree" },
    { value: "post-graduation-degree", label: "Post Graduation Degree" },
  ],
  work: [
    { value: "experience-letter", label: "Experience Letter" },
    { value: "offer-letter", label: "Offer Letter" },
    { value: "resume", label: "Resume" },
    { value: "salary-slip", label: "Salary Slip" },
  ],
  "id-proof": [
    { value: "aadhar", label: "Aadhar Card" },
    { value: "pan", label: "PAN Card" },
    { value: "passport", label: "Passport" },
    { value: "voter-id", label: "Voter ID" },
  ],
  medical: [
    { value: "medical-report", label: "Medical Report" },
    { value: "insurance", label: "Insurance Document" },
    { value: "prescription", label: "Prescription" },
  ],
};

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null); // Track which document is being deleted
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    search: "",
  });

  const [uploadData, setUploadData] = useState({
    category: "personal",
    documentType: "aadhar",
    title: "",
    description: "",
    documentNumber: "",
    issuedBy: "",
    issuedDate: "",
    expiryDate: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");

  // Clean up preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Memoized filtered documents
  const filteredDocs = useMemo(() => {
    let filtered = [...documents];

    if (filters.category !== "all") {
      filtered = filtered.filter((d) => d.category === filters.category);
    }

    if (filters.status !== "all") {
      filtered = filtered.filter(
        (d) => d.verificationStatus === filters.status,
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(searchLower) ||
          d.documentNumber?.toLowerCase().includes(searchLower) ||
          d.description?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [documents, filters]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/documents/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDocuments(res.data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      showMessage("error", "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  }, []);

  const validateFile = (file) => {
    if (!file) return "Please select a file";

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "File type not supported. Please upload PDF, Images, DOC, or XLS files";
    }

    return "";
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    const error = validateFile(file);

    if (error) {
      setFileError(error);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    setFileError("");
    setSelectedFile(file);

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create preview URL for images
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    const error = validateFile(file);

    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }

    setFileError("");
    setSelectedFile(file);

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file && file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const validateForm = () => {
    if (!selectedFile) {
      showMessage("error", "Please select a file");
      return false;
    }

    if (!uploadData.title.trim()) {
      showMessage("error", "Title is required");
      return false;
    }

    if (!uploadData.documentType) {
      showMessage("error", "Please select document type");
      return false;
    }

    return true;
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const formData = new FormData();
    formData.append("document", selectedFile);
    formData.append("category", uploadData.category);
    formData.append("documentType", uploadData.documentType);
    formData.append("title", uploadData.title.trim());
    formData.append("description", uploadData.description.trim());
    formData.append("documentNumber", uploadData.documentNumber.trim());
    formData.append("issuedBy", uploadData.issuedBy.trim());
    formData.append("issuedDate", uploadData.issuedDate);
    formData.append("expiryDate", uploadData.expiryDate);

    setUploading(true);
    try {
      await api.post("/documents/upload", formData);

      showMessage("success", "Document uploaded successfully!");
      setShowUploadModal(false);
      resetUploadForm();
      await fetchDocuments(); // Wait for documents to refresh
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Upload failed";
      showMessage("error", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setUploadData({
      category: "personal",
      documentType: "aadhar",
      title: "",
      description: "",
      documentNumber: "",
      issuedBy: "",
      issuedDate: "",
      expiryDate: "",
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError("");
  };

  const handleCategoryChange = (category) => {
    const availableTypes = documentTypes[category];
    setUploadData({
      ...uploadData,
      category,
      documentType: availableTypes[0]?.value || "",
    });
  };

  const handleView = (fileUrl) => {
    if (!fileUrl || typeof fileUrl !== "string") {
      showMessage("error", "Invalid file URL");
      return;
    }

    // Basic URL validation - ensure it's a relative path starting with /uploads/
    if (!fileUrl.startsWith("/uploads/")) {
      showMessage("error", "Invalid file URL");
      return;
    }

    // Encode the URL to prevent XSS
    const encodedUrl = encodeURI(`http://localhost:5000${fileUrl}`);
    window.open(encodedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = (doc) => {
    if (!doc?.fileUrl) {
      showMessage("error", "File not found");
      return;
    }

    try {
      // Direct file access from uploads folder
      const fileUrl = `http://localhost:5000${doc.fileUrl}`;

      // Create filename from title or use the original filename
      const fileName = doc.title || doc.fileUrl.split("/").pop() || "document";

      // Create a link element
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Optional: Try to track download but don't fail if it doesn't work
      api.post(`/documents/${doc._id}/download`).catch((err) => {
        console.log("Download tracking failed (optional):", err.message);
      });

      showMessage("success", "Download started");
    } catch (error) {
      console.error("Download error:", error);
      showMessage("error", "Failed to download document");
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;

    setDeleting(docId);
    try {
      await api.delete(`/documents/${docId}`);
      showMessage("success", "Document deleted successfully");

      // Optimistically update the UI
      setDocuments((prev) => prev.filter((doc) => doc._id !== docId));
    } catch (error) {
      showMessage("error", "Failed to delete document");
      // Revert optimistic update by refetching
      await fetchDocuments();
    } finally {
      setDeleting(null);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith("image/")) return <Image size={20} />;
    if (mimeType?.includes("pdf")) return <FileText size={20} />;
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel"))
      return <FileSpreadsheet size={20} />;
    if (mimeType?.includes("zip") || mimeType?.includes("archive"))
      return <FileArchive size={20} />;
    if (mimeType?.includes("word") || mimeType?.includes("document"))
      return <FileText size={20} />;
    return <File size={20} />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <span className="badge badge-success">
            <CheckCircle size={12} /> Verified
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
            <Clock size={12} /> Pending
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "personal":
        return "👤";
      case "education":
        return "🎓";
      case "work":
        return "💼";
      case "id-proof":
        return "🆔";
      case "medical":
        return "🏥";
      default:
        return "📄";
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return "expired";
    if (daysLeft <= 30) return "expiring";
    return "valid";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
          aria-label="Upload document"
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`message message-${message.type}`}
          role="alert"
          aria-live="polite"
        >
          {message.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
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
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="filter-select"
              aria-label="Filter by category"
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
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="filter-select"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label htmlFor="search">Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                id="search"
                type="text"
                placeholder="Search by title, number, or description..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                aria-label="Search documents"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div
          className="loading-state"
          role="status"
          aria-label="Loading documents"
        >
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
            aria-label="Upload your first document"
          >
            <Plus size={16} />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="documents-grid" role="list" aria-label="Documents list">
          {filteredDocs.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiryDate);
            const isDeleting = deleting === doc._id;

            return (
              <div
                key={doc._id}
                className={`document-card ${isDeleting ? "deleting" : ""}`}
                role="listitem"
              >
                <div className="document-icon" aria-hidden="true">
                  {getFileIcon(doc.mimeType)}
                </div>

                <div className="document-info">
                  <div className="document-header">
                    <h3>{doc.title}</h3>
                    <span className="document-category">
                      {getCategoryIcon(doc.category)} {doc.category}
                    </span>
                  </div>

                  {doc.description && (
                    <p className="document-description">{doc.description}</p>
                  )}

                  <div className="document-meta">
                    <span className="meta-item">
                      <FileText size={12} />
                      {doc.documentType}
                    </span>
                    {doc.documentNumber && (
                      <span className="meta-item">#{doc.documentNumber}</span>
                    )}
                    <span className="meta-item">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </div>

                  {doc.issuedBy && (
                    <div className="document-issuer">
                      Issued by: {doc.issuedBy}
                    </div>
                  )}

                  {doc.issuedDate && (
                    <div className="document-date">
                      Issued: {formatDate(doc.issuedDate)}
                    </div>
                  )}

                  {doc.expiryDate && (
                    <div className={`expiry-badge expiry-${expiryStatus}`}>
                      <Clock size={12} />
                      {expiryStatus === "expired"
                        ? `Expired on ${formatDate(doc.expiryDate)}`
                        : expiryStatus === "expiring"
                          ? `Expires on ${formatDate(doc.expiryDate)} (soon)`
                          : `Valid till ${formatDate(doc.expiryDate)}`}
                    </div>
                  )}

                  <div className="document-footer">
                    <div className="document-status">
                      {getStatusBadge(doc.verificationStatus)}
                    </div>

                    <div className="document-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleView(doc.fileUrl)}
                        title="View document"
                        aria-label={`View ${doc.title}`}
                        disabled={isDeleting}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="btn-icon"
                        onClick={() => handleDownload(doc)} // Pass the whole document object
                        title="Download document"
                        aria-label={`Download ${doc.title}`}
                        disabled={isDeleting}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDelete(doc._id)}
                        title="Delete document"
                        aria-label={`Delete ${doc.title}`}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <div className="spinner-small" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {doc.verificationStatus === "rejected" &&
                    doc.rejectionReason && (
                      <div className="rejection-reason" role="alert">
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
        <div
          className="modal-overlay"
          onClick={() => setShowUploadModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <div className="modal-header">
              <h2 id="modal-title">Upload Document</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpload} className="upload-form" noValidate>
              {/* File Upload Area */}
              <div
                className={`file-upload-area ${dragActive ? "drag-active" : ""} ${fileError ? "error" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file"
                  onChange={handleFileSelect}
                  className="file-input"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  aria-describedby="file-error"
                  aria-invalid={!!fileError}
                />
                <label htmlFor="file" className="file-label">
                  {selectedFile ? (
                    <div className="file-selected">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="file-preview"
                        />
                      ) : (
                        getFileIcon(selectedFile.type)
                      )}
                      <span>{selectedFile.name}</span>
                      <small>{formatFileSize(selectedFile.size)}</small>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span>Click to upload or drag and drop</span>
                      <small>PDF, Images, DOC, XLS (Max 5MB)</small>
                    </>
                  )}
                </label>
                {fileError && (
                  <div id="file-error" className="file-error" role="alert">
                    <AlertCircle size={14} />
                    {fileError}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={uploadData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="form-control"
                    required
                    aria-required="true"
                  >
                    <option value="personal">Personal</option>
                    <option value="education">Education</option>
                    <option value="work">Work</option>
                    <option value="id-proof">ID Proof</option>
                    <option value="medical">Medical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="documentType">Document Type *</label>
                  <select
                    id="documentType"
                    value={uploadData.documentType}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        documentType: e.target.value,
                      })
                    }
                    className="form-control"
                    required
                    aria-required="true"
                  >
                    {uploadData.category && documentTypes[uploadData.category]
                      ? documentTypes[uploadData.category].map((doc) => (
                          <option key={doc.value} value={doc.value}>
                            {doc.label}
                          </option>
                        ))
                      : null}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="title">Title *</label>
                  <input
                    id="title"
                    type="text"
                    value={uploadData.title}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, title: e.target.value })
                    }
                    className="form-control"
                    placeholder="e.g., My Aadhar Card"
                    required
                    aria-required="true"
                    maxLength="100"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={uploadData.description}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        description: e.target.value,
                      })
                    }
                    className="form-control"
                    rows="2"
                    placeholder="Brief description of the document"
                    maxLength="500"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="documentNumber">Document Number</label>
                  <input
                    id="documentNumber"
                    type="text"
                    value={uploadData.documentNumber}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        documentNumber: e.target.value,
                      })
                    }
                    className="form-control"
                    placeholder="e.g., 1234-5678-9012"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="issuedBy">Issued By</label>
                  <input
                    id="issuedBy"
                    type="text"
                    value={uploadData.issuedBy}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, issuedBy: e.target.value })
                    }
                    className="form-control"
                    placeholder="e.g., UIDAI"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="issuedDate">Issued Date</label>
                  <input
                    id="issuedDate"
                    type="date"
                    value={uploadData.issuedDate}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        issuedDate: e.target.value,
                      })
                    }
                    className="form-control"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expiryDate">Expiry Date</label>
                  <input
                    id="expiryDate"
                    type="date"
                    value={uploadData.expiryDate}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        expiryDate: e.target.value,
                      })
                    }
                    className="form-control"
                    min={new Date().toISOString().split("T")[0]}
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
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || !!fileError}
                  aria-busy={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="spinner-small" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Document"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
