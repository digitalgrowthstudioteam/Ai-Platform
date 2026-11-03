"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { useMobileNav } from "@/lib/app-platform/mobile-nav";
import AdminSidebar from "@/components/app-platform/layout/AdminSidebar";
import { Menu, Shield } from "lucide-react";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePlatformAuth();
  const { open: openMobileNav } = useMobileNav();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("dgs_platform_token");
      if (!token) {
        router.replace("/app/login");
        return;
      }
    }
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
      <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* Mobile Navigation Quick Bar */}
        <div className="md:hidden mb-4 flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              Super Admin Console
            </span>
          </div>
          <button
            type="button"
            onClick={openMobileNav}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Admin Menu</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

