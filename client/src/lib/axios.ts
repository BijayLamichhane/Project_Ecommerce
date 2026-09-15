import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

// Left empty in development so requests stay relative (e.g. "/api/v1/...")
// and are forwarded by Vite's dev proxy (see vite.config.ts) to the API
// server. Set VITE_API_URL for a production build, where there is no dev
// proxy and the browser needs the real API origin.
const API_ORIGIN = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Better Auth mounts its own routes at the server root ("/api/auth/*"),
// not under the versioned "/api/v1" prefix, so route those requests there.
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    if (config.headers && typeof (config.headers as any).delete === "function") {
      (config.headers as any).delete("Content-Type");
    } else if (config.headers) {
      delete (config.headers as any)["Content-Type"];
    }
  }
  if (config.url?.startsWith("/api/auth")) {
    config.baseURL = API_ORIGIN;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const onAuthPage = path.startsWith("/login") || path.startsWith("/register");

      // Only force a redirect when the store still thinks we're signed in —
      // that means an active session just expired mid-use. A 401 from the
      // silent "/users/me" check on first load is expected for anonymous
      // visitors and must NOT bounce them off public pages.
      const wasAuthenticated = !!useAuthStore.getState().user;

      if (wasAuthenticated && !onAuthPage) {
        useAuthStore.getState().logout();
        window.location.href = `/login?redirect=${encodeURIComponent(path + window.location.search)}`;
      }
    }
    return Promise.reject(error);
  }
);
