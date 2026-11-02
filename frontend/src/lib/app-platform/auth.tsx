"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PlatformUser } from "./types";
import { platformApi } from "./api";

interface PlatformAuthContextType {
  user: PlatformUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

export function AppPlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("dgs_platform_token") : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await platformApi.getMe();
      setUser(profile);
    } catch (e) {
      console.warn("Failed to fetch platform user session:", e);
      platformApi.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await platformApi.login({ email, password: pass });
    const profile = await platformApi.getMe();
    setUser(profile);
    if (profile.role === "SUPER_ADMIN") {
      router.push("/app/admin");
    } else {
      router.push("/app/dashboard");
    }
  };

  const register = async (payload: any) => {
    await platformApi.register(payload);
    const profile = await platformApi.getMe();
    setUser(profile);
    router.push("/app/dashboard");
  };

  const logout = () => {
    platformApi.logout();
    setUser(null);
    router.push("/app/login");
  };

  return (
    <PlatformAuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) {
    throw new Error("usePlatformAuth must be used within AppPlatformAuthProvider");
  }
  return ctx;
}

