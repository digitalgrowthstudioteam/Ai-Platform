"use client";

import React from "react";
import Link from "next/link";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  Store,
  ExternalLink,
  Shield,
  LogOut,
  Bell,
  Smartphone,
  ChevronDown,
} from "lucide-react";

export default function AppHeader() {
  const { user, logout } = usePlatformAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/app" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            D
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">Digital Growth Studio</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              SaaS App Platform
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === "VENDOR_ADMIN" && user.store_slug && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              {user.store_slug}.digitalgrowthstudio.in
            </span>
            <Link
              href={`/app/store/${user.store_slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View My Store
            </Link>
          </div>
        )}

        {user?.role === "SUPER_ADMIN" && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3.5 h-3.5" />
            Super Admin Control
          </span>
        )}

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || "User"}</p>
            <p className="text-[11px] text-slate-500 font-mono">{user?.vendor_code || user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

