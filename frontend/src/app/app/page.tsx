"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { isSubdomainAccess, getStoreRouteParams } from "@/lib/app-platform/store-route-helper";

export default function PlatformRootPage() {
  const { user, loading } = usePlatformAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // 1. If on a brand subdomain, shoppers go straight to their store catalog
      if (typeof window !== "undefined" && isSubdomainAccess()) {
        const { slug } = getStoreRouteParams();
        router.replace(`/app/store/${slug}`);
        return;
      }

      // 2. SaaS platform navigation for vendors & admin
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

