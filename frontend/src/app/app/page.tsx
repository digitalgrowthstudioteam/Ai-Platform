"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { isSubdomainAccess, getStoreRouteParams } from "@/lib/app-platform/store-route-helper";

export default function PlatformRootPage() {
  const { user, loading } = usePlatformAuth();
  const router = useRouter();

  // Fast-path immediate redirect without waiting for network revalidation
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Subdomain brand storefront fast-path
    if (isSubdomainAccess()) {
      const { slug } = getStoreRouteParams();
      router.replace(`/app/store/${slug}`);
      return;
    }

    const token = localStorage.getItem("dgs_platform_token");
    if (!token) {
      router.replace("/app/login");
      return;
    }

    // 2. Cached user instant redirect (0ms)
    const cachedUserStr = localStorage.getItem("dgs_platform_user");
    if (cachedUserStr) {
      try {
        const cached = JSON.parse(cachedUserStr);
        if (cached?.role === "SUPER_ADMIN") {
          router.replace("/app/admin");
        } else {
          router.replace("/app/dashboard");
        }
        return;
      } catch {}
    }

    // 3. Fallback safeguard: Never leave user stuck on loader
    const fallbackTimer = setTimeout(() => {
      const liveToken = localStorage.getItem("dgs_platform_token");
      if (!liveToken) {
        window.location.replace("/app/login");
      } else {
        window.location.replace("/app/dashboard");
      }
    }, 1500);

    return () => clearTimeout(fallbackTimer);
  }, [router]);

  // Reactive redirect when auth state updates
  useEffect(() => {
    if (!loading) {
      if (typeof window !== "undefined" && isSubdomainAccess()) {
        const { slug } = getStoreRouteParams();
        router.replace(`/app/store/${slug}`);
        return;
      }

      if (!user) {
        router.replace("/app/login");
      } else if (user.role === "SUPER_ADMIN") {
        router.replace("/app/admin");
      } else {
        router.replace("/app/dashboard");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Digital Growth Studio Platform...</p>
      </div>
    </div>
  );
}

