"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { StoreSettings, VendorProfile } from "@/lib/app-platform/types";
import {
  Store,
  Palette,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  ExternalLink,
  Check,
  AlertCircle,
  Lock,
  Tag,
  CreditCard,
  Truck,
  MessageSquare,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function VendorStoreSettingsPage() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [storeData, profileData] = await Promise.all([
          platformApi.getVendorStore(),
          platformApi.getVendorProfile().catch(() => null),
        ]);
        setStore(storeData);
        setProfile(profileData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setStore((prev) => {
      if (!prev) return null;
      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        return { ...prev, [name]: checked };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updatedStore = await platformApi.updateVendorStore(store);
      setStore(updatedStore);

      if (profile) {
        const updatedProfile = await platformApi.updateVendorProfile({
          business_name: profile.business_name,
          owner_name: profile.owner_name,
          category: profile.category,
          whatsapp_number: profile.whatsapp_number,
          whatsapp_business_name: profile.whatsapp_business_name,
          business_phone: profile.business_phone,
          address: profile.address,
          description: profile.description,
        });
        setProfile(updatedProfile);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update store settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Profile & Settings</h1>
          <p className="text-sm text-slate-500">
            Configure your business details, branding, contacts, and storefront appearance
          </p>
        </div>
        {store?.store_slug && (
          <Link
            href={`/app/store/${store.store_slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-xs self-start sm:self-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview Online Store
          </Link>
        )}
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          Store profile & business details updated successfully!
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {error}
        </div>
      )}

      {/* Brand Name Permanent Lock Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Permanent Brand Name (Locked)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Verified
              </span>
            </div>
            <p className="text-lg font-black text-amber-900 font-mono mt-0.5">
              {profile?.brand_name || store?.store_name}
            </p>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Brand name was established during registration and cannot be modified once selected to protect your Android App package and certificates.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
        {/* Core Store & Business Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business / Store Display Name
            </label>
            <input
              type="text"
              name="store_name"
              value={store?.store_name || ""}
              onChange={handleStoreChange}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Subdomain (Assigned)
            </label>
            <input
              type="text"
              disabled
              value={store?.subdomain || ""}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Category & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Category
            </label>
            <select
              name="category"
              value={profile?.category || "Clothing & Apparel"}
              onChange={handleProfileChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Clothing & Apparel">Clothing & Apparel</option>
              <option value="Footwear & Shoes">Footwear & Shoes</option>
              <option value="Health, Beauty & Cosmetics">Health, Beauty & Cosmetics</option>
              <option value="Electronics & Mobile Accessories">Electronics & Mobile Accessories</option>
              <option value="Grocery, Gourmet & Food">Grocery, Gourmet & Food</option>
              <option value="Home, Living & Kitchen">Home, Living & Kitchen</option>
              <option value="Jewelry & Watches">Jewelry & Watches</option>
              <option value="General Retail">General Retail</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business WhatsApp Profile Name
            </label>
            <input
              type="text"
              name="whatsapp_business_name"
              value={profile?.whatsapp_business_name || ""}
              onChange={handleProfileChange}
              placeholder="e.g. ABC Fashion Support"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Store Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={store?.description || ""}
            onChange={handleStoreChange}
            placeholder="Tell customers about your brand and specialty..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Phone Numbers & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Number (Website)
            </label>
            <input
              type="text"
              name="contact_phone"
              value={store?.contact_phone || ""}
              onChange={handleStoreChange}
              placeholder="Shown on website header"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              WhatsApp Alert Number
            </label>
            <input
              type="text"
              name="whatsapp_number"
              value={profile?.whatsapp_number || store?.contact_phone || ""}
              onChange={handleProfileChange}
              placeholder="+91 9876543210"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Support Email
            </label>
            <input
              type="email"
              name="contact_email"
              value={store?.contact_email || ""}
              onChange={handleStoreChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Business Address & Opening Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Business Address
            </label>
            <textarea
              rows={2}
              name="business_address"
              value={store?.business_address || profile?.address || ""}
              onChange={(e) => {
                handleStoreChange(e);
                handleProfileChange(e);
              }}
              placeholder="Shop/Unit No, Street, City, State, PIN"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Hours
            </label>
            <input
              type="text"
              name="opening_hours"
              value={store?.opening_hours || ""}
              onChange={handleStoreChange}
              placeholder="e.g. Mon - Sat: 9:00 AM - 9:00 PM"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Logistics & Payment Setup Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">Payment Gateway Status: </span>
                <span className="font-semibold text-blue-700">
                  {profile?.has_payment_gateway === "Yes" ? "Configured / Active" : "Assisted (COD Default)"}
                </span>
              </div>
            </div>
            <Link
              href="/app/dashboard/payments"
              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              Configure Razorpay &rarr;
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Delivery Partner Assistance: </span>
              <span className="font-semibold text-blue-700">
                {profile?.needs_delivery_help === "Yes" ? "Assistance Requested" : "Self-Managed Delivery"}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Primary Brand Accent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="primary_color"
                value={store?.primary_color || "#2563EB"}
                onChange={handleStoreChange}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                name="primary_color"
                value={store?.primary_color || "#2563EB"}
                onChange={handleStoreChange}
                className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Secondary Brand Accent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="secondary_color"
                value={store?.secondary_color || "#1E293B"}
                onChange={handleStoreChange}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                name="secondary_color"
                value={store?.secondary_color || "#1E293B"}
                onChange={handleStoreChange}
                className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Store Profile & Settings
          </button>
        </div>
      </form>
    </div>
  );
}
