import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export const useApiError = () => {
  const { logout } = useAuth();
  const [error, setError] = useState(null);

  const handleError = (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // Let the ProtectedRoute handle redirect
      logout();
    } else {
      setError(error.response?.data?.message || 'Something went wrong');
    }
    
    return error;
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
};