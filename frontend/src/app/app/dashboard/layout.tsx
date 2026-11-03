"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { useMobileNav } from "@/lib/app-platform/mobile-nav";
import VendorSidebar from "@/components/app-platform/layout/VendorSidebar";
import SetupFeeGate from "@/components/app-platform/payments/SetupFeeGate";
import SubscriptionExpiredGate from "@/components/app-platform/payments/SubscriptionExpiredGate";
import { Sparkles, RefreshCw, ArrowRight, Menu } from "lucide-react";

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo, resetDemoSandbox } = usePlatformAuth();
  const { open: openMobileNav } = useMobileNav();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("dgs_platform_token");
      if (!token && !isDemo) {
        router.replace("/app/login");
        return;
      }
    }
    if (!loading && !user) {
      router.replace("/app/login");
    }
  }, [user, loading, router, isDemo]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Restrict access until one-time setup fee is cleared (paid or waived)
  if (user.role === "VENDOR_ADMIN" && user.setup_fee_cleared === false && !isDemo) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 min-h-[85vh]">
        <SetupFeeGate />
      </div>
    );
  }

  const isSubscriptionExpired = Boolean(
    user.role === "VENDOR_ADMIN" &&
    !isDemo &&
    user.setup_fee_cleared !== false &&
    (
      user.is_subscription_expired ||
      user.status === "inactive" ||
      user.status === "suspended" ||
      user.subscription_status === "inactive" ||
      user.subscription_status === "expired" ||
      user.subscription_status === "past_due"
    )
  );

  return (
    <div className="relative flex-1 flex flex-col md:flex-row min-h-screen">
      {/* Blurred Dashboard Body if Expired */}
      <div
        className={`flex-1 flex flex-col md:flex-row transition-all duration-300 ${
          isSubscriptionExpired ? "filter blur-md pointer-events-none select-none opacity-60" : ""
        }`}
      >
        <VendorSidebar />
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* Mobile Navigation Quick Bar */}
          <div className="md:hidden mb-4 flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {user?.store_name || "Store Dashboard"}
              </span>
            </div>
            <button
              type="button"
              onClick={openMobileNav}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Dashboard Menu</span>
            </button>
          </div>

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

      {/* Subscription Expired Modal Popup with Razorpay Renewal */}
      {isSubscriptionExpired && <SubscriptionExpiredGate />}
    </div>
  );
}
