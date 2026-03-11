import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'react';
// Auth Pages
import Login from './pages/auth/Login';

// Layout
import Layout from './components/Layout/Layout';

// Employee Pages
import EmployeeDashboard from './pages/employee/Dashboard';
import ApplyLeave from './pages/employee/Leave/ApplyLeave';
import LeaveHistory from './pages/employee/Leave/LeaveHistory';
import Attendance from './pages/employee/Attendance';
import Documents from './pages/employee/Documents';
import Profile from './pages/employee/Profile';

// Manager Pages
import ManagerDashboard from './pages/manager/Dashboard';
import TeamLeaves from './pages/manager/TeamLeaves';
import TeamDocuments from './pages/manager/TeamDocuments';
import Reports from './pages/manager/Reports';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import Departments from './pages/admin/Departments';
import Settings from './pages/admin/Settings';

const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column'
  }}>
    <h3>Loading...</h3>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role}`} replace />;
  }

  return children;
};

function AppRoutes() {

  const { isAuthenticated, role } = useAuth();
  useEffect(() => {

    if (!role) return;
    const savedTheme = localStorage.getItem(`${role}-theme`);
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [role]);


  return (
    <Routes>

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={`/${role}`} replace />
            : <Login />
        }
      />

      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* EMPLOYEE */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="leave/apply" element={<ApplyLeave />} />
        <Route path="leave/history" element={<LeaveHistory />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="documents" element={<Documents />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* MANAGER */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManagerDashboard />} />
        <Route path="team-leaves" element={<TeamLeaves />} />
        <Route path="team-documents" element={<TeamDocuments />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="departments" element={<Departments />} />
        <Route path="all-leaves" element={<LeaveHistory />} />
        <Route path="all-documents" element={<Documents />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>


  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;