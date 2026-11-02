"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { VendorOverview, Order } from "@/lib/app-platform/types";
import StatCard from "@/components/app-platform/shared/StatCard";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Package,
  ShoppingCart,
  DollarSign,
  HardDrive,
  Users,
  Store,
  ExternalLink,
  Smartphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function VendorDashboardOverviewPage() {
  const [overview, setOverview] = useState<VendorOverview | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [stats, orders] = await Promise.all([
          platformApi.getVendorOverview(),
          platformApi.getOrders(),
        ]);
        setOverview(stats);
        setRecentOrders(orders.slice(0, 5));
      } catch (e) {
        console.error("Failed to load overview data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const storageUsedMb = overview ? (overview.storage_used_bytes / (1024 * 1024)).toFixed(1) : "0";
  const storageLimitMb = overview ? (overview.storage_limit_bytes / (1024 * 1024)).toFixed(0) : "1024";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30 mb-2">
            Vendor Portal • ID: {overview?.vendor_code}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome to {overview?.store_name}</h1>
          <p className="mt-1 text-sm text-blue-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-300" />
            Subdomain: <span className="font-mono text-white font-medium">{overview?.subdomain}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {overview?.store_slug && (
            <Link
              href={`/app/store/${overview.store_slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-xs shadow-xs hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Online Store
            </Link>
          )}
          <Link
            href="/app/dashboard/app-config"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/30 hover:bg-blue-500/40 text-white font-semibold text-xs border border-white/20 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Android App
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={overview?.total_products || 0}
          subtitle={`${overview?.active_products || 0} active • ${overview?.out_of_stock_products || 0} out of stock`}
          icon={Package}
          accentColor="text-blue-600 bg-blue-50"
        />
        <StatCard
          title="Total Orders"
          value={overview?.total_orders || 0}
          subtitle={`${overview?.pending_orders || 0} pending • ${overview?.completed_orders || 0} delivered`}
          icon={ShoppingCart}
          accentColor="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          title="Total Sales"
          value={`₹${(overview?.total_sales_inr || 0).toLocaleString("en-IN")}`}
          subtitle={`${overview?.total_customers || 0} unique customers`}
          icon={DollarSign}
          accentColor="text-indigo-600 bg-indigo-50"
        />
        <StatCard
          title="Bunny.net Storage"
          value={`${storageUsedMb} MB`}
          subtitle={`Limit: ${storageLimitMb} MB (${overview?.storage_percentage || 0}%)`}
          icon={HardDrive}
          accentColor="text-amber-600 bg-amber-50"
        />
      </div>

      {/* Quick Action Grid & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Customer Orders</h3>
              <p className="text-xs text-slate-500">Live order feed from your store and Android mobile app</p>
            </div>
            <Link
              href="/app/dashboard/orders"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No orders placed yet. Once customers order through your store or Android app, they will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-3 font-semibold">Order #</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Items</th>
                    <th className="pb-3 font-semibold">Total</th>
                    <th className="pb-3 font-semibold">Payment</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-mono font-medium text-blue-600">{ord.order_number}</td>
                      <td className="py-3">
                        <p className="font-semibold text-slate-800">{ord.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{ord.customer_phone}</p>
                      </td>
                      <td className="py-3 text-slate-600">{ord.items.length} items</td>
                      <td className="py-3 font-semibold text-slate-900">₹{ord.total_amount.toLocaleString("en-IN")}</td>
                      <td className="py-3">
                        <span className="font-mono text-[11px] text-slate-600">{ord.payment_method}</span>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={ord.order_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subscription & Store Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Store Status & Plan</h3>
            <p className="text-xs text-slate-500 mb-4">Your membership tier and cloud storage</p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Plan</span>
                <span className="font-bold text-slate-900">{overview?.subscription_plan}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={overview?.subscription_status || "active"} />
              </div>
              {overview?.subscription_renewal_date && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Next Renewal</span>
                  <span className="text-slate-700 font-mono">
                    {new Date(overview.subscription_renewal_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Storage Progress */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Bunny Storage Quota</span>
                <span className="font-bold text-slate-900">{overview?.storage_percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(overview?.storage_percentage || 0, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {storageUsedMb} MB used of {storageLimitMb} MB limit
              </p>
            </div>
          </div>

          <Link
            href="/app/dashboard/subscription"
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Manage Plan & Add-ons
          </Link>
        </div>
      </div>
    </div>
  );
}

