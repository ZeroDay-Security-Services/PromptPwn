import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ppwn_token"));
  const [user, setUser] = useState(null); // { id, handle, points, labsSolved }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshMe = useCallback(async (t) => {
    const activeToken = t || token;
    if (!activeToken) { setLoading(false); return; }
    try {
      const me = await api.me(activeToken);
      setUser(me);
    } catch (err) {
      // Token invalid/expired — drop it.
      localStorage.removeItem("ppwn_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { refreshMe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signup = async (handle, email, password) => {
    setError(null);
    const res = await api.signup(handle, email, password);
    localStorage.setItem("ppwn_token", res.token);
    setToken(res.token);
    setUser({ id: res.user.id, handle: res.user.handle, points: res.user.points, labsSolved: 0 });
  };

  const login = async (handle, password) => {
    setError(null);
    const res = await api.login(handle, password);
    localStorage.setItem("ppwn_token", res.token);
    setToken(res.token);
    await refreshMe(res.token);
  };

  const logout = () => {
    localStorage.removeItem("ppwn_token");
    setToken(null);
    setUser(null);
  };

  const addPoints = (delta) => setUser(u => u ? { ...u, points: u.points + delta } : u);
  const bumpSolved = () => setUser(u => u ? { ...u, labsSolved: (u.labsSolved || 0) + 1 } : u);

  return (
    <AuthContext.Provider value={{ token, user, loading, error, signup, login, logout, refreshMe, addPoints, bumpSolved }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
