import { useState, useEffect } from "react";
import api from '../../services/api';
import { useAuth } from "../../context/AuthContext";
import { 
  Building2,
  Users,
  UserCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Briefcase,
  MapPin,
} from 'lucide-react';
import "./Departments.css";

export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [filteredDepts, setFilteredDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalEmployees: 0,
    avgEmployees: 0
  });
  const [filters, setFilters] = useState({
    status: 'active',
    search: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head: '',
    parentDepartment: '',
    location: '',
    budget: '',
    status: 'active'
  });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterDepartments();
    calculateStats();
  }, [departments, employees, filters]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/departments");
      setDepartments(res.data.departments || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      showMessage("error", "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/admin/users");
      setEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const filterDepartments = () => {
    let filtered = [...departments];

    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(d => 
        d.name?.toLowerCase().includes(searchLower) ||
        d.code?.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDepts(filtered);
  };

  const calculateStats = () => {
    const total = departments.length;
    const active = departments.filter(d => d.status === 'active').length;
    const inactive = departments.filter(d => d.status === 'inactive').length;
    const totalEmployees = employees.length;
    const avgEmployees = total > 0 ? Math.round(totalEmployees / total) : 0;

    setStats({
      total,
      active,
      inactive,
      totalEmployees,
      avgEmployees
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing({ ...processing, add: true });
      
      await api.post("/departments", formData);

      showMessage("success", "Department added successfully");
      setShowAddModal(false);
      resetForm();
      fetchDepartments();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to add department");
    } finally {
      setProcessing({ ...processing, add: false });
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing({ ...processing, [selectedDept._id]: true });
      
      await api.put(`/departments/${selectedDept._id}`, formData);

      showMessage("success", "Department updated successfully");
      setShowEditModal(false);
      setSelectedDept(null);
      fetchDepartments();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to update department");
    } finally {
      setProcessing({ ...processing, [selectedDept._id]: false });
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDept) return;

    try {
      setProcessing({ ...processing, delete: true });
      
      await api.delete(`/departments/${selectedDept._id}`);

      showMessage("success", "Department deleted successfully");
      setShowDeleteModal(false);
      setSelectedDept(null);
      fetchDepartments();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to delete department");
    } finally {
      setProcessing({ ...processing, delete: false });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      head: '',
      parentDepartment: '',
      location: '',
      budget: '',
      status: 'active'
    });
  };

  const openEditModal = (dept) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      head: dept.head?._id || '',
      parentDepartment: dept.parentDepartment?._id || '',
      location: dept.location || '',
      budget: dept.budget || '',
      status: dept.status
    });
    setShowEditModal(true);
  };

  const getHeadName = (dept) => {
    if (!dept.head) return 'Not Assigned';
    return typeof dept.head === 'object' ? dept.head.name : 'Loading...';
  };

  const getParentName = (dept) => {
    if (!dept.parentDepartment) return 'None';
    return typeof dept.parentDepartment === 'object' ? dept.parentDepartment.name : 'Loading...';
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? 
      <span className="badge badge-success"><CheckCircle size={12} /> Active</span> :
      <span className="badge badge-danger"><XCircle size={12} /> Inactive</span>;
  };

  const getEmployeeCount = (deptId) => {
    return employees.filter(e => e.employmentDetails?.department === deptId).length;
  };

  return (
    <div className="departments-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Management</h1>
          <p className="page-subtitle">Manage departments and their heads</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchDepartments}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Plus size={16} />
            Add Department
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
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Departments</h3>
            <p className="stat-value">{stats.total}</p>
            <span className="stat-label">Active: {stats.active}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Employees</h3>
            <p className="stat-value">{stats.totalEmployees}</p>
            <span className="stat-label">Across departments</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Briefcase size={24} />
          </div>
          <div className="stat-content">
            <h3>Average Size</h3>
            <p className="stat-value">{stats.avgEmployees}</p>
            <span className="stat-label">Employees per dept</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <UserCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Dept Heads</h3>
            <p className="stat-value">{stats.active}</p>
            <span className="stat-label">Assigned</span>
          </div>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by name, code, description..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading departments...</p>
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="empty-state">
          <Building2 size={48} />
          <h3>No departments found</h3>
          <p>No departments match your filters</p>
        </div>
      ) : (
        <div className="departments-grid">
          {filteredDepts.map((dept) => {
            const employeeCount = getEmployeeCount(dept._id);
            
            return (
              <div key={dept._id} className="department-card">
                <div className="department-header">
                  <div className="department-icon">
                    <Building2 size={24} />
                  </div>
                  <div className="department-title">
                    <h3>{dept.name}</h3>
                    <span className="department-code">{dept.code}</span>
                  </div>
                  <div className="department-status">
                    {getStatusBadge(dept.status)}
                  </div>
                </div>

                <div className="department-body">
                  {dept.description && (
                    <p className="department-description">{dept.description}</p>
                  )}

                  <div className="department-details">
                    <div className="detail-item">
                      <UserCircle size={16} />
                      <span>Head:</span>
                      <strong>{getHeadName(dept)}</strong>
                    </div>

                    {dept.parentDepartment && (
                      <div className="detail-item">
                        <Building2 size={16} />
                        <span>Parent:</span>
                        <strong>{getParentName(dept)}</strong>
                      </div>
                    )}

                    {dept.location && (
                      <div className="detail-item">
                        <MapPin size={16} />
                        <span>Location:</span>
                        <strong>{dept.location}</strong>
                      </div>
                    )}

                    {dept.budget > 0 && (
                      <div className="detail-item">
                        <Briefcase size={16} />
                        <span>Budget:</span>
                        <strong>₹{dept.budget.toLocaleString()}</strong>
                      </div>
                    )}

                    <div className="detail-item">
                      <Users size={16} />
                      <span>Employees:</span>
                      <strong className={employeeCount > 0 ? 'text-success' : 'text-muted'}>
                        {employeeCount}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="department-footer">
                  <button
                    className="btn-icon"
                    onClick={() => openEditModal(dept)}
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => {
                      setSelectedDept(dept);
                      setShowDeleteModal(true);
                    }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Department</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Department Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="form-control"
                    placeholder="e.g., ENG, HR, SALES"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-control"
                    rows="3"
                    placeholder="Brief description of the department"
                  />
                </div>

                <div className="form-group">
                  <label>Department Head</label>
                  <select
                    value={formData.head}
                    onChange={(e) => setFormData({...formData, head: e.target.value})}
                    className="form-control"
                  >
                    <option value="">Select Head</option>
                    {employees
                      .filter(e => e.role === 'manager' || e.role === 'admin')
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Parent Department</label>
                  <select
                    value={formData.parentDepartment}
                    onChange={(e) => setFormData({...formData, parentDepartment: e.target.value})}
                    className="form-control"
                  >
                    <option value="">None (Top Level)</option>
                    {departments
                      .filter(d => d.status === 'active')
                      .map(dept => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="form-control"
                    placeholder="e.g., Bangalore, Mumbai"
                  />
                </div>

                <div className="form-group">
                  <label>Annual Budget</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    className="form-control"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="form-control"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing.add}
                >
                  {processing.add ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDept && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Department</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDept(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Department Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-control"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Department Head</label>
                  <select
                    value={formData.head}
                    onChange={(e) => setFormData({...formData, head: e.target.value})}
                    className="form-control"
                  >
                    <option value="">Select Head</option>
                    {employees
                      .filter(e => e.role === 'manager' || e.role === 'admin')
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Parent Department</label>
                  <select
                    value={formData.parentDepartment}
                    onChange={(e) => setFormData({...formData, parentDepartment: e.target.value})}
                    className="form-control"
                  >
                    <option value="">None (Top Level)</option>
                    {departments
                      .filter(d => d.status === 'active' && d._id !== selectedDept._id)
                      .map(dept => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Annual Budget</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="form-control"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDept(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing[selectedDept._id]}
                >
                  {processing[selectedDept._id] ? 'Updating...' : 'Update Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDept && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Department</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDept(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="delete-warning">
                <AlertCircle size={48} />
                <h3>Are you sure?</h3>
                <p>You are about to delete the department:</p>
                <strong>{selectedDept.name} ({selectedDept.code})</strong>
                <p className="warning-text">
                  This action cannot be undone. Employees in this department will need to be reassigned.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDept(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteDepartment}
                disabled={processing.delete}
              >
                {processing.delete ? 'Deleting...' : 'Delete Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}