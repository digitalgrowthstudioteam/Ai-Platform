"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Receipt,
  Loader2,
  ArrowRight,
  CreditCard,
  Megaphone,
  Crown,
  FileText,
  Calendar,
  ArrowDownCircle,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "quotation" | "ad_pack" | "subscription";
  description: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadBilling() {
      try {
        setLoading(true);
        const data = await api.getUserBillingHistory();
        setTransactions(data.transactions || []);
      } catch (err) {
        console.error("Failed to load billing history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBilling();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    quotation: <FileText size={16} className="text-blue-600" />,
    ad_pack: <Megaphone size={16} className="text-emerald-600" />,
    subscription: <Crown size={16} className="text-amber-600" />,
  };

  const typeLabels: Record<string, string> = {
    quotation: "Quotation",
    ad_pack: "Ad Pack",
    subscription: "Subscription",
  };

  const statusColors: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    expired: "bg-slate-100 text-slate-500 border-slate-200",
    cancelled: "bg-rose-50 text-rose-600 border-rose-100",
    trialing: "bg-blue-50 text-blue-700 border-blue-100",
  };

  // Summary stats
  const totalSpent = transactions
    .filter((t) => t.status === "paid" || t.status === "active")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;
  const adPackCount = transactions.filter((t) => t.type === "ad_pack").length;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="text-blue-600" size={28} /> Billing
          </h1>
          <p className="text-xs text-slate-500 font-semibold">View your complete payment and transaction history.</p>
        </div>
        <Link
          href="/get-ads"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/10 inline-flex items-center gap-1.5"
        >
          Purchase More Ads <ArrowRight size={14} />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="text-emerald-600" size={18} />
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Spent</span>
              <span className="text-xl font-black text-slate-900">{formatCurrency(totalSpent)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownCircle className="text-blue-600" size={18} />
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Transactions</span>
              <span className="text-xl font-black text-slate-900">{totalTransactions}</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Megaphone className="text-amber-600" size={18} />
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Ad Packs Purchased</span>
              <span className="text-xl font-black text-slate-900">{adPackCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      {transactions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <Receipt className="mx-auto text-slate-300" size={48} />
          <p className="text-sm text-slate-400 font-semibold">No billing history yet.</p>
          <Link
            href="/get-ads"
            className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 items-center gap-1.5"
          >
            Get Your First Ads <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">Type</div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div
                key={`${tx.type}-${tx.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-slate-50/30 transition text-xs items-center"
              >
                <div className="col-span-1">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    {typeIcons[tx.type]}
                  </div>
                </div>
                <div className="col-span-5">
                  <span className="font-bold text-slate-800 block text-[11px]">{tx.description}</span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">{typeLabels[tx.type]}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-medium flex items-center gap-1 text-[10px]">
                    <Calendar size={10} className="text-slate-350" />
                    {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  {tx.amount > 0 ? (
                    <span className="font-black text-slate-900 text-[11px]">{formatCurrency(tx.amount)}</span>
                  ) : (
                    <span className="font-medium text-slate-400 text-[10px]">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border inline-block ${
                      statusColors[tx.status] || "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
