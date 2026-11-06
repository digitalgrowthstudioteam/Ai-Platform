"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppPlatformAuthProvider } from "@/lib/app-platform/auth";
import { MobileNavProvider } from "@/lib/app-platform/mobile-nav";
import AppHeader from "@/components/app-platform/layout/AppHeader";
import { isSubdomainAccess } from "@/lib/app-platform/store-route-helper";

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public shopping customers or landing page visitors NEVER see the SaaS admin header
  const isPublicMarketingOrStore =
    pathname.startsWith("/app/store") ||
    pathname.startsWith("/store") ||
    pathname.startsWith("/app/demoapp") ||
    (typeof window !== "undefined" && isSubdomainAccess());

  return (
    <AppPlatformAuthProvider>
      <MobileNavProvider>
        <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans ${
          pathname.startsWith("/app/demoapp") ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
        }`}>
          {!isPublicMarketingOrStore && <AppHeader />}
          <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">{children}</main>
        </div>
      </MobileNavProvider>
    </AppPlatformAuthProvider>
  );
}

