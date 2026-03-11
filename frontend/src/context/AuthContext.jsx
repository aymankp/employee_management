import React, { createContext, useState, useContext, useEffect } from "react";
import { login as loginApi, getProfile } from "../services/api";
import api from "../services/api"; // ✅ Import api to set headers

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }
        // ✅ Set token in API headers
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const response = await getProfile();
        console.log("✅ User loaded:", response.data);
        setUser(response.data.user || response.data.profile);
      } catch (error) {
        console.error("❌ Failed to load user:", error);

        // ✅ SIRF TABHI TOKEN HATAO JAB API 401 DE
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          delete api.defaults.headers.common["Authorization"];
        }
        // ✅ AGAR KOI AUR ERROR HAI TO TOKEN MAT HATAO
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      // Set token in API headers
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      return { success: true, role: user.role };
    } catch (error) {
      console.error("❌ Login failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    console.log("👋 Logging out...");
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
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
