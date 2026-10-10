import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/me").then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => setUser((await api("/auth/login", { body: { email, password } })).user), []);
  const register = useCallback(async (form) => setUser((await api("/auth/register", { body: form })).user), []);
  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);
  const update = useCallback(async (patch) => setUser((await api("/me", { method: "PATCH", body: patch })).user), []);

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, update }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Preferred display currency: the account setting when logged in, else a local choice. */
export function useCurrency() {
  const { user, update } = useAuth();
  const [local, setLocal] = useState(() => {
    try { return localStorage.getItem("currency") || "USD"; } catch { return "USD"; }
  });
  const currency = user?.preferences?.currency || local;
  const setCurrency = (c) => {
    try { localStorage.setItem("currency", c); } catch { /* ignore */ }
    setLocal(c);
    if (user) update({ preferences: { currency: c } }).catch(() => {});
  };
  return [currency, setCurrency];
}
