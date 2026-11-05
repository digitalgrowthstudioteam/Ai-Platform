"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  MapPin,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function VendorHyperlocalPage() {
  const { user } = usePlatformAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    hyperlocal_enabled: true,
    hyperlocal_mode: "radius",
    store_latitude: "",
    store_longitude: "",
    store_location_name: "",
    max_delivery_radius_km: 10,
    min_order_value: 0,
    base_delivery_fee: 30,
    base_distance_km: 3,
    per_km_fee: 10,
    free_delivery_above: 499,
    estimated_delivery_mins: 45,
    serviceable_pincodes_type: "all",
    serviceable_pincodes: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await platformApi.getHyperlocalSettings();
        if (data) {
          setForm({
            hyperlocal_enabled: data.hyperlocal_enabled ?? true,
            hyperlocal_mode: data.hyperlocal_mode || "radius",
            store_latitude: data.store_latitude !== null && data.store_latitude !== undefined ? String(data.store_latitude) : "",
            store_longitude: data.store_longitude !== null && data.store_longitude !== undefined ? String(data.store_longitude) : "",
            store_location_name: data.store_location_name || "",
            max_delivery_radius_km: Number(data.max_delivery_radius_km) || 10,
            min_order_value: Number(data.min_order_value) || 0,
            base_delivery_fee: Number(data.base_delivery_fee) || 30,
            base_distance_km: Number(data.base_distance_km) || 3,
            per_km_fee: Number(data.per_km_fee) || 10,
            free_delivery_above: data.free_delivery_above ? Number(data.free_delivery_above) : 499,
            estimated_delivery_mins: Number(data.estimated_delivery_mins) || 45,
            serviceable_pincodes_type: data.serviceable_pincodes_type || "all",
            serviceable_pincodes: data.serviceable_pincodes || "",
          });
        }
      } catch (err: any) {
        console.error("Failed to load hyperlocal settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser." });
      return;
    }
    setDetectingGps(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          store_latitude: pos.coords.latitude.toFixed(6),
          store_longitude: pos.coords.longitude.toFixed(6),
        }));
        setDetectingGps(false);
        setMessage({
          type: "success",
          text: `GPS detected: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      (err) => {
        setDetectingGps(false);
        setMessage({
          type: "error",
          text: "Could not detect GPS location. Please allow location access or type coordinates manually.",
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      hyperlocal_enabled: form.hyperlocal_enabled,
      hyperlocal_mode: form.hyperlocal_mode,
      store_latitude: form.store_latitude ? parseFloat(form.store_latitude) : null,
      store_longitude: form.store_longitude ? parseFloat(form.store_longitude) : null,
      store_location_name: form.store_location_name.trim() || null,
      max_delivery_radius_km: Number(form.max_delivery_radius_km) || 10,
      min_order_value: Number(form.min_order_value) || 0,
      base_delivery_fee: Number(form.base_delivery_fee) || 0,
      base_distance_km: Number(form.base_distance_km) || 3,
      per_km_fee: Number(form.per_km_fee) || 0,
      free_delivery_above: form.free_delivery_above ? Number(form.free_delivery_above) : null,
      estimated_delivery_mins: Number(form.estimated_delivery_mins) || 45,
      serviceable_pincodes_type: form.serviceable_pincodes_type,
      serviceable_pincodes: form.serviceable_pincodes.trim() || null,
    };

    try {
      await platformApi.updateHyperlocalSettings(payload);
      setMessage({
        type: "success",
        text: "Hyperlocal delivery settings successfully updated! Changes are live across your mobile app and store.",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to save hyperlocal settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const isLocked = !user?.hyperlocal_enabled;

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-rose-600" />
              Hyperlocal Quick-Commerce & Local Delivery
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              Radius & Pincodes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deliver within a specific kilometer radius from your store or target specific customer pincodes with automated distance-slab fees.
          </p>
        </div>
      </div>

      {/* Admin Locked Banner */}
      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-bold">Hyperlocal Module Inactive</p>
            <p className="mt-0.5 text-amber-700">
              The Hyperlocal On-Demand Delivery module is currently inactive on your account. To activate local radius and instant delivery on your mobile app and storefront, please request activation from Platform Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Master Toggle & Mode */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Local Delivery Service Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">Toggle local on-demand fulfillment for incoming customer orders.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.hyperlocal_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, hyperlocal_enabled: e.target.checked }))}
                disabled={isLocked}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Delivery Eligibility Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "radius", title: "Radius (KM) Only", desc: "Customers within store GPS radius" },
                { id: "pincode", title: "Specific Pincodes", desc: "Whitelisted postal pincodes only" },
                { id: "both", title: "Radius + Pincode", desc: "Must be in radius AND in allowed pincodes" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, hyperlocal_mode: m.id }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    form.hyperlocal_mode === m.id
                      ? "border-rose-600 bg-rose-50/50 text-rose-900 ring-2 ring-rose-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold">{m.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Store Physical GPS Location */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-rose-600" />
                Store Origin GPS Coordinates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact geographic coordinates of your physical outlet or warehouse used to calculate distance to the customer.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDetectGps}
              disabled={detectingGps}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {detectingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>{detectingGps ? "Detecting..." : "Detect My Current Location"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Latitude (°)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 18.5204"
                value={form.store_latitude}
                onChange={(e) => setForm((prev) => ({ ...prev, store_latitude: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Longitude (°)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 73.8567"
                value={form.store_longitude}
                onChange={(e) => setForm((prev) => ({ ...prev, store_longitude: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Store Landmark / Area</label>
              <input
                type="text"
                placeholder="e.g. FC Road, Shivaji Nagar"
                value={form.store_location_name}
                onChange={(e) => setForm((prev) => ({ ...prev, store_location_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Radius & Pincode Boundaries */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-900">Service Coverage Boundaries</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control the max radius and specific postal codes you deliver to.</p>
          </div>

          {(form.hyperlocal_mode === "radius" || form.hyperlocal_mode === "both") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Max Delivery Radius (Kilometers)</label>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                  {form.max_delivery_radius_km} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={form.max_delivery_radius_km}
                onChange={(e) => setForm((prev) => ({ ...prev, max_delivery_radius_km: Number(e.target.value) }))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>1 km (Hyperlocal)</span>
                <span>15 km (Citywide)</span>
                <span>50 km (Metropolitan)</span>
              </div>
            </div>
          )}

          {(form.hyperlocal_mode === "pincode" || form.hyperlocal_mode === "both") && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Serviceable Pincodes (Comma-separated)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. 411001, 411002, 411004, 411038"
                value={form.serviceable_pincodes}
                onChange={(e) => setForm((prev) => ({ ...prev, serviceable_pincodes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[11px] text-slate-400">
                Customers entering a pincode outside this list will be prevented from placing hyperlocal delivery orders.
              </p>
            </div>
          )}
        </div>

        {/* Card 4: Distance-Slab Delivery Fees */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-900">Distance-Based Delivery Pricing Slabs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically charge a base fee up to a set distance, then an incremental fee per additional kilometer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Base Delivery Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={form.base_delivery_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, base_delivery_fee: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Base Distance (KM)</label>
              <input
                type="number"
                min="1"
                value={form.base_distance_km}
                onChange={(e) => setForm((prev) => ({ ...prev, base_distance_km: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Extra Fee Per KM (₹)</label>
              <input
                type="number"
                min="0"
                value={form.per_km_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, per_km_fee: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Free Delivery Above (₹)</label>
              <input
                type="number"
                min="0"
                value={form.free_delivery_above}
                onChange={(e) => setForm((prev) => ({ ...prev, free_delivery_above: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium">
              💡 Formula: ₹{form.base_delivery_fee} for the first {form.base_distance_km} km + ₹{form.per_km_fee}/km thereafter. Orders over ₹{form.free_delivery_above || "0"} get FREE delivery.
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || isLocked}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Hyperlocal Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

