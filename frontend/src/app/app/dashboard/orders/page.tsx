"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { Order } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  ShoppingCart,
  Eye,
  Truck,
  ExternalLink,
  Search,
} from "lucide-react";

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const load = async () => {
    try {
      const data = await platformApi.getOrders(statusFilter || undefined);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const statuses = ["ALL", "NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(q) ||
      (o.tracking_number && o.tracking_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500">
            Track customer orders, manage shipments, fetch tracking links, and update customers via WhatsApp
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
          {statuses.map((st) => {
            const isSelected = (st === "ALL" && !statusFilter) || statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st === "ALL" ? "" : st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Tracking & Courier</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <Link
                        href={`/app/dashboard/orders/${ord.id}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Open Dedicated Order Page"
                      >
                        {ord.order_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/app/dashboard/orders/${ord.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block"
                      >
                        {ord.customer_name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{ord.customer_phone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(ord.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {ord.items.length} {ord.items.length === 1 ? "item" : "items"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{ord.total_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      {ord.tracking_number ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Truck className="w-3 h-3 text-indigo-500" />
                            {ord.courier_name || "Dispatched"}: {ord.tracking_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Not Dispatched</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.order_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/app/dashboard/orders/${ord.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Manage Order & Tracking"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
