"use client";

import React from "react";
import Link from "next/link";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { getStoreHref } from "@/lib/app-platform/store-route-helper";
import {
  ShoppingCart,
  User,
  Truck,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface StoreHeaderProps {
  slug: string;
  config: any;
  backHref?: string;
  backLabel?: string;
}

export default function StoreHeader({
  slug,
  config,
  backHref,
  backLabel,
}: StoreHeaderProps) {
  const { itemCount } = useVendorCart(slug);
  const primaryColor = config?.primary_color || "#2563EB";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Value Proposition Bar */}
      <div className="bg-slate-900 text-slate-200 text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {config?.free_shipping_min_order && config.free_shipping_min_order > 0 ? (
              <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                <Truck className="w-3 h-3 text-blue-400" />
                Free Delivery on orders above ₹{config.free_shipping_min_order}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Cash on Delivery Available
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Est. Delivery: {config?.estimated_delivery_days || "3-5 Business Days"}
            </span>
            {config?.contact_phone && (
              <span>Help: {config.contact_phone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Storefront Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors mr-1"
              title={backLabel || "Go back"}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}

          <Link href={getStoreHref(slug)} className="flex items-center gap-3 group">
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.store_name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:scale-105 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                {config?.store_name ? config.store_name[0] : "S"}
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                {config?.store_name || "Online Store"}
              </h1>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {config?.description || "Official Online Storefront"}
              </p>
            </div>
          </Link>
        </div>

        {/* Action Buttons: Account & Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={getStoreHref(slug, "/account")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">My Account</span>
          </Link>

          <Link
            href={getStoreHref(slug, "/cart")}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 ? (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-black rounded-full bg-white text-slate-900 shadow-xs">
                {itemCount}
              </span>
            ) : (
              <span className="text-[11px] opacity-80">(0)</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

