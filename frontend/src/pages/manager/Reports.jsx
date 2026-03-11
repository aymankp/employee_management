import { useState, useEffect } from "react";
import api from '../../services/api';
import { useAuth } from "../../context/AuthContext";
import { 
  FileText,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  FilePieChart,
  Mail,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import "./Reports.css";

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [reportType, setReportType] = useState('leaves');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({
    totalLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    pendingLeaves: 0,
    totalDocuments: 0,
    verifiedDocs: 0,
    pendingDocs: 0,
    expiredDocs: 0,
    teamSize: 0,
    attendanceRate: 0,
    avgWorkHours: 0
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      switch(reportType) {
        case 'leaves':
          endpoint = `/reports/leaves?from=${dateRange.from}&to=${dateRange.to}`;
          break;
        case 'documents':
          endpoint = `/reports/documents`;
          break;
        case 'attendance':
          endpoint = `/reports/attendance?from=${dateRange.from}&to=${dateRange.to}`;
          break;
        case 'employees':
          endpoint = '/reports/employees';
          break;
        case 'summary':
          endpoint = '/reports/summary';
          break;
        default:
          endpoint = '/reports/leaves';
      }

      const res = await api.get(endpoint);
      setReportData(res.data);
      calculateStats(res.data);
      
    } catch (error) {
      console.error("Error fetching report:", error);
      showMessage("error", "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (!data) return;

    // Leaves stats
    const totalLeaves = data.leaves?.length || 0;
    const approvedLeaves = data.leaves?.filter(l => l.status === 'approved').length || 0;
    const rejectedLeaves = data.leaves?.filter(l => l.status === 'rejected').length || 0;
    const pendingLeaves = data.leaves?.filter(l => l.status === 'pending').length || 0;

    // Documents stats
    const totalDocuments = data.documents?.length || 0;
    const verifiedDocs = data.documents?.filter(d => d.verificationStatus === 'verified').length || 0;
    const pendingDocs = data.documents?.filter(d => d.verificationStatus === 'pending').length || 0;
    const expiredDocs = data.documents?.filter(d => {
      if (!d.expiryDate) return false;
      return new Date(d.expiryDate) < new Date();
    }).length || 0;

    // Team stats
    const teamSize = data.employees?.length || 0;
    const attendanceRate = data.attendance?.rate || 0;
    const avgWorkHours = data.attendance?.avgHours || 0;

    setStats({
      totalLeaves,
      approvedLeaves,
      rejectedLeaves,
      pendingLeaves,
      totalDocuments,
      verifiedDocs,
      pendingDocs,
      expiredDocs,
      teamSize,
      attendanceRate,
      avgWorkHours
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleExport = async (format) => {
    try {
      setGenerating(true);
      
      let endpoint = '';
      switch(reportType) {
        case 'leaves':
          endpoint = `/reports/leaves/export.${format}?from=${dateRange.from}&to=${dateRange.to}`;
          break;
        case 'documents':
          endpoint = `/reports/documents/export.${format}`;
          break;
        case 'attendance':
          endpoint = `/reports/attendance/export.${format}?from=${dateRange.from}&to=${dateRange.to}`;
          break;
        case 'employees':
          endpoint = `/reports/employees/export.${format}`;
          break;
        case 'summary':
          endpoint = `/reports/summary/export.${format}`;
          break;
        default:
          endpoint = `/reports/leaves/export.${format}?from=${dateRange.from}&to=${dateRange.to}`;
      }

      // Trigger file download
      window.open(`http://localhost:5000/api${endpoint}`, '_blank');
      
      showMessage("success", `Report exported as ${format.toUpperCase()}`);
      
    } catch (error) {
      console.error("Export error:", error);
      showMessage("error", "Failed to export report");
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailReport = async () => {
    try {
      setGenerating(true);
      
      await api.post('/reports/email', {
        type: reportType,
        from: dateRange.from,
        to: dateRange.to,
        email: user?.email
      });
      
      showMessage("success", "Report sent to your email");
      
    } catch (error) {
      console.error("Email error:", error);
      showMessage("error", "Failed to send email");
    } finally {
      setGenerating(false);
    }
  };

  const getReportTitle = () => {
    switch(reportType) {
      case 'leaves': return 'Leave Reports';
      case 'documents': return 'Document Reports';
      case 'attendance': return 'Attendance Reports';
      case 'employees': return 'Employee Reports';
      case 'summary': return 'Executive Summary';
      default: return 'Reports';
    }
  };

  const renderLeavesReport = () => {
    if (!reportData?.leaves) return null;

    const leavesByType = reportData.leaves.reduce((acc, leave) => {
      acc[leave.leaveType] = (acc[leave.leaveType] || 0) + 1;
      return acc;
    }, {});

    const leavesByEmployee = reportData.leaves.reduce((acc, leave) => {
      const name = leave.employee?.name || 'Unknown';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="report-content">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Leaves</h3>
              <p className="stat-value">{stats.totalLeaves}</p>
              <span className="stat-label">In selected period</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>Approved</h3>
              <p className="stat-value">{stats.approvedLeaves}</p>
              <span className="stat-label">{Math.round((stats.approvedLeaves / stats.totalLeaves) * 100 || 0)}%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>Rejected</h3>
              <p className="stat-value">{stats.rejectedLeaves}</p>
              <span className="stat-label">{Math.round((stats.rejectedLeaves / stats.totalLeaves) * 100 || 0)}%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>Pending</h3>
              <p className="stat-value">{stats.pendingLeaves}</p>
              <span className="stat-label">{Math.round((stats.pendingLeaves / stats.totalLeaves) * 100 || 0)}%</span>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Leaves by Type</h3>
            <div className="chart-container">
              {Object.entries(leavesByType).map(([type, count]) => (
                <div key={type} className="chart-bar-item">
                  <span className="bar-label">{type}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${(count / stats.totalLeaves) * 100}%`,
                        background: type === 'sick' ? '#ef4444' : 
                                   type === 'casual' ? '#10b981' : 
                                   type === 'emergency' ? '#f59e0b' : '#3b82f6'
                      }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>Leaves by Employee</h3>
            <div className="chart-container">
              {Object.entries(leavesByEmployee).map(([name, count]) => (
                <div key={name} className="chart-bar-item">
                  <span className="bar-label">{name}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ width: `${(count / stats.totalLeaves) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="table-card">
          <h3>Detailed Leave Report</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.leaves.map(leave => (
                  <tr key={leave._id}>
                    <td>{leave.employee?.name}</td>
                    <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(leave.toDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${leave.leaveType}`}>
                        {leave.leaveType}
                      </span>
                    </td>
                    <td>{leave.reason}</td>
                    <td>
                      <span className={`badge badge-${leave.status}`}>
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentsReport = () => {
    if (!reportData?.documents) return null;

    const docsByCategory = reportData.documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {});

    const docsByStatus = reportData.documents.reduce((acc, doc) => {
      acc[doc.verificationStatus] = (acc[doc.verificationStatus] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="report-content">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Documents</h3>
              <p className="stat-value">{stats.totalDocuments}</p>
              <span className="stat-label">Team documents</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>Verified</h3>
              <p className="stat-value">{stats.verifiedDocs}</p>
              <span className="stat-label">{Math.round((stats.verifiedDocs / stats.totalDocuments) * 100 || 0)}%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>Pending</h3>
              <p className="stat-value">{stats.pendingDocs}</p>
              <span className="stat-label">Awaiting review</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>Expired</h3>
              <p className="stat-value">{stats.expiredDocs}</p>
              <span className="stat-label">Need renewal</span>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Documents by Category</h3>
            <div className="chart-container">
              {Object.entries(docsByCategory).map(([category, count]) => (
                <div key={category} className="chart-bar-item">
                  <span className="bar-label">{category}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ width: `${(count / stats.totalDocuments) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>Documents by Status</h3>
            <div className="chart-container">
              {Object.entries(docsByStatus).map(([status, count]) => (
                <div key={status} className="chart-bar-item">
                  <span className="bar-label">{status}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${(count / stats.totalDocuments) * 100}%`,
                        background: status === 'verified' ? '#10b981' :
                                   status === 'pending' ? '#f59e0b' :
                                   status === 'rejected' ? '#ef4444' : '#3b82f6'
                      }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="table-card">
          <h3>Expiring/Expired Documents</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.documents
                  .filter(d => d.expiryDate)
                  .map(doc => {
                    const isExpired = new Date(doc.expiryDate) < new Date();
                    const daysLeft = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={doc._id} className={isExpired ? 'expired-row' : daysLeft <= 30 ? 'expiring-row' : ''}>
                        <td>{doc.employee?.name}</td>
                        <td>{doc.title}</td>
                        <td>{doc.documentType}</td>
                        <td>{new Date(doc.expiryDate).toLocaleDateString()}</td>
                        <td>
                          {isExpired ? (
                            <span className="badge badge-danger">Expired</span>
                          ) : daysLeft <= 30 ? (
                            <span className="badge badge-warning">Expires in {daysLeft} days</span>
                          ) : (
                            <span className="badge badge-success">Valid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    if (!reportData?.attendance) return null;

    return (
      <div className="report-content">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Team Size</h3>
              <p className="stat-value">{stats.teamSize}</p>
              <span className="stat-label">Active members</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>Attendance Rate</h3>
              <p className="stat-value">{stats.attendanceRate}%</p>
              <span className="stat-label">Average attendance</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>Avg Work Hours</h3>
              <p className="stat-value">{stats.avgWorkHours}h</p>
              <span className="stat-label">Per day</span>
            </div>
          </div>
        </div>

        <div className="table-card">
          <h3>Daily Attendance Summary</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Half Day</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {reportData.attendance.daily?.map((day, index) => (
                  <tr key={index}>
                    <td>{new Date(day.date).toLocaleDateString()}</td>
                    <td>{day.present}</td>
                    <td>{day.absent}</td>
                    <td>{day.halfDay || 0}</td>
                    <td>
                      <span className={`badge ${day.rate >= 80 ? 'badge-success' : day.rate >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                        {day.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryReport = () => {
    return (
      <div className="report-content">
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Leave Summary</h3>
            <div className="summary-stats">
              <div className="summary-item">
                <span>Total Leaves:</span>
                <strong>{stats.totalLeaves}</strong>
              </div>
              <div className="summary-item">
                <span>Approved:</span>
                <strong className="text-success">{stats.approvedLeaves}</strong>
              </div>
              <div className="summary-item">
                <span>Rejected:</span>
                <strong className="text-danger">{stats.rejectedLeaves}</strong>
              </div>
              <div className="summary-item">
                <span>Pending:</span>
                <strong className="text-warning">{stats.pendingLeaves}</strong>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Document Summary</h3>
            <div className="summary-stats">
              <div className="summary-item">
                <span>Total Documents:</span>
                <strong>{stats.totalDocuments}</strong>
              </div>
              <div className="summary-item">
                <span>Verified:</span>
                <strong className="text-success">{stats.verifiedDocs}</strong>
              </div>
              <div className="summary-item">
                <span>Pending:</span>
                <strong className="text-warning">{stats.pendingDocs}</strong>
              </div>
              <div className="summary-item">
                <span>Expired:</span>
                <strong className="text-danger">{stats.expiredDocs}</strong>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Team Summary</h3>
            <div className="summary-stats">
              <div className="summary-item">
                <span>Team Size:</span>
                <strong>{stats.teamSize}</strong>
              </div>
              <div className="summary-item">
                <span>Attendance Rate:</span>
                <strong className="text-success">{stats.attendanceRate}%</strong>
              </div>
              <div className="summary-item">
                <span>Avg Work Hours:</span>
                <strong>{stats.avgWorkHours}h</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{getReportTitle()}</h1>
          <p className="page-subtitle">Generate and export team reports</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchReportData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => handleExport('pdf')}
            disabled={generating}
          >
            <FilePieChart size={16} />
            PDF
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => handleExport('excel')}
            disabled={generating}
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button 
            className="btn btn-outline"
            onClick={handleEmailReport}
            disabled={generating}
          >
            <Mail size={16} />
            Email
          </button>
          <button className="btn btn-primary">
            <Printer size={16} />
            Print
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

      {/* Report Controls */}
      <div className="controls-card">
        <div className="controls-grid">
          <div className="control-group">
            <label>Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="control-select"
            >
              <option value="leaves">Leave Reports</option>
              <option value="documents">Document Reports</option>
              <option value="attendance">Attendance Reports</option>
              <option value="employees">Employee Reports</option>
              <option value="summary">Executive Summary</option>
            </select>
          </div>

          <div className="control-group">
            <label>From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="control-input"
              max={dateRange.to}
            />
          </div>

          <div className="control-group">
            <label>To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="control-input"
              min={dateRange.from}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="control-group">
            <label>&nbsp;</label>
            <button 
              className="btn btn-primary btn-block"
              onClick={fetchReportData}
            >
              <Filter size={16} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating report...</p>
        </div>
      ) : (
        <>
          {reportType === 'leaves' && renderLeavesReport()}
          {reportType === 'documents' && renderDocumentsReport()}
          {reportType === 'attendance' && renderAttendanceReport()}
          {reportType === 'summary' && renderSummaryReport()}
        </>
      )}
    </div>
  );
}