import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/apiBase.js";

const AuthContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiBase = getApiBase();

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: "include",
      });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const payload = await response.json();
      setUser(payload);
    } catch (err) {
      setUser(null);
    }
  }, [apiBase]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, [apiBase]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      await refreshUser();
      if (active) {
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, logout, setUser }),
    [user, loading, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
