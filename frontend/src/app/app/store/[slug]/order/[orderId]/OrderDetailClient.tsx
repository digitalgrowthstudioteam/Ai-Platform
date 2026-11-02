"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import { getStoreRouteParams } from "@/lib/app-platform/store-route-helper";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Clock,
  Phone,
  Mail,
  Copy,
  Check,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

export default function OrderDetailClient() {
  const params = useParams();
  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);
  const [orderId, setOrderId] = useState<string>(() => getStoreRouteParams(params as any).orderId);

  const [order, setOrder] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const { slug: s, orderId: oId } = getStoreRouteParams(params as any);
    setSlug(s);
    setOrderId(oId);

    async function loadData() {
      if (!s || !oId || oId === "sample") {
        setLoading(false);
        return;
      }
      try {
        const [ord, cfg] = await Promise.all([
          platformApi.getPublicStoreOrder(s, oId),
          platformApi.getPublicStoreConfig(s),
        ]);
        setOrder(ord);
        setConfig(cfg);
      } catch (e) {
        console.error("Failed to load order:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params]);

  const handleCopy = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const primaryColor = config?.primary_color || "#2563EB";

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <StoreHeader slug={slug} config={config} />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4 flex-1">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
          <p className="text-xs text-slate-500">
            We could not locate this order under <strong>{config?.store_name}</strong>. Please check your order ID or sign into your customer account.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href={`/app/store/${slug}/account`}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Check My Account
            </Link>
            <Link
              href={`/app/store/${slug}`}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              Back to Store
            </Link>
          </div>
        </main>
        <StoreFooter slug={slug} config={config} />
      </div>
    );
  }

  // Status mapping
  const statusSteps = [
    { key: "NEW", label: "Order Placed" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PROCESSING", label: "Packed" },
    { key: "SHIPPED", label: "Out for Delivery" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  const currentStatus = (order.order_status || "NEW").toUpperCase();
  const currentStepIdx = statusSteps.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentStepIdx === -1 ? 0 : currentStepIdx;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} />

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Success Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-4 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thank You For Your Order!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your order has been placed with <strong>{config?.store_name}</strong> and is being prepared for dispatch.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            <span className="text-slate-500">Order Reference:</span>
            <strong className="text-blue-700">{order.order_number}</strong>
            <button
              onClick={handleCopy}
              className="ml-1 text-slate-400 hover:text-slate-600 p-1"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Order Status Progress Tracker */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            Live Shipment Status
          </h3>

          <div className="relative pt-2 pb-4">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, idx) => {
                const isPassed = idx <= activeIdx;
                const isCurrent = idx === activeIdx;
                return (
                  <div key={step.key} className="flex-1 text-center relative">
                    <div className="flex items-center justify-center mb-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors z-10 ${
                          isPassed
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                    </div>
                    <p
                      className={`text-[11px] font-semibold ${
                        isCurrent
                          ? "text-blue-700 font-bold"
                          : isPassed
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Estimated Delivery: <strong>{config?.estimated_delivery_days || "3-5 Business Days"}</strong>
            </span>
            <span className="font-semibold text-slate-600">
              Payment: <strong>{order.payment_method}</strong> ({order.payment_status})
            </span>
          </div>

          {order.tracking_number && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Dispatched via {order.courier_name || "Express Courier"}
                </span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                  AWB / Tracking ID: <span className="text-emerald-700">{order.tracking_number}</span>
                </p>
              </div>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Track Live Shipment
                </a>
              )}
            </div>
          )}
        </div>

        {/* Two-Column Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Customer & Address Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-blue-600" />
              Delivery Destination
            </h3>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-900 text-sm">{order.customer_name}</p>
              <p className="flex items-center gap-1.5 text-slate-700 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {order.customer_phone}
              </p>
              {order.customer_email && (
                <p className="flex items-center gap-1.5 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer_email}
                </p>
              )}
              <div className="pt-2 text-slate-800 font-medium">
                {order.shipping_address}
              </div>
            </div>

            {order.notes && (
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Order Note:</span> {order.notes}
              </div>
            )}
          </div>

          {/* Items & Payment Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Package className="w-4 h-4 text-blue-600" />
              Items In This Order
            </h3>

            <div className="space-y-3 divide-y divide-slate-100">
              {(order.items || []).map((it: any) => (
                <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{it.product_name}</p>
                    {it.variant_name && (
                      <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium border border-purple-200 inline-block mt-0.5">
                        Variant: {it.variant_name}
                      </span>
                    )}
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Qty: {it.quantity} × ₹{it.price}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{it.total ? it.total.toLocaleString("en-IN") : (it.price * it.quantity).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Payment Method:</span>
                <span className="font-semibold text-slate-900">{order.payment_method}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Payment Status:</span>
                <span className={`font-semibold ${order.payment_status === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                  {order.payment_status}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-blue-700 font-mono text-lg">
                  ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
          <Link
            href={`/app/store/${slug}`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs text-center"
            style={{ backgroundColor: primaryColor }}
          >
            ← Return to Storefront
          </Link>
          <Link
            href={`/app/store/${slug}/account`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 text-center flex items-center justify-center gap-1.5"
          >
            <span>View All My Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}

