import React, { createContext, useState, useContext, useEffect } from "react";
import { login as loginApi, getProfile } from "../services/api";
import api from "../services/api";
import socketService from "../services/socket";

// Helper: avatar URL
const getFullAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("http")) return avatarPath;
  if (avatarPath.startsWith("/uploads/")) {
    return `http://localhost:5000${avatarPath}`;
  }
  return `http://localhost:5000/uploads/${avatarPath}`;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize user (VERY IMPORTANT)
  const processUserData = (userData) => {
    if (!userData) return null;

    const processedUser = { ...userData };
    processedUser.lastSeen = userData.lastSeen || null;
    processedUser.lastLogin = userData.lastLogin || null;

    processedUser.reportingTo =
  userData.reportingTo ||
  userData?.employmentDetails?.reportingTo ||
  null;
    // id fix
    processedUser._id = userData._id || userData.id;

    // role fix
    processedUser.role =
      userData.role ||
      userData?.employmentDetails?.role ||
      userData?.personalInfo?.role ||
      null;

    // avatar fix
    if (processedUser.avatar) {
      processedUser.avatar = getFullAvatarUrl(processedUser.avatar);
    }

    // 🔥 THIS LINE FIXES YOUR ENTIRE PROBLEM
    processedUser.lastSeen = userData.lastSeen || null;
    processedUser.lastLogin = userData.lastLogin || null;
    return processedUser;
  };

  //  Load user once (NO loops)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const response = await getProfile();
        const userData =
          response.data.user || response.data.profile || response.data;

        const processedUser = processUserData(userData);

        setUser(processedUser); //  no JSON stringify nonsense
      } catch (error) {
        console.error("Failed to load user:", error);

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

  // Socket connect ONCE when user available
  useEffect(() => {
    if (!user?._id) return;

    socketService.connect(user._id);

    return () => {
      socketService.disconnect();
    };
  }, [user?._id]); // safe now (no loop because user stable)

  // Login
  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      const token = response.data.token;

      if (!token) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // 🔥 IMPORTANT: fetch full profile after login
      const profileRes = await getProfile();

      const userData =
        profileRes.data.user || profileRes.data.profile || profileRes.data;

      const processedUser = processUserData(userData);
      setUser(processedUser);

      return { success: true, role: processedUser.role };
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      return {
        success: false,
        error: error.response?.data?.message || error.message || "Login failed",
      };
    }
  };
  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    socketService.disconnect();
    setUser(null);
  };

  // Update user (safe)
  const updateUser = (updatedData) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;

      const newUser = { ...prevUser, ...updatedData };

      if (updatedData.avatar) {
        newUser.avatar = getFullAvatarUrl(updatedData.avatar);
      }

      return newUser;
    });
  };

  // Refresh user
  const refreshUser = async () => {
    try {
      const response = await getProfile();
      const userData =
        response.data.user || response.data.profile || response.data;

      const processedUser = processUserData(userData);
      setUser(processedUser);

      return processedUser;
    } catch (error) {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        refreshUser,
        loading,
        isAuthenticated: !!user,
        role: user?.role || null, // ✅ always safe
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
