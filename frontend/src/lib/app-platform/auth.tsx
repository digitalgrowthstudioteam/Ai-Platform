"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PlatformUser } from "./types";
import { platformApi } from "./api";
import { DEMO_USER } from "./demo-sandbox";

interface PlatformAuthContextType {
  user: PlatformUser | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  enterDemoSandbox: () => void;
  resetDemoSandbox: () => void;
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

  const isDemo = typeof window !== "undefined" && localStorage.getItem("dgs_platform_is_demo") === "true";

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      platformApi.setDemoMode(false);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      await platformApi.googleLogin(idToken);
      const profile = await platformApi.getMe();
      setUser(profile);
      if (profile.role === "SUPER_ADMIN") {
        router.push("/app/admin");
      } else {
        router.push("/app/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const enterDemoSandbox = () => {
    platformApi.setDemoMode(true);
    platformApi.resetDemo();
    setUser(DEMO_USER);
    router.push("/app/dashboard");
  };

  const resetDemoSandbox = () => {
    platformApi.resetDemo();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const register = async (payload: any) => {
    platformApi.setDemoMode(false);
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
    <PlatformAuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        login,
        loginWithGoogle,
        enterDemoSandbox,
        resetDemoSandbox,
        register,
        logout,
        refreshUser,
      }}
    >
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

