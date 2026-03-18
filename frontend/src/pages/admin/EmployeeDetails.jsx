import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Loader, AlertCircle } from "lucide-react";
import "./EmployeeDetails.css";

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get(`/admin/user/${id}`);
      
      
      // Store raw data for debugging
      setRawData(res.data);
      
      // Check each field for objects
      const problematicFields = [];
      Object.keys(res.data).forEach(key => {
        const value = res.data[key];
        if (value && typeof value === 'object' && !(value instanceof Date)) {
          problematicFields.push({ key, value });
          console.warn(`Field "${key}" is an object:`, value);
        }
      });
      
      if (problematicFields.length > 0) {
        console.log("Problematic fields:", problematicFields);
      }
      
      setEmployee(res.data);
      
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader size={40} className="spinner" />
        <p>Loading employee details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={48} />
        <h3>Error Loading Employee</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="error-container">
        <AlertCircle size={48} />
        <h3>Employee Not Found</h3>
        <p>The requested employee could not be found.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  // Debug view - show raw data
  return (
    <div className="debug-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back
      </button>
      
      <h2 className="debug-title">Employee Data Debug</h2>
      
      <div className="debug-section">
        <h3 className="debug-subtitle">Basic Info (Safe to render):</h3>
        <div className="debug-info">
          <p><strong>ID:</strong> {employee._id || employee.id}</p>
          <p><strong>Name:</strong> {employee.name}</p>
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Role:</strong> {employee.role}</p>
          <p><strong>Active:</strong> {employee.isActive ? "Yes" : "No"}</p>
        </div>
      </div>

      <div className="debug-section">
        <h3 className="debug-subtitle">Raw Data (JSON):</h3>
        <pre className="debug-json">
          {JSON.stringify(employee, null, 2)}
        </pre>
      </div>

      <div className="debug-section">
        <h3 className="debug-subtitle">Field Types:</h3>
        <table className="debug-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Value Preview</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(employee).map(([key, value]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>
                  {value === null ? "null" : 
                   Array.isArray(value) ? "array" : 
                   typeof value}
                </td>
                <td>
                  {value && typeof value === 'object' ? 
                    <span className="debug-warning">⚠️ Object - cannot render directly</span> : 
                    String(value).substring(0, 50)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}