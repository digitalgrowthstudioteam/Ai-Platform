"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "quotation" | "ad_pack" | "subscription";
  description: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  service_request_id?: string;
  items?: Array<{
    service_name: string;
    regular_price: number;
    offer_price: number;
    quantity?: number;
    validity_days?: number;
    service_type?: string;
  }>;
  email?: string;
  name?: string;
  phone?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [payingTxId, setPayingTxId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const data = await api.getUserBillingHistory();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to load billing history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Load Razorpay Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayQuotation = async (tx: Transaction) => {
    if (!tx.service_request_id) return;
    setPayingTxId(tx.id);
    try {
      // 1. Create billing checkout pack order
      const order = await api.purchaseAdsServicePack(tx.service_request_id);

      // If mock checkout, verify instantly
      if (order.is_mock) {
        await api.verifyAdsServicePayment(
          tx.service_request_id,
          order.order_id,
          "pay_mock_12345",
          "signature_mock_12345"
        );
        setNotification({
          type: "success",
          message: "Simulated payment verified successfully! Onboarding activated.",
        });
        await fetchBillingData();
        router.push("/dashboard/services");
        return;
      }

      // Live Razorpay payment flow
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setNotification({ type: "error", message: "Failed to load Razorpay Checkout script." });
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Digital Growth Studio",
        description: `Meta Ads Service Setup`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            setPayingTxId(tx.id);
            await api.verifyAdsServicePayment(
              tx.service_request_id!,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            setNotification({
              type: "success",
              message: "Payment verified successfully! Onboarding activated.",
            });
            await fetchBillingData();
            router.push("/dashboard/services");
          } catch (err: any) {
            setNotification({
              type: "error",
              message: "Payment verification failed. Please contact WhatsApp support.",
            });
          } finally {
            setPayingTxId(null);
          }
        },
        prefill: {
          email: tx.email || "",
          name: tx.name || "",
          contact: tx.phone || "",
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Quotation payment failed:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to initialize payment checkout.",
      });
    } finally {
      setPayingTxId(null);
    }
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
    pending: "bg-amber-50 text-amber-700 border-amber-100 animate-pulse",
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
    <div className="space-y-8 p-6 max-w-5xl mx-auto relative font-sans">
      {/* Top Banner Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold transition-all flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : notification.type === "warning"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="text-blue-600" size={28} /> Billing
          </h1>
          <p className="text-xs text-slate-500 font-semibold font-sans">
            View your complete payment history, check pending quotations, and make payments.
          </p>
        </div>
        <Link
          href="/get-ads?new=true"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/10 inline-flex items-center gap-1.5"
        >
          Purchase More Ads <ArrowRight size={14} />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="text-emerald-600" size={18} />
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Spent</span>
              <span className="text-xl font-black text-slate-900 font-sans">{formatCurrency(totalSpent)}</span>
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
              <span className="text-xl font-black text-slate-900 font-sans">{totalTransactions}</span>
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
              <span className="text-xl font-black text-slate-900 font-sans">{adPackCount}</span>
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
            href="/get-ads?new=true"
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
            {transactions.map((tx) => {
              const isExpanded = expandedTxId === tx.id;
              const isQuotation = tx.type === "quotation";

              return (
                <div key={`${tx.type}-${tx.id}`} className="transition-all">
                  {/* Summary Row */}
                  <button
                    onClick={() => {
                      if (isQuotation) {
                        setExpandedTxId(isExpanded ? null : tx.id);
                      }
                    }}
                    className={`w-full grid grid-cols-12 gap-4 px-5 py-4 text-xs items-center text-left ${
                      isQuotation ? "hover:bg-slate-50/50 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="col-span-1">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                        {typeIcons[tx.type]}
                      </div>
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">
                          {tx.description}
                          {isQuotation && (
                            <span className="ml-1 text-[10px] text-slate-450 font-bold font-mono">
                              ({tx.service_request_id ? "Custom Setup" : "Promo"})
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">
                          {typeLabels[tx.type]}
                        </span>
                      </div>
                      {isQuotation && (
                        <span className="text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-medium flex items-center gap-1 text-[10px]">
                        <Calendar size={10} className="text-slate-350" />
                        {new Date(tx.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-sans">
                      {tx.amount > 0 ? (
                        <span className="font-black text-slate-900 text-[11px] font-sans">
                          {formatCurrency(tx.amount)}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400 text-[10px]">—</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <span
                        className={`text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border inline-block ${
                          statusColors[tx.status] || "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Quotation Details & Payment Section */}
                  {isQuotation && isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/20 space-y-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                          Quotation Breakdown
                        </div>
                        {tx.items && tx.items.length > 0 ? (
                          <div className="space-y-2 text-[11px] font-medium leading-normal">
                            {tx.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start text-slate-600">
                                <div>
                                  <span className="font-bold block text-slate-800">{item.service_name}</span>
                                  {item.quantity && (
                                    <span className="text-[9px] text-slate-450 font-bold">Qty: {item.quantity} ads</span>
                                  )}
                                  {item.validity_days && (
                                    <span className="text-[9px] text-slate-450 font-bold ml-2">Validity: {item.validity_days} days</span>
                                  )}
                                </div>
                                <div className="text-right font-sans">
                                  {item.offer_price < item.regular_price ? (
                                    <>
                                      <span className="line-through text-slate-400 mr-1.5">{formatCurrency(item.regular_price)}</span>
                                      <span className="font-bold text-slate-800">{formatCurrency(item.offer_price)}</span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-slate-800">{formatCurrency(item.offer_price)}</span>
                                  )}
                                </div>
                              </div>
                            ))}

                            <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-bold text-slate-800 font-sans">
                              <span>Total Amount</span>
                              <span className="text-sm font-black text-blue-600 font-sans">{formatCurrency(tx.amount)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No breakdown details available.</p>
                        )}
                      </div>

                      {/* Pay Now Button */}
                      {tx.status === "pending" && (
                        <div className="flex justify-end pt-1">
                          <button
                            disabled={payingTxId === tx.id}
                            onClick={() => handlePayQuotation(tx)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-6 py-2.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer uppercase tracking-wider"
                          >
                            {payingTxId === tx.id ? (
                              <>
                                <Loader2 className="animate-spin" size={13} />
                                Processing checkout...
                              </>
                            ) : (
                              <>
                                Complete Payment ({formatCurrency(tx.amount)})
                                <ArrowRight size={13} />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
