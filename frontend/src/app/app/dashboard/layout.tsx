"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import VendorSidebar from "@/components/app-platform/layout/VendorSidebar";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo, resetDemoSandbox } = usePlatformAuth();
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
        {isDemo && (
          <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-amber-950">
                  Interactive Demo Store Sandbox
                </p>
                <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                  You are test-driving the vendor platform. Any changes you make (uploading products, moving photos, updating orders) are temporary and will not alter live stores.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={resetDemoSandbox}
                title="Reset sandbox to original clean state"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                Reset Sandbox
              </button>
              <Link
                href="/app/register"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-2xs"
              >
                Launch Real Store
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
