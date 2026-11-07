"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { Customer } from "@/lib/app-platform/types";
import { Users, Phone, Mail, ShoppingCart, DollarSign, Calendar } from "lucide-react";

export default function VendorCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await platformApi.getCustomers();
        setCustomers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Directory</h1>
        <p className="text-sm text-slate-500">View shoppers who have purchased from your online store or Android mobile application</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No customers yet. Customers will automatically be recorded when they place orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3.5 px-4 text-slate-500">{c.email || "—"}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{c.total_orders} orders</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">₹{c.total_spent.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : "—"}
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

