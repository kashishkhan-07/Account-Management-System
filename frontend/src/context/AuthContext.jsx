import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const savedUser = localStorage.getItem("user");
      if (token) {
        try {
          const res = await API.get("/auth/me");
          const userData = res.data.user || res.data.data || res.data;
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (err) {
          console.warn("Auth verification warning:", err.message);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            setUser(null);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
          }
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });

    const accessToken = res.data.tokens?.accessToken || res.data.accessToken;
    const refreshToken = res.data.tokens?.refreshToken || res.data.refreshToken;
    const userData = res.data.user;

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    const finalUser = userData ? { ...userData, name: userData.fullName || userData.name } : { email };
    setUser(finalUser);
    localStorage.setItem("user", JSON.stringify(finalUser));
    return finalUser;
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");
  // =========================================================================
  // FIX: Flexible Register Function supporting Object Payload & Separate Arguments
  // =========================================================================
  const register = async (dataOrName, emailArg, passwordArg, roleArg, accountTypeArg, dobArg) => {
    let payload = {};
    if (typeof dataOrName === "object" && dataOrName !== null) {
      payload = dataOrName;
    } else {
      payload = {
        fullName: dataOrName,
        email: emailArg,
        password: passwordArg,
        role: roleArg,
        accountType: accountTypeArg,
        dob: dobArg,
      };
    }

    if (!payload.fullName && payload.name) {
      payload.fullName = payload.name;
    }

    const res = await API.post("/auth/register", payload);

    const accessToken = res.data.tokens?.accessToken || res.data.accessToken;
    const refreshToken = res.data.tokens?.refreshToken || res.data.refreshToken;
    const userData = res.data.user;

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    const finalUser = userData
      ? { ...userData, name: userData.fullName || userData.name }
      : { name: payload.fullName, email: payload.email };

    setUser(finalUser);
    localStorage.setItem("user", JSON.stringify(finalUser));
    return finalUser;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await API.post("/auth/logout", { refreshToken });
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);