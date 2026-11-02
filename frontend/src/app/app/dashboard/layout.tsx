"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import VendorSidebar from "@/components/app-platform/layout/VendorSidebar";

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePlatformAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/app/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <VendorSidebar />
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

