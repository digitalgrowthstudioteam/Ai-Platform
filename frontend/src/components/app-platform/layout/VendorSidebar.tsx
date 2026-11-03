"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { useMobileNav } from "@/lib/app-platform/mobile-nav";
import {
  LayoutDashboard,
  Store,
  Package,
  Layers,
  Image as ImageIcon,
  ShoppingCart,
  Users,
  BarChart3,
  CreditCard,
  Truck,
  Sparkles,
  Smartphone,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";

export default function VendorSidebar() {
  const pathname = usePathname();
  const { user, isDemo } = usePlatformAuth();
  const { isOpen, close } = useMobileNav();

  const links = [
    { label: "Overview", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Store Profile", href: "/app/dashboard/store", icon: Store },
    { label: "Products", href: "/app/dashboard/products", icon: Package },
    { label: "Categories", href: "/app/dashboard/categories", icon: Layers },
    { label: "Banners", href: "/app/dashboard/banners", icon: ImageIcon },
    { label: "Orders", href: "/app/dashboard/orders", icon: ShoppingCart },
    { label: "Customers", href: "/app/dashboard/customers", icon: Users },
    { label: "Analytics & Pixels", href: "/app/dashboard/analytics", icon: BarChart3 },
    ...(!isDemo ? [{ label: "Payment Settings", href: "/app/dashboard/payments", icon: CreditCard }] : []),
    { label: "Shipping Settings", href: "/app/dashboard/shipping", icon: Truck },
    { label: "Legal & Policies", href: "/app/dashboard/policies", icon: FileText },
    { label: "Subscription & Add-ons", href: "/app/dashboard/subscription", icon: Sparkles },
    { label: "Android App Config", href: "/app/dashboard/app-config", icon: Smartphone },
  ];

  const renderNavBody = (onItemClick?: () => void) => (
    <div className="flex flex-col justify-between flex-1">
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
                onClick={onItemClick}
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
            onClick={onItemClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Online Storefront
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Hidden on Mobile) */}
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
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Store Dashboard Menu
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

