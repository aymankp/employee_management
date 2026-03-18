
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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
import ManagerProfile from './pages/manager/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Employees from './pages/admin/Employees';
import Departments from './pages/admin/Departments';
import Settings from './pages/admin/Settings';
import EmployeeDetails from "./pages/admin/EmployeeDetails";


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
    // fallback based on role
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "manager") return <Navigate to="/manager" replace />;
    if (role === "employee") return <Navigate to="/employee" replace />;

    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const { isAuthenticated, role } = useAuth(); // Added user
  return (
    <Routes>
      {/* LOGIN */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? (
              role === "admin" ? <Navigate to="/admin" replace /> :
                role === "manager" ? <Navigate to="/manager" replace /> :
                  <Navigate to="/employee" replace />
            )
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
        <Route path="profile" element={<ManagerProfile />} />
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
        <Route path="/admin/employees/:id" element={<EmployeeDetails />} />
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