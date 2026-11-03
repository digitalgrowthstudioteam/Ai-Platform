"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppPlatformAuthProvider } from "@/lib/app-platform/auth";
import { MobileNavProvider } from "@/lib/app-platform/mobile-nav";
import AppHeader from "@/components/app-platform/layout/AppHeader";
import { isSubdomainAccess } from "@/lib/app-platform/store-route-helper";

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public shopping customers on store pages or brand subdomains NEVER see the SaaS admin header
  const isPublicStorefront =
    pathname.startsWith("/app/store") ||
    pathname.startsWith("/store") ||
    (typeof window !== "undefined" && isSubdomainAccess());

  return (
    <AppPlatformAuthProvider>
      <MobileNavProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          {!isPublicStorefront && <AppHeader />}
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </MobileNavProvider>
    </AppPlatformAuthProvider>
  );
}

