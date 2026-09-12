import axios from "axios";

const SERVER_ORIGIN = "http://localhost:5000";

export const api = axios.create({
  baseURL: `${SERVER_ORIGIN}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically route Better Auth endpoints to root server without /api/v1 duplication
api.interceptors.request.use((config) => {
  if (config.url?.startsWith("/api/auth")) {
    config.baseURL = SERVER_ORIGIN;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or unauthorized
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        // Optional redirect logic
      }
    }
    return Promise.reject(error);
  }
);
