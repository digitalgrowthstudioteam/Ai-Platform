"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  LayoutDashboard,
  Store,
  Package,
  Layers,
  Image as ImageIcon,
  ShoppingCart,
  Users,
  CreditCard,
  Sparkles,
  Smartphone,
  ExternalLink,
} from "lucide-react";

export default function VendorSidebar() {
  const pathname = usePathname();
  const { user } = usePlatformAuth();

  const links = [
    { label: "Overview", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Store Profile", href: "/app/dashboard/store", icon: Store },
    { label: "Products", href: "/app/dashboard/products", icon: Package },
    { label: "Categories", href: "/app/dashboard/categories", icon: Layers },
    { label: "Banners", href: "/app/dashboard/banners", icon: ImageIcon },
    { label: "Orders", href: "/app/dashboard/orders", icon: ShoppingCart },
    { label: "Customers", href: "/app/dashboard/customers", icon: Users },
    { label: "Payment Settings", href: "/app/dashboard/payments", icon: CreditCard },
    { label: "Subscription & Add-ons", href: "/app/dashboard/subscription", icon: Sparkles },
    { label: "Android App Config", href: "/app/dashboard/app-config", icon: Smartphone },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Vendor Store Tag */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-800 truncate">{user?.store_name || "My Store"}</p>
          <p className="text-[11px] font-mono text-blue-600 mt-0.5 truncate">
            {user?.store_slug ? `${user.store_slug}.digitalgrowthstudio.in` : "Store setup"}
          </p>
          {user?.vendor_code && (
            <span className="inline-block mt-2 text-[10px] font-mono font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
              Vendor ID: {user.vendor_code}
            </span>
          )}
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
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
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

      {/* Store Preview Link */}
      {user?.store_slug && (
        <div className="p-4 border-t border-slate-100">
          <Link
            href={`/app/store/${user.store_slug}`}
            target="_blank"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Online Storefront
          </Link>
        </div>
      )}
    </aside>
  );
}

