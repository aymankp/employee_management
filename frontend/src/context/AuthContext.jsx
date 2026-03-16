import React, { createContext, useState, useContext, useEffect } from "react";
import { login as loginApi, getProfile } from "../services/api";
import api from "../services/api"; // Import api to set headers
import socketService from "../services/socket";

// Helper function to get full avatar URL
const getFullAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("http")) return avatarPath;
  // Make sure the path starts with /uploads/
  if (avatarPath.startsWith("/uploads/")) {
    return `http://localhost:5000${avatarPath}`;
  }
  // If it's just a filename, add the full path
  return `http://localhost:5000/uploads/${avatarPath}`;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user?._id) return;

    socketService.connect(user._id);

    return () => {
      socketService.disconnect();
    };
  }, [user?._id]);
  // Function to process user data (add full avatar URL)
  const processUserData = (userData) => {
    if (!userData) return null;

    // Create a copy to avoid mutating the original
    const processedUser = { ...userData };

    // Process avatar URL if it exists
    if (processedUser.avatar) {
      processedUser.avatar = getFullAvatarUrl(processedUser.avatar);
      console.log("Processed avatar URL:", processedUser.avatar); // Debug log
    }

    return processedUser;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        // Set token in API headers
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const response = await getProfile();
        console.log("Profile response:", response.data); // Debug log

        const userData =
          response.data.user || response.data.profile || response.data;
        const processedUser = processUserData(userData);

        setUser(processedUser);
      } catch (error) {
        console.error("❌ Failed to load user:", error);

        // Only remove token if 401
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          delete api.defaults.headers.common["Authorization"];
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      const { token } = response.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Immediately fetch full profile
      const profileRes = await getProfile();

      const userData =
        profileRes.data.user || profileRes.data.profile || profileRes.data;

      const processedUser = processUserData(userData);

      setUser(processedUser);

      return { success: true, role: processedUser.role };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  // NEW: Function to update user data (for avatar updates, profile edits)
  const updateUser = (updatedData) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;

      const newUser = { ...prevUser, ...updatedData };

      // Process avatar if it was updated
      if (updatedData.avatar) {
        newUser.avatar = getFullAvatarUrl(updatedData.avatar);
      }

      console.log("User updated:", newUser); // Debug log
      return newUser;
    });
  };

  // NEW: Function to refresh user data from API
  const refreshUser = async () => {
    try {
      const response = await getProfile();
      const userData =
        response.data.user || response.data.profile || response.data;
      const processedUser = processUserData(userData);
      setUser(processedUser);
      return processedUser;
    } catch (error) {
      console.error("Failed to refresh user:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser, // Expose updateUser function
        refreshUser, // Expose refreshUser function
        loading,
        isAuthenticated: !!user,
        role: user?.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
