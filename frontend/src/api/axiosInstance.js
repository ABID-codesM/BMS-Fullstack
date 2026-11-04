import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  //baseURL: "http://192.168.113.25:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add the JWT token to every API request.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("bmsToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Handle authentication errors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;
    const isLoginRequest = requestUrl?.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      sessionStorage.removeItem("bmsToken");
      sessionStorage.removeItem("bmsUser");

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
