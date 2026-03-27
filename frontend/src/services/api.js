import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});


api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {}; // 🔥 THIS LINE FIXES EVERYTHING
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
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = (email, password) => 
  api.post('/auth/login', { email, password });

export const getProfile = () => api.get('/employees/me');

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

// Add these to your api service
export const getManagerProfile = () => api.get('/managers/me');
export const updateManagerProfile = (data) => api.put('/managers/me', data);
export const uploadManagerAvatar = (formData) => api.put('/managers/me/avatar', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getTeamMembers = () => api.get('/managers/team');
export default api;