import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../api";

type AuthContextValue = {
  token: string | null;
  user: api.Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = "granada.token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<api.Me | null>(null);
  const [loading, setLoading] = useState(true);

  const setTokenSafe = (value: string | null) => {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(value);
  };

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .me(token)
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        setTokenSafe(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login: async (email: string, password: string) => {
        const res = await api.login(email, password);
        setTokenSafe(res.token);
      },
      register: async (email: string, password: string, name: string) => {
        const res = await api.register(email, password, name);
        setTokenSafe(res.token);
      },
      logout: () => setTokenSafe(null)
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
