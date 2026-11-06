"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { StoreSettings } from "@/lib/app-platform/types";
import {
  Truck,
  Package,
  Globe,
  MapPin,
  Clock,
  Check,
  AlertCircle,
  Save,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";

export default function VendorShippingSettingsPage() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await platformApi.getVendorStore();
        setStore(data);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: any = {
        shipping_enabled: store.shipping_enabled,
        shipping_charge: Number(store.shipping_charge) || 0,
        free_shipping_min_order:
          store.free_shipping_min_order !== undefined && store.free_shipping_min_order !== null
            ? Number(store.free_shipping_min_order)
            : undefined,
        cod_charge: Number(store.cod_charge) || 0,
        estimated_delivery_days: store.estimated_delivery_days || "3-5 Business Days",
        allowed_countries: store.allowed_countries || "India",
        serviceable_pincodes_type: store.serviceable_pincodes_type || "all",
        serviceable_pincodes: store.serviceable_pincodes || "",
      };

      // Only include Shiprocket configuration if granted by Admin App Center
      if (store.shiprocket_enabled) {
        payload.shiprocket_email = store.shiprocket_email || "";
        payload.shiprocket_password = store.shiprocket_password || "";
        payload.shiprocket_auto_fulfill = store.shiprocket_auto_fulfill || false;
      }

      await platformApi.updateVendorStore(payload);
      setMessage({ type: "success", text: "Shipping rules & logistics settings saved successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update shipping settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const shippingCharge = Number(store?.shipping_charge) || 0;
  const freeShippingMov = Number(store?.free_shipping_min_order) || 0;
  const isShiprocketAllowed = Boolean(store?.shiprocket_enabled);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shipping & Delivery Settings</h1>
        <p className="text-sm text-slate-500">
          {isShiprocketAllowed
            ? "Set delivery fees, free delivery order thresholds (MOV), Shiprocket automation, and serviceable regions"
            : "Set delivery fees, free delivery order thresholds (MOV), and serviceable delivery regions"}
        </p>
      </div>

      {store?.hyperlocal_enabled && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">Hyperlocal Quick-Commerce Fulfillment is Active</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800 uppercase tracking-wide">
                Fulfillment Mode Active
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              To prevent delivery fee collisions and conflicting minimum order values (MOQ), standard courier shipping is currently disabled for your store. Delivery charges, serviceable radius, and order thresholds are controlled under Hyperlocal Delivery.
            </p>
            <Link
              href="/app/dashboard/hyperlocal"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors mt-3"
            >
              <span>Manage Hyperlocal Radius & Delivery Slabs</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. General Shipping & Rates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delivery Rates & Minimum Order Value (MOV)</h3>
                <p className="text-xs text-slate-500">
                  Configure your standard delivery fees and reward shoppers with free shipping
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={store?.shipping_enabled ?? true}
                onChange={(e) => setStore((prev) => (prev ? { ...prev, shipping_enabled: e.target.checked } : null))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Standard Shipping Fee (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={store?.shipping_charge ?? 0}
                onChange={(e) =>
                  setStore((prev) => (prev ? { ...prev, shipping_charge: parseFloat(e.target.value) || 0 } : null))
                }
                placeholder="e.g. 70"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Standard charge applied to customer orders below the free shipping threshold.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Free Shipping Threshold / MOV (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={store?.free_shipping_min_order ?? 999}
                onChange={(e) =>
                  setStore((prev) =>
                    prev ? { ...prev, free_shipping_min_order: parseFloat(e.target.value) || 0 } : null
                  )
                }
                placeholder="e.g. 999"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Orders equal to or above this value get FREE delivery. Set to 0 to make all deliveries free.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                COD Extra Handling Charge (₹ Optional)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={store?.cod_charge ?? 0}
                onChange={(e) =>
                  setStore((prev) => (prev ? { ...prev, cod_charge: parseFloat(e.target.value) || 0 } : null))
                }
                placeholder="e.g. 40 (0 for no extra charge)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Extra processing fee added only when a shopper selects Cash On Delivery.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Estimated Delivery Timeframe
              </label>
              <input
                type="text"
                value={store?.estimated_delivery_days || "3-5 Business Days"}
                onChange={(e) => setStore((prev) => (prev ? { ...prev, estimated_delivery_days: e.target.value } : null))}
                placeholder="e.g. 3-5 Business Days or 24-48 Hours"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Displayed to customers on product pages, checkout, and inside your Android mobile app.
              </p>
            </div>
          </div>

          {/* Customer Preview Pill */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-slate-600">
                Customer Storefront Preview:{" "}
                <strong className="text-slate-900">
                  {freeShippingMov > 0
                    ? `Standard Delivery ₹${shippingCharge} (FREE on orders above ₹${freeShippingMov})`
                    : shippingCharge === 0
                    ? "FREE Delivery on all orders"
                    : `Flat Delivery Fee: ₹${shippingCharge}`}
                </strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Active Rule
            </span>
          </div>
        </div>

        {/* 2. Shiprocket Logistics Integration (Strictly Hidden unless Activated by Super Admin) */}
        {isShiprocketAllowed && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Shiprocket Courier Automation</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">
                      Logistics Partner
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automate shipping labels, schedule courier pickups (Bluedart, Delhivery, DTDC), and live AWB tracking
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={store?.shiprocket_auto_fulfill || false}
                  onChange={(e) => setStore((prev) => (prev ? { ...prev, shiprocket_auto_fulfill: e.target.checked } : null))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Shiprocket Account Email
                  </label>
                  <input
                    type="email"
                    value={store?.shiprocket_email || ""}
                    onChange={(e) => setStore((prev) => (prev ? { ...prev, shiprocket_email: e.target.value } : null))}
                    placeholder="logistics@yourstore.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Shiprocket API Password / Token
                  </label>
                  <input
                    type="password"
                    value={store?.shiprocket_password || ""}
                    onChange={(e) => setStore((prev) => (prev ? { ...prev, shiprocket_password: e.target.value } : null))}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shiprocket_auto_fulfill"
                  checked={store?.shiprocket_auto_fulfill || false}
                  onChange={(e) =>
                    setStore((prev) => (prev ? { ...prev, shiprocket_auto_fulfill: e.target.checked } : null))
                  }
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="shiprocket_auto_fulfill" className="text-xs font-medium text-slate-700">
                  Automatically push confirmed orders to Shiprocket to request doorstep pickup
                </label>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-start gap-2.5 text-xs text-purple-900">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Encrypted Credential Storage:</strong> Your Shiprocket credentials are used only for generating
                  consignment waybills and live parcel tracking numbers.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Geographic & Pincode Restrictions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Geographic & Pincode Serviceability</h3>
              <p className="text-xs text-slate-500">
                Specify which countries and postal codes your store delivers to
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Allowed Delivery Countries
              </label>
              <input
                type="text"
                value={store?.allowed_countries || "India"}
                onChange={(e) => setStore((prev) => (prev ? { ...prev, allowed_countries: e.target.value } : null))}
                placeholder="e.g. India, United Arab Emirates, United States"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Separate multiple countries with commas (e.g. <code>India, UAE, USA</code>). Customers will only be able to select from these countries at checkout.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Postal Code / Pincode Serviceability
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="serviceable_pincodes_type"
                    value="all"
                    checked={(store?.serviceable_pincodes_type ?? "all") === "all"}
                    onChange={(e) =>
                      setStore((prev) => (prev ? { ...prev, serviceable_pincodes_type: e.target.value } : null))
                    }
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <strong>Deliver to all pincodes</strong> across allowed countries
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="serviceable_pincodes_type"
                    value="restricted"
                    checked={store?.serviceable_pincodes_type === "restricted"}
                    onChange={(e) =>
                      setStore((prev) => (prev ? { ...prev, serviceable_pincodes_type: e.target.value } : null))
                    }
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <strong>Restrict delivery to specific pincodes only</strong> (hyperlocal or selected courier zones)
                  </span>
                </label>
              </div>

              {store?.serviceable_pincodes_type === "restricted" && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Enter Serviceable Pincodes (comma-separated)
                  </label>
                  <textarea
                    rows={3}
                    value={store?.serviceable_pincodes || ""}
                    onChange={(e) => setStore((prev) => (prev ? { ...prev, serviceable_pincodes: e.target.value } : null))}
                    placeholder="e.g. 560038, 560001, 110001, 400050, 411001"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Shoppers entering pincodes outside this list will see an instant notification that shipping is not available in their zone.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Shipping Settings
          </button>
        </div>
      </form>
    </div>
  );
}

