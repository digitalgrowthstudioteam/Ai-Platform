"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { Order } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  ArrowLeft,
  Truck,
  Package,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Zap,
} from "lucide-react";

const COURIER_OPTIONS = [
  { name: "Delhivery", getUrl: (awb: string) => `https://www.delhivery.com/track/package/${awb}` },
  { name: "Shiprocket", getUrl: (awb: string) => `https://shiprocket.co/tracking/${awb}` },
  { name: "Blue Dart", getUrl: (awb: string) => `https://www.bluedart.com/tracking?trackFor=0&trackNo=${awb}` },
  { name: "DTDC", getUrl: (awb: string) => `https://www.dtdc.in/tracking/shipment-tracking.asp?tracking_no=${awb}` },
  { name: "India Post", getUrl: (_: string) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx` },
  { name: "Xpressbees", getUrl: (awb: string) => `https://www.xpressbees.com/shipment/tracking?awbNo=${awb}` },
  { name: "Shadowfax", getUrl: (awb: string) => `https://tracker.shadowfax.in/#/track?awb=${awb}` },
  { name: "Ekart Logistics", getUrl: (awb: string) => `https://ekartlogistics.com/shipmenttrack/${awb}` },
  { name: "Other / Custom", getUrl: (_: string) => "" },
];

export default function OrderDetailClient() {
  const params = useParams();
  const router = useRouter();

  // Resolve true order identifier from params or window.location.pathname
  const [orderIdentifier, setOrderIdentifier] = useState<string>(() => {
    let raw = (params?.id as string) || "";
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("orders");
      if (idx !== -1 && parts.length > idx + 1) {
        const fromPath = decodeURIComponent(parts[idx + 1]);
        if (fromPath && fromPath !== "placeholder") {
          raw = fromPath;
        }
      }
    }
    return raw;
  });

  const [order, setOrder] = useState<Order | null>(null);
  const [storeSlug, setStoreSlug] = useState<string>("abc");
  const [storeName, setStoreName] = useState<string>("Store");
  const [loading, setLoading] = useState(true);

  // Tracking Form State
  const [courierName, setCourierName] = useState<string>("Delhivery");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [trackingUrl, setTrackingUrl] = useState<string>("");
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Status & Alerts
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load order data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      let resolvedId = orderIdentifier;
      if (typeof window !== "undefined") {
        const parts = window.location.pathname.split("/").filter(Boolean);
        const idx = parts.indexOf("orders");
        if (idx !== -1 && parts.length > idx + 1) {
          const fromPath = decodeURIComponent(parts[idx + 1]);
          if (fromPath && fromPath !== "placeholder") {
            resolvedId = fromPath;
            setOrderIdentifier(fromPath);
          }
        }
      }

      if (!resolvedId || resolvedId === "placeholder") {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const [me, storeData] = await Promise.all([
          platformApi.getMe().catch(() => null),
          platformApi.getVendorStore().catch(() => null),
        ]);

        if (me?.store_slug) setStoreSlug(me.store_slug);
        if (storeData?.store_name) setStoreName(storeData.store_name);

        let ord: Order | null = null;
        try {
          ord = await platformApi.getOrder(resolvedId);
        } catch {
          const list = await platformApi.getOrders().catch(() => []);
          ord = list.find((o) => o.id === resolvedId || o.order_number === resolvedId) || null;
        }

        if (!isMounted) return;

        if (ord) {
          setOrder(ord);
          setCourierName(ord.courier_name || "Delhivery");
          setTrackingNumber(ord.tracking_number || "");
          setTrackingUrl(ord.tracking_url || "");
        } else {
          setMessage({ type: "error", text: "Order not found or access denied." });
        }
      } catch (err: any) {
        if (isMounted) {
          setMessage({ type: "error", text: err.message || "Failed to load order details" });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [orderIdentifier]);

  // Auto-generate or fetch tracking link when courier or tracking ID changes
  const handleAutoGenerateLink = () => {
    const awb = trackingNumber.trim();
    if (!awb) {
      alert("Please enter a Tracking ID / AWB Number first.");
      return;
    }
    const match = COURIER_OPTIONS.find((c) => c.name.toLowerCase() === courierName.toLowerCase());
    if (match && match.getUrl) {
      const generated = match.getUrl(awb);
      if (generated) {
        setTrackingUrl(generated);
        setMessage({ type: "success", text: `Fetched official tracking link for ${courierName}!` });
      } else {
        alert("Please enter your custom tracking URL manually for this courier.");
      }
    }
  };

  // Save Tracking ID & Link
  const handleSaveTracking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;

    const trimmedAwb = trackingNumber.trim();
    const trimmedUrl = trackingUrl.trim();

    if (!trimmedAwb && !trimmedUrl) {
      alert("Please provide at least a Tracking ID or a Tracking URL.");
      return;
    }

    setUpdatingTracking(true);
    setMessage(null);

    try {
      // Auto-set status to SHIPPED if not already Shipped/Delivered
      const nextStatus = order.order_status === "DELIVERED" ? "DELIVERED" : "SHIPPED";

      await platformApi.updateOrderStatus(order.id, {
        order_status: nextStatus,
        courier_name: courierName,
        tracking_number: trimmedAwb,
        tracking_url: trimmedUrl || (COURIER_OPTIONS.find((c) => c.name === courierName)?.getUrl(trimmedAwb) || ""),
      });

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              order_status: nextStatus,
              courier_name: courierName,
              tracking_number: trimmedAwb,
              tracking_url: trimmedUrl || (COURIER_OPTIONS.find((c) => c.name === courierName)?.getUrl(trimmedAwb) || ""),
            }
          : null
      );

      setMessage({
        type: "success",
        text: `Tracking ID and delivery partner updated successfully! Order marked as ${nextStatus}.`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update tracking details" });
    } finally {
      setUpdatingTracking(false);
    }
  };

  // Update Status Pill Action
  const handleUpdateStatus = async (newStatus: Order["order_status"]) => {
    if (!order) return;
    setUpdatingStatus(true);
    setMessage(null);
    try {
      await platformApi.updateOrderStatus(order.id, { order_status: newStatus });
      setOrder((prev) => (prev ? { ...prev, order_status: newStatus } : null));
      setMessage({ type: "success", text: `Order status updated to ${newStatus}` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update status" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Update Payment Status
  const handleUpdatePayment = async (newPayStatus: "PAID" | "PENDING") => {
    if (!order) return;
    setUpdatingStatus(true);
    setMessage(null);
    try {
      await platformApi.updateOrderStatus(order.id, { payment_status: newPayStatus });
      setOrder((prev) => (prev ? { ...prev, payment_status: newPayStatus } : null));
      setMessage({ type: "success", text: `Payment status updated to ${newPayStatus}` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update payment status" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Generate WhatsApp Share Message
  const getWhatsAppShareText = () => {
    if (!order) return "";
    const activeAwb = trackingNumber.trim() || order.tracking_number || "Available soon";
    const activeLink = trackingUrl.trim() || order.tracking_url || `https://digitalgrowthstudio.in/app/store/${storeSlug}/order/${order.order_number}`;
    const courier = courierName || order.courier_name || "Express Courier";

    return (
      `Hello ${order.customer_name}! 📦\n\n` +
      `Great news! Your order *#${order.order_number}* from *${storeName}* has been dispatched via *${courier}*.\n\n` +
      `🔹 *Tracking ID:* ${activeAwb}\n` +
      `🔗 *Live Tracking Link:*\n${activeLink}\n\n` +
      `💰 *Total Amount:* ₹${order.total_amount.toLocaleString("en-IN")} (${order.payment_method})\n\n` +
      `Thank you for shopping with us! If you have any questions, feel free to reply to this message.`
    );
  };

  // Open WhatsApp Link
  const handleShareOnWhatsApp = () => {
    if (!order) return;
    let cleanPhone = order.customer_phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const text = encodeURIComponent(getWhatsAppShareText());
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  // Copy tracking link
  const handleCopyLink = () => {
    const link = trackingUrl.trim() || order?.tracking_url || "";
    if (!link) {
      alert("No tracking link available yet. Please generate or enter one.");
      return;
    }
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copy full message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getWhatsAppShareText());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-sm text-slate-500">
          We could not locate this order in your catalog records.
        </p>
        <Link
          href="/app/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Link
            href="/app/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Orders
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-mono">
              {order.order_number}
            </h1>
            <StatusBadge status={order.order_status} />
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                order.payment_status === "PAID"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {order.payment_method} • {order.payment_status}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Placed on {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
            title="Print Order Receipt"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Receipt
          </button>
          <a
            href={`/app/store/${storeSlug}/order/${order.order_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 shadow-2xs transition-colors"
            title="Open customer order tracking page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Live Customer View
          </a>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center justify-between gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium text-xs sm:text-sm">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN SECTION: Shipping, Tracking ID & Share with User */}
      <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white rounded-3xl border-2 border-blue-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Courier Tracking & Shipment Details
              </h2>
              <p className="text-xs text-slate-500">
                Add the courier AWB, fetch official tracking URL, and share live updates directly with the customer.
              </p>
            </div>
          </div>

          {order.tracking_number && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tracking Active
            </span>
          )}
        </div>

        {/* Tracking Input Grid */}
        <form onSubmit={handleSaveTracking} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Courier Partner Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Courier / Delivery Partner
              </label>
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking ID / AWB Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tracking ID / AWB Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. 14325879001"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Auto Fetch Button */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleAutoGenerateLink}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Automatically generate tracking link for selected courier"
              >
                <Zap className="w-3.5 h-3.5" />
                Fetch / Generate Link
              </button>
            </div>
          </div>

          {/* Tracking URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Live Tracking URL (Provided to Customer)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-1"
                  title="Test link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test
                </a>
              )}
            </div>
          </div>

          {/* Save & Update Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Saving updates the order status to <strong>SHIPPED</strong> and publishes tracking to the customer.
            </span>
            <button
              type="submit"
              disabled={updatingTracking}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {updatingTracking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {updatingTracking ? "Saving Tracking..." : "Save Tracking & Mark Shipped"}
            </button>
          </div>
        </form>

        {/* CUSTOMER SHARING ACTIONS (Prominent WhatsApp & Copy Options) */}
        <div className="pt-4 border-t border-blue-200/60 bg-white/70 -mx-6 -mb-6 p-6 rounded-b-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Share Tracking Link With Customer
              </span>
              <p className="text-[11px] text-slate-500">
                Directly notify {order.customer_name} on WhatsApp or copy the tracking link for SMS/Email
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareOnWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Share on WhatsApp (+{order.customer_phone})
            </button>

            {/* Copy Tracking Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? "Link Copied!" : "Copy Tracking Link"}
            </button>

            {/* Copy Full Message */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Send className="w-3.5 h-3.5" />}
              {copiedMessage ? "Message Copied!" : "Copy Full SMS / WhatsApp Message"}
            </button>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: Fulfillment & Customer Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Status Controls & Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Fulfillment Status Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Fulfillment Controls
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus("CONFIRMED")}
                disabled={updatingStatus || order.order_status === "CONFIRMED"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
              >
                Mark Confirmed
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("PROCESSING")}
                disabled={updatingStatus || order.order_status === "PROCESSING"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
              >
                Mark Processing
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("SHIPPED")}
                disabled={updatingStatus || order.order_status === "SHIPPED"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition-colors"
              >
                Mark Shipped
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("DELIVERED")}
                disabled={updatingStatus || order.order_status === "DELIVERED"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
              >
                Mark Delivered
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to cancel this order?")) {
                    handleUpdateStatus("CANCELLED");
                  }
                }}
                disabled={updatingStatus || order.order_status === "CANCELLED"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 transition-colors"
              >
                Cancel Order
              </button>
            </div>
          </div>

          {/* Order Line Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Order Items ({order.items.length})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Payment: <strong className="text-slate-800">{order.payment_method}</strong>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((it) => (
                <div key={it.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 font-bold">
                      {it.quantity}×
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{it.product_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-mono text-[11px]">
                        {it.product_sku && <span>SKU: {it.product_sku}</span>}
                        <span>Qty: {it.quantity}</span>
                        <span>₹{it.price.toLocaleString("en-IN")} each</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{it.total.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="bg-slate-50/80 p-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Grand Total Amount</p>
                <p className="text-[11px] text-slate-400">Inclusive of items and any applicable shipping</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-slate-900">
                  ₹{order.total_amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Customer & Delivery Address Card */}
        <div className="space-y-6">
          {/* Customer Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
              Customer Information
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Customer Name</span>
                <p className="font-bold text-slate-900 text-sm">{order.customer_name}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold mb-1">Phone Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-800">{order.customer_phone}</span>
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleShareOnWhatsApp}
                    className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {order.customer_email && (
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-bold mb-0.5">Email</span>
                  <a
                    href={`mailto:${order.customer_email}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {order.customer_email}
                  </a>
                </div>
              )}

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold mb-1">
                  Delivery Address
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 leading-relaxed">
                  <p>{order.shipping_address}</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(order.shipping_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline mt-2"
                  >
                    <MapPin className="w-3 h-3" />
                    Open in Google Maps
                  </a>
                </div>
              </div>

              {order.notes && (
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-bold mb-1">Customer Note</span>
                  <p className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-slate-700 italic">
                    "{order.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
              Payment Status
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Current Status:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  order.payment_status === "PAID"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {order.payment_status}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleUpdatePayment("PAID")}
                disabled={updatingStatus || order.payment_status === "PAID"}
                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 disabled:opacity-40 transition-colors"
              >
                Mark as Paid
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePayment("PENDING")}
                disabled={updatingStatus || order.payment_status === "PENDING"}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 transition-colors"
              >
                Mark as Pending
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
