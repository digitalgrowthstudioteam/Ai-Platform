"use client";

import React from "react";
import { AppPlatformAuthProvider } from "@/lib/app-platform/auth";
import { MobileNavProvider } from "@/lib/app-platform/mobile-nav";
import AppHeader from "@/components/app-platform/layout/AppHeader";

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPlatformAuthProvider>
      <MobileNavProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <AppHeader />
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </MobileNavProvider>
    </AppPlatformAuthProvider>
  );
}

