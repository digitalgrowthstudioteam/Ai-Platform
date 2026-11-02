"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { label: "Overview", href: "/app/admin", icon: BarChart3 },
    { label: "Vendor Management", href: "/app/admin/vendors", icon: Users },
    { label: "Subscriptions & Plans", href: "/app/admin/subscriptions", icon: CreditCard },
    { label: "Add-on Services", href: "/app/admin/addons", icon: PlusCircle },
    { label: "Android App Builds", href: "/app/admin/app-configs", icon: Smartphone },
    { label: "Storage Tracking", href: "/app/admin/storage", icon: HardDrive },
    { label: "Platform Settings", href: "/app/admin/settings", icon: Sliders },
    { label: "Audit Logs", href: "/app/admin/audit-logs", icon: FileText },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
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
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Switch to Vendor View
        </Link>
      </div>
    </aside>
  );
}

