"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import AdminSidebar from "@/components/app-platform/layout/AdminSidebar";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePlatformAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/app/login");
      } else if (user.role !== "SUPER_ADMIN") {
        router.replace("/app/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

