import { useEffect } from "react";
import { useAuthStore } from "../stores/auth.store";
import { api } from "../lib/axios";

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout: clearStore } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data } = await api.get("/users/me");
        if (isMounted && data.success && data.data) {
          setUser(data.data);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      }
    }

    if (!user) {
      checkSession();
    }

    return () => {
      isMounted = false;
    };
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
