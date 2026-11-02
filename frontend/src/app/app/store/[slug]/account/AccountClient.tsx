"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import {
  User,
  Package,
  Search,
  Phone,
  Clock,
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";

export default function AccountClient() {
  const params = useParams();
  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);

  const [config, setConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    async function loadConfig() {
      try {
        const cfg = await platformApi.getPublicStoreConfig(resolvedSlug);
        setConfig(cfg);
      } catch (e) {
        console.error("Failed to load store config:", e);
      } finally {
        setLoadingConfig(false);
      }
    }
    if (resolvedSlug) {
      loadConfig();
    }

    // Auto-search if previous phone number exists
    try {
      const savedPhone = localStorage.getItem("dgs_customer_phone");
      if (savedPhone) {
        setPhone(savedPhone);
        fetchOrders(savedPhone);
      }
    } catch (e) {}
  }, [slug]);

  const fetchOrders = async (phoneToSearch: string) => {
    if (!phoneToSearch || phoneToSearch.trim().length < 6) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const result = await platformApi.getPublicCustomerOrders(slug, phoneToSearch.trim());
      setOrders(result || []);
    } catch (e) {
      console.error("Failed to fetch customer orders:", e);
      setOrders([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(phone);
  };

  const primaryColor = config?.primary_color || "#2563EB";

  const getStatusBadge = (status: string) => {
    const s = (status || "NEW").toUpperCase();
    switch (s) {
      case "NEW":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">New Order</span>;
      case "CONFIRMED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">Confirmed</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Packed</span>;
      case "SHIPPED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Shipped</span>;
      case "DELIVERED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{s}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} backHref={getStoreHref(slug)} backLabel="Back to Store" />

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Account Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Customer Account & Order History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track and review all purchases placed with <strong>{config?.store_name}</strong>
            </p>
          </div>
          <Link
            href={getStoreHref(slug)}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Browse Catalog
          </Link>
        </div>

        {/* Lookup Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            Lookup Orders by Mobile Phone
          </h3>
          <p className="text-xs text-slate-500">
            Enter the 10-digit mobile number you used during checkout to view your real-time shipment updates.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 pt-1">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-blue-600 transition-colors"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Search className="w-4 h-4" />
              {searching ? "Finding Orders..." : "Find My Orders"}
            </button>
          </form>
        </div>

        {/* Orders Listing */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span>
                Found <strong>{orders.length}</strong> {orders.length === 1 ? "order" : "orders"} for phone: <strong className="font-mono">{phone}</strong>
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">No Orders Found</h3>
                <p className="text-xs text-slate-500">
                  No orders were found matching <strong className="font-mono">{phone}</strong> under {config?.store_name}. Please verify the phone number or place your first order.
                </p>
                <div className="pt-2">
                  <Link
                    href={getStoreHref(slug)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Start Shopping
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm font-mono">{ord.order_number}</span>
                          {getStatusBadge(ord.order_status)}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Placed on: {new Date(ord.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-blue-700 font-mono">
                          ₹{Number(ord.total_amount || 0).toLocaleString("en-IN")}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {ord.payment_method} ({ord.payment_status})
                        </p>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {(ord.items || []).map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 line-clamp-1">
                            {it.quantity}× {it.product_name}
                          </span>
                          <span className="font-mono text-slate-500">
                            ₹{it.total ? it.total.toLocaleString("en-IN") : (it.price * it.quantity).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 line-clamp-1">
                        Shipping to: {ord.customer_name} ({ord.shipping_address?.split("-")[0] || ord.shipping_address})
                      </span>
                      <Link
                        href={getStoreHref(slug, `/order/${ord.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                      >
                        <span>View Full Receipt & Tracking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}

