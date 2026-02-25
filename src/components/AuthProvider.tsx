"use client";

import { createContext, useContext, useState } from "react";

interface AuthContextValue {
  user: { name: string } | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("dlcm_user");
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    // Simple demo auth; replace with real identity provider later
    if (username && password) {
      const u = { name: username };
      setUser(u);
      localStorage.setItem("dlcm_user", JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem("dlcm_user");
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
