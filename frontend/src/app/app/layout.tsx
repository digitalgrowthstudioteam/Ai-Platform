"use client";

import React from "react";
import { AppPlatformAuthProvider } from "@/lib/app-platform/auth";
import AppHeader from "@/components/app-platform/layout/AppHeader";

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPlatformAuthProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <AppHeader />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </AppPlatformAuthProvider>
  );
}

