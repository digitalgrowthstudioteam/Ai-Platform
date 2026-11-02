"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { Order } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  ShoppingCart,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  Check,
  X,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      await platformApi.updateOrderStatus(selectedOrder.id, { order_status: newStatus });
      setSelectedOrder((prev) => (prev ? { ...prev, order_status: newStatus as any } : null));
      load();
    } catch (err: any) {
      alert(err.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const statuses = ["ALL", "NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500">Track incoming customer orders, manage fulfillment, and update delivery status</p>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statuses.map((st) => {
          const isSelected = (st === "ALL" && !statusFilter) || statusFilter === st;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st === "ALL" ? "" : st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
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

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No orders found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-600">{ord.order_number}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{ord.customer_name}</p>
                      <p className="text-[11px] text-slate-400">{ord.customer_phone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{ord.items.length} items</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">₹{ord.total_amount.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {ord.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.order_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-blue-600">{selectedOrder.order_number}</span>
                <h3 className="text-lg font-bold text-slate-900">Order Details</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Customer & Shipping Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Phone:</span>
                  <span className="font-mono text-slate-700">{selectedOrder.customer_phone}</span>
                </div>
                {selectedOrder.customer_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email:</span>
                    <span className="text-slate-700">{selectedOrder.customer_email}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">Shipping Address:</span>
                  <p className="text-slate-800">{selectedOrder.shipping_address}</p>
                </div>
                {selectedOrder.notes && (
                  <div>
                    <span className="text-slate-500 font-medium block mb-0.5">Customer Notes:</span>
                    <p className="text-slate-600 italic">"{selectedOrder.notes}"</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Order Line Items</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div>
                        <p className="font-semibold text-slate-900">{it.product_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          SKU: {it.product_sku || "N/A"} • Qty: {it.quantity} × ₹{it.price}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">₹{it.total.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-bold">
                    <span>Total Amount</span>
                    <span className="text-blue-700 text-sm">₹{selectedOrder.total_amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Fulfillment Actions */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Update Fulfillment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus("CONFIRMED")}
                    disabled={updating || selectedOrder.order_status === "CONFIRMED"}
                    className="py-2 px-3 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-40"
                  >
                    Mark Confirmed
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("PROCESSING")}
                    disabled={updating || selectedOrder.order_status === "PROCESSING"}
                    className="py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
                  >
                    Mark Processing
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("SHIPPED")}
                    disabled={updating || selectedOrder.order_status === "SHIPPED"}
                    className="py-2 px-3 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-40"
                  >
                    Mark Shipped
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("DELIVERED")}
                    disabled={updating || selectedOrder.order_status === "DELIVERED"}
                    className="py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

