import { useState, useEffect } from "react";
import api from '../../services/api';
import { useAuth } from "../../context/AuthContext";
import { 
  Users,
  UserPlus,
  UserCheck,
  UserCog,
  UserX,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import "./Employees.css";

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    managers: 0,
    employees: 0
  });
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'active',
    team: 'all',
    search: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    team: '',
    phone: '',
    designation: '',
    joiningDate: '',
    employmentType: 'permanent',
    isActive: true
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
    calculateStats();
  }, [employees, filters]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      setEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      showMessage("error", "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    if (filters.role !== 'all') {
      filtered = filtered.filter(e => e.role === filters.role);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(e => 
        filters.status === 'active' ? e.isActive : !e.isActive
      );
    }

    if (filters.team !== 'all') {
      filtered = filtered.filter(e => e.team === filters.team);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.name?.toLowerCase().includes(searchLower) ||
        e.email?.toLowerCase().includes(searchLower) ||
        e.employeeId?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEmployees(filtered);
  };

  const calculateStats = () => {
    const total = employees.length;
    const active = employees.filter(e => e.isActive).length;
    const inactive = employees.filter(e => !e.isActive).length;
    const admins = employees.filter(e => e.role === 'admin').length;
    const managers = employees.filter(e => e.role === 'manager').length;
    const empCount = employees.filter(e => e.role === 'employee').length;

    setStats({
      total,
      active,
      inactive,
      admins,
      managers,
      employees: empCount
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing({ ...processing, add: true });
      
      const res = await api.post("/admin/add-employee", {
        name: formData.name,
        email: formData.email,
        password: formData.password || "Test@123",
        role: formData.role,
        team: formData.team,
        phone: formData.phone,
        designation: formData.designation,
        joiningDate: formData.joiningDate,
        employmentType: formData.employmentType
      });

      showMessage("success", `Employee added successfully! Temporary password: ${res.data.employee.tempPassword}`);
      setShowAddModal(false);
      resetForm();
      fetchEmployees();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to add employee");
    } finally {
      setProcessing({ ...processing, add: false });
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing({ ...processing, [selectedEmployee._id]: true });
      
      await api.put(`/admin/user/${selectedEmployee._id}`, {
        role: formData.role,
        team: formData.team,
        phone: formData.phone,
        designation: formData.designation,
        employmentType: formData.employmentType
      });

      showMessage("success", "Employee updated successfully");
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchEmployees();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to update employee");
    } finally {
      setProcessing({ ...processing, [selectedEmployee._id]: false });
    }
  };

  const handleToggleStatus = async (empId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this employee?`)) return;

    try {
      setProcessing({ ...processing, [empId]: true });
      
      await api.put(`/admin/user/${empId}/status`, {
        isActive: !currentStatus
      });

      showMessage("success", `Employee ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchEmployees();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to update status");
    } finally {
      setProcessing({ ...processing, [empId]: false });
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;

    try {
      setProcessing({ ...processing, [empId]: true });
      
      await api.delete(`/admin/user/${empId}`);

      showMessage("success", "Employee deleted successfully");
      fetchEmployees();

    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to delete employee");
    } finally {
      setProcessing({ ...processing, [empId]: false });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      team: '',
      phone: '',
      designation: '',
      joiningDate: '',
      employmentType: 'permanent',
      isActive: true
    });
  };

  const openEditModal = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      team: emp.team || '',
      phone: emp.personalInfo?.phone || '',
      designation: emp.employmentDetails?.designation || '',
      joiningDate: emp.employmentDetails?.joiningDate?.split('T')[0] || '',
      employmentType: emp.employmentDetails?.employmentType || 'permanent',
      isActive: emp.isActive
    });
    setShowEditModal(true);
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin':
        return <span className="role-badge role-admin"><Shield size={12} /> Admin</span>;
      case 'manager':
        return <span className="role-badge role-manager"><UserCog size={12} /> Manager</span>;
      case 'employee':
        return <span className="role-badge role-employee"><UserCheck size={12} /> Employee</span>;
      default:
        return <span className="role-badge">{role}</span>;
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 
      <span className="badge badge-success"><CheckCircle size={12} /> Active</span> :
      <span className="badge badge-danger"><XCircle size={12} /> Inactive</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const teams = ['engineering', 'sales', 'marketing', 'hr', 'finance', 'management'];

  return (
    <div className="employees-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="page-subtitle">Manage all employees and their roles</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchEmployees}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => window.open('/api/admin/employees/export', '_blank')}
          >
            <Download size={16} />
            Export
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <UserPlus size={16} />
            Add Employee
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
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Employees</h3>
            <p className="stat-value">{stats.total}</p>
            <span className="stat-label">Active: {stats.active}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <h3>Active</h3>
            <p className="stat-value">{stats.active}</p>
            <span className="stat-label">{Math.round((stats.active / stats.total) * 100 || 0)}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <UserX size={24} />
          </div>
          <div className="stat-content">
            <h3>Inactive</h3>
            <p className="stat-value">{stats.inactive}</p>
            <span className="stat-label">Need attention</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <UserCog size={24} />
          </div>
          <div className="stat-content">
            <h3>By Role</h3>
            <p className="stat-value">{stats.admins + stats.managers}</p>
            <span className="stat-label">Admins: {stats.admins}, Managers: {stats.managers}</span>
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
            <label>Role</label>
            <select 
              value={filters.role}
              onChange={(e) => setFilters({...filters, role: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Team</label>
            <select 
              value={filters.team}
              onChange={(e) => setFilters({...filters, team: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by name, email, ID..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No employees found</h3>
            <p>No employees match your filters</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact</th>
                  <th>Role & Team</th>
                  <th>Employment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">
                          {emp.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="employee-name">{emp.name}</div>
                          <div className="employee-id">ID: {emp.employeeId || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div><Mail size={12} /> {emp.email}</div>
                        {emp.personalInfo?.phone && (
                          <div><Phone size={12} /> {emp.personalInfo.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="role-team">
                        {getRoleBadge(emp.role)}
                        {emp.team && <span className="team-badge">{emp.team}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="employment-info">
                        <div><Briefcase size={12} /> {emp.employmentDetails?.designation || 'Not set'}</div>
                        <div><Calendar size={12} /> Joined: {formatDate(emp.employmentDetails?.joiningDate)}</div>
                      </div>
                    </td>
                    <td>{getStatusBadge(emp.isActive)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(emp)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={`btn-icon ${emp.isActive ? 'btn-icon-warning' : 'btn-icon-success'}`}
                          onClick={() => handleToggleStatus(emp._id, emp.isActive)}
                          disabled={processing[emp._id]}
                          title={emp.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {emp.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDeleteEmployee(emp._id)}
                          disabled={processing[emp._id]}
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Employee</h2>
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

            <form onSubmit={handleAddEmployee} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Password (Default: Test@123)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="form-control"
                    placeholder="Leave empty for default"
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="form-control"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                    className="form-control"
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                    className="form-control"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="probation">Probation</option>
                    <option value="intern">Intern</option>
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
                  {processing.add ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Employee</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEmployee(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    className="form-control"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    className="form-control"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="form-control"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                    className="form-control"
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                    className="form-control"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="probation">Probation</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing[selectedEmployee._id]}
                >
                  {processing[selectedEmployee._id] ? 'Updating...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}