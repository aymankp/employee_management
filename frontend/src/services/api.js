import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('📤 Request:', config.method, config.url, token ? '✅ Token present' : '❌ No token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - FIXED VERSION
api.interceptors.response.use(
  (response) => {
    
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.config?.url);
    
    // ✅ ONLY clear token if it's REALLY unauthorized
    // if (error.response?.status === 401) {
    //   const token = localStorage.getItem('token');
    //   console.log('🔒 401 Unauthorized - Token:', token ? 'Present' : 'Missing');
      
    //   // Only clear if token exists (prevents infinite loop)
    //   if (token) {
    //     console.log('🔒 Clearing invalid token');
    //     localStorage.removeItem('token');
        
    //     // ✅ Don't redirect immediately - let the app handle it
    //     // window.location.href = '/login';  // ❌ REMOVE THIS
    //   }
    // }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = (email, password) => 
  api.post('/auth/login', { email, password });

export const getProfile = () => 
  api.get('/employees/me');

// Dashboard APIs
export const getEmployeeDashboard = () => 
  api.get('/dashboard/employee');

export const getManagerDashboard = () => 
  api.get('/dashboard/manager');

export const getAdminDashboard = () => 
  api.get('/dashboard/admin');

// Leave APIs
export const applyLeave = (data) => 
  api.post('/leave/apply', data);

export const getMyLeaves = () => 
  api.get('/leave/my');

export const getPendingLeaves = () => 
  api.get('/leave/pending');

export const updateLeaveStatus = (id, status) => 
  api.put(`/leave/${id}/status`, { status });

// Attendance APIs
export const checkIn = (location = 'office') => 
  api.post('/attendance/checkin', { location });

export const checkOut = () => 
  api.put('/attendance/checkout');

export const getTodayStatus = () => 
  api.get('/attendance/today');

export const getMyAttendance = () => 
  api.get('/attendance/my');

// Document APIs
export const uploadDocument = (formData) => 
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getMyDocuments = () => 
  api.get('/documents/my');

export default api;