import { useEffect } from "react";
import { useAuthStore } from "../stores/auth.store";
import { api } from "../lib/axios";

// Shared across every component instance that calls useAuth(). Several
// mount at once on first load (Navbar, ProtectedRoute, the page itself), and
// each used to fire its own independent GET /users/me — this makes them
// share a single in-flight request instead.
let sessionCheckInFlight: Promise<void> | null = null;

function checkSession() {
  if (!sessionCheckInFlight) {
    sessionCheckInFlight = api
      .get("/users/me")
      .then(({ data }) => {
        useAuthStore.getState().setUser(data.success && data.data ? data.data : null);
      })
      .catch(() => {
        useAuthStore.getState().setUser(null);
      })
      .finally(() => {
        sessionCheckInFlight = null;
      });
  }
  return sessionCheckInFlight;
}

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout: clearStore } = useAuthStore();

  useEffect(() => {
    if (!user) {
      checkSession();
    }
  }, []);

  const logout = async () => {
    try {
      await api.post("/api/auth/sign-out");
    } catch {
      // Ignore
    } finally {
      clearStore();
      window.location.href = "/";
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSeller: user?.role === "seller" || user?.role === "admin",
    isAdmin: user?.role === "admin",
    logout,
    setUser,
  };
}
