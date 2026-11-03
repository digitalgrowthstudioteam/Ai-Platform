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
  // Synchronously initialize user from cached session if available for instant 0ms load
  const [user, setUser] = useState<PlatformUser | null>(() => {
    if (typeof window === "undefined") return null;
    const isDemo = localStorage.getItem("dgs_platform_is_demo") === "true";
    if (isDemo) return DEMO_USER;
    const token = localStorage.getItem("dgs_platform_token");
    if (!token) return null;
    const cached = localStorage.getItem("dgs_platform_user");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  // If we already have a cached user, or if there is no token at all, loading is false immediately
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const token = localStorage.getItem("dgs_platform_token");
    if (!token) return false;
    const isDemo = localStorage.getItem("dgs_platform_is_demo") === "true";
    if (isDemo) return false;
    const cached = localStorage.getItem("dgs_platform_user");
    return !Boolean(cached);
  });

  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("dgs_platform_token") : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const isDemo = typeof window !== "undefined" && localStorage.getItem("dgs_platform_is_demo") === "true";
    if (isDemo) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    try {
      // Background revalidation with safe timeout
      const profile = await platformApi.getMe();
      if (typeof window !== "undefined") {
        localStorage.setItem("dgs_platform_user", JSON.stringify(profile));
      }
      setUser(profile);
    } catch (e: any) {
      console.warn("Platform session revalidation:", e?.message || e);
      const isAuthError =
        e?.status === 401 ||
        e?.message?.includes("401") ||
        e?.message?.includes("Unauthorized") ||
        e?.message?.includes("Account is disabled");

      if (isAuthError) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("dgs_platform_token");
          localStorage.removeItem("dgs_platform_user");
          localStorage.removeItem("dgs_platform_is_demo");
        }
        platformApi.logout();
        setUser(null);
      }
      // If it was just a temporary network timeout or cold start, keep the cached user session
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await platformApi.login({ email, password: pass });
    const initialProfile: PlatformUser = {
      user_id: res.user_id,
      email: res.email,
      name: res.name,
      role: res.role as "SUPER_ADMIN" | "VENDOR_ADMIN",
      vendor_id: res.vendor_id || undefined,
      vendor_code: res.vendor_code || undefined,
      store_slug: res.store_slug || undefined,
      status: "active",
      setup_fee_cleared: res.role === "SUPER_ADMIN" ? true : undefined,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("dgs_platform_user", JSON.stringify(initialProfile));
    }
    setUser(initialProfile);

    platformApi.getMe().then((fullProfile) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("dgs_platform_user", JSON.stringify(fullProfile));
      }
      setUser(fullProfile);
    }).catch((e) => console.warn("Background profile fetch:", e));

    if (res.role === "SUPER_ADMIN") {
      window.location.replace("/app/admin");
    } else {
      window.location.replace("/app/dashboard");
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
      const tokenRes = await platformApi.googleLogin(idToken);

      // Immediately establish authenticated session from token response
      const initialProfile: PlatformUser = {
        user_id: tokenRes.user_id,
        email: tokenRes.email,
        name: tokenRes.name,
        role: tokenRes.role as "SUPER_ADMIN" | "VENDOR_ADMIN",
        vendor_id: tokenRes.vendor_id || undefined,
        vendor_code: tokenRes.vendor_code || undefined,
        store_slug: tokenRes.store_slug || undefined,
        status: "active",
        setup_fee_cleared: tokenRes.role === "SUPER_ADMIN" ? true : undefined,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("dgs_platform_user", JSON.stringify(initialProfile));
      }
      setUser(initialProfile);

      // Non-blocking background revalidation
      platformApi.getMe().then((fullProfile) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("dgs_platform_user", JSON.stringify(fullProfile));
        }
        setUser(fullProfile);
      }).catch((e) => console.warn("Background profile fetch:", e));

      if (tokenRes.role === "SUPER_ADMIN") {
        window.location.replace("/app/admin");
      } else {
        window.location.replace("/app/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const enterDemoSandbox = () => {
    platformApi.setDemoMode(true);
    platformApi.resetDemo();
    if (typeof window !== "undefined") {
      localStorage.setItem("dgs_platform_user", JSON.stringify(DEMO_USER));
    }
    setUser(DEMO_USER);
    router.push("/app/dashboard");
  };

  const resetDemoSandbox = () => {
    platformApi.resetDemo();
    if (typeof window !== "undefined") {
      localStorage.setItem("dgs_platform_user", JSON.stringify(DEMO_USER));
      window.location.reload();
    }
  };

  const register = async (payload: any) => {
    platformApi.setDemoMode(false);
    await platformApi.register(payload);
    const profile = await platformApi.getMe();
    if (typeof window !== "undefined") {
      localStorage.setItem("dgs_platform_user", JSON.stringify(profile));
    }
    setUser(profile);
    router.push("/app/dashboard");
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dgs_platform_token");
      localStorage.removeItem("dgs_platform_user");
      localStorage.removeItem("dgs_platform_is_demo");
    }
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

