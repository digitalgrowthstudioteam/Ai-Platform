"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileNav } from "@/lib/app-platform/mobile-nav";
import {
  ShieldAlert,
  Users,
  CreditCard,
  PlusCircle,
  Smartphone,
  HardDrive,
  Sliders,
  FileText,
  BarChart3,
  TrendingUp,
  Layers,
  X,
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();

  const links = [
    { label: "Overview", href: "/app/admin", icon: BarChart3 },
    { label: "Platform Analytics", href: "/app/admin/analytics", icon: TrendingUp },
    { label: "Vendor Management", href: "/app/admin/vendors", icon: Users },
    { label: "App Center", href: "/app/admin/app-center", icon: Layers },
    { label: "Subscriptions & Plans", href: "/app/admin/subscriptions", icon: CreditCard },
    { label: "Add-on Services", href: "/app/admin/addons", icon: PlusCircle },
    { label: "Android App Builds", href: "/app/admin/app-configs", icon: Smartphone },
    { label: "Storage Tracking", href: "/app/admin/storage", icon: HardDrive },
    { label: "Platform Settings", href: "/app/admin/settings", icon: Sliders },
    { label: "Audit Logs", href: "/app/admin/audit-logs", icon: FileText },
  ];

  const renderNavBody = (onItemClick?: () => void) => (
    <div className="flex flex-col justify-between flex-1">
      <div className="p-4 space-y-6">
        {/* Admin Badge */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">Super Admin Console</p>
          <p className="text-[11px] text-purple-700 mt-0.5">Platform Operations & Governance</p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100">
        <Link
          href="/app/dashboard"
          onClick={onItemClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Switch to Vendor View
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
        {renderNavBody()}
      </aside>

      {/* Mobile Slide-Out Drawer & Backdrop */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
            onClick={close}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex md:hidden flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-slate-200">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Admin Console Menu
              </span>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavBody(close)}
          </aside>
        </>
      )}
    </>
  );
}

