"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { SuperAdminOverview, VendorListItem } from "@/lib/app-platform/types";
import StatCard from "@/components/app-platform/shared/StatCard";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Users,
  CreditCard,
  ShoppingCart,
  Package,
  HardDrive,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function SuperAdminOverviewPage() {
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [recentVendors, setRecentVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowServerNotice, setSlowServerNotice] = useState(false);

  useEffect(() => {
    // 1. Instant Cache: Load previously loaded overview immediately
    let hasCache = false;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("dgs_admin_overview_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.stats) {
            setOverview(parsed.stats);
            setRecentVendors(parsed.vendors || []);
            setLoading(false);
            hasCache = true;
          }
        } catch (e) {}
      }
    }

    const timer = setTimeout(() => {
      setSlowServerNotice(true);
    }, 2800);

    async function load() {
      if (!hasCache) {
        setLoading(true);
      }
      try {
        const [stats, vendors] = await Promise.all([
          platformApi.getSuperAdminOverview(),
          platformApi.getAdminVendors(),
        ]);
        setOverview(stats);
        const top5 = vendors.slice(0, 5);
        setRecentVendors(top5);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("dgs_admin_overview_cache", JSON.stringify({ stats, vendors: top5 }));
        }
      } catch (e) {
        console.error("Failed to load admin overview:", e);
      } finally {
        clearTimeout(timer);
        setLoading(false);
        setSlowServerNotice(false);
      }
    }
    load();

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
        {slowServerNotice && (
          <div className="text-center space-y-1 animate-pulse">
            <p className="text-xs font-semibold text-slate-700">Connecting to secure management server...</p>
            <p className="text-[11px] text-slate-400">Loading platform metrics and vendors</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Welcome Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 mb-2">
            Super Admin Control Center
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Platform Performance & Governance</h1>
          <p className="mt-1 text-sm text-purple-200">
            Monitor vendor storefronts, subscriptions, storage limits, and Android app build lifecycles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/admin/vendors"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-900 font-semibold text-xs shadow-xs hover:bg-purple-50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Vendors
          </Link>
          <Link
            href="/app/admin/app-configs"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 text-white font-semibold text-xs border border-white/20 transition-colors"
          >
            Developer App Tracker
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`₹${(overview?.total_mrr_inr || 0).toLocaleString("en-IN")}`}
          subtitle="From active vendor memberships"
          icon={CreditCard}
          trend={{ value: "+28% MoM", isPositive: true }}
          accentColor="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          title="Total Vendors"
          value={overview?.total_vendors || 0}
          subtitle={`${overview?.active_vendors || 0} active • ${overview?.trial_vendors || 0} trial • ${overview?.inactive_vendors || 0} inactive`}
          icon={Users}
          accentColor="text-purple-600 bg-purple-50"
        />
        <StatCard
          title="Total Platform Orders"
          value={overview?.total_orders_all_vendors || 0}
          subtitle="Across all vendor storefronts & apps"
          icon={ShoppingCart}
          accentColor="text-blue-600 bg-blue-50"
        />
        <StatCard
          title="Total Catalog Products"
          value={overview?.total_products_all_vendors || 0}
          subtitle={`Consuming ${overview?.total_storage_used_mb || 0} MB storage`}
          icon={Package}
          accentColor="text-indigo-600 bg-indigo-50"
        />
      </div>

      {/* Vendor Status Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Active Vendors</span>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{overview?.active_vendors || 0}</p>
          </div>
          <UserCheck className="w-8 h-8 text-emerald-500/20" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Trial Vendors</span>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{overview?.trial_vendors || 0}</p>
          </div>
          <Clock className="w-8 h-8 text-blue-500/20" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Expired Subscriptions</span>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{overview?.expired_subscriptions || 0}</p>
          </div>
          <UserX className="w-8 h-8 text-rose-500/20" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">New This Month</span>
            <p className="text-xl font-bold text-purple-600 mt-0.5">{overview?.new_registrations_this_month || 0}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-500/20" />
        </div>
      </div>

      {/* Recent Registered Vendors */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Vendor Registrations</h3>
            <p className="text-xs text-slate-500">Newly onboarded store owners and their deployment status</p>
          </div>
          <Link
            href="/app/admin/vendors"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            View all vendors
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Vendor ID</th>
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Subdomain</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Android App</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{v.vendor_code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{v.business_name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{v.subdomain}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-slate-800">{v.owner_name}</p>
                    <p className="text-[11px] text-slate-400">{v.email}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{v.plan_name}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={v.app_build_status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href="/app/admin/vendors"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

