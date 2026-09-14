import axios from "axios";

// Automatically detects Production (Render) vs Local Dev (localhost)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// Flag and Queue for handling concurrent 401 requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token Queue on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        localStorage.getItem("refreshToken") ||
        localStorage.getItem("refresh_token");

      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        console.log("🔄 [Auth] Access Token Expired. Calling /auth/refresh-token...");
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken, token: refreshToken },
          { withCredentials: true }
        );

        const newAccessToken =
          res.data.accessToken ||
          res.data.token ||
          res.data.data?.accessToken ||
          res.data.data?.token;

        if (newAccessToken) {
          console.log("✅ [Auth] Token Refreshed Successfully!");
          localStorage.setItem("accessToken", newAccessToken);
          if (localStorage.getItem("token")) {
            localStorage.setItem("token", newAccessToken);
          }

          api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          isRefreshing = false;

          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.error("❌ [Auth] Refresh Token Request Failed:", refreshErr.response?.data || refreshErr.message);
        processQueue(refreshErr, null);
        isRefreshing = false;

        if (refreshErr.response?.status === 401 || refreshErr.response?.status === 403) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("refresh_token");
          window.location.href = "/";
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;