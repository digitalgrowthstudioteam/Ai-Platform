"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { Plan, PlatformCouponItem } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  HardDrive,
  Package,
  Tag,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    monthly_price_inr: "499",
    setup_fee_inr: "2000",
    setup_fee_sale_price_inr: "999",
    storage_limit_mb: "1024",
    max_products: "100",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Coupon state
  const [coupons, setCoupons] = useState<PlatformCouponItem[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_type: "FIXED_INR" as "FIXED_INR" | "PERCENTAGE",
    discount_value: "500",
    valid_days: "30",
    applicable_to: "SETUP_FEE" as "SETUP_FEE" | "ADDON_ALL" | "SPECIFIC_ADDON",
    addon_id: "",
    vendor_id: "",
    max_uses: "100",
    one_time_per_vendor: true,
  });
  const [submittingCoupon, setSubmittingCoupon] = useState(false);

  const loadPlans = async () => {
    try {
      const data = await platformApi.getAdminPlans();
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCoupons = async () => {
    try {
      setCouponsLoading(true);
      const [couponsData, addonsData] = await Promise.all([
        platformApi.getAdminCoupons(),
        platformApi.getAdminAddons().catch(() => []),
      ]);
      setCoupons(couponsData);
      setAvailableAddons(addonsData);
      if (addonsData.length > 0 && !couponForm.addon_id) {
        setCouponForm((prev) => ({ ...prev, addon_id: addonsData[0].id }));
      }
    } catch (e) {
      console.error("Failed to load coupons", e);
    } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    loadCoupons();
  }, []);

  const openAdd = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      slug: "",
      monthly_price_inr: "499",
      setup_fee_inr: "2000",
      setup_fee_sale_price_inr: "999",
      storage_limit_mb: "1024",
      max_products: "100",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      monthly_price_inr: String(p.monthly_price_inr),
      setup_fee_inr: String(p.setup_fee_inr),
      setup_fee_sale_price_inr: String(p.setup_fee_sale_price_inr ?? 999),
      storage_limit_mb: String(p.storage_limit_mb),
      max_products: String(p.max_products),
      is_active: p.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        monthly_price_inr: parseFloat(formData.monthly_price_inr),
        setup_fee_inr: parseFloat(formData.setup_fee_inr),
        setup_fee_sale_price_inr: parseFloat(formData.setup_fee_sale_price_inr),
        storage_limit_mb: parseInt(formData.storage_limit_mb, 10),
        max_products: parseInt(formData.max_products, 10),
        is_active: formData.is_active,
      };

      if (editingPlan) {
        await platformApi.updateAdminPlan(editingPlan.id, payload);
      } else {
        await platformApi.createAdminPlan(payload);
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      alert(err.message || "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete plan "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await platformApi.deleteAdminPlan(id);
      await loadPlans();
    } catch (err: any) {
      alert(err.message || "Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCoupon(true);
    try {
      await platformApi.createAdminCoupon({
        code: couponForm.code.trim().toUpperCase(),
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        valid_days: parseInt(couponForm.valid_days, 10),
        applicable_to: couponForm.applicable_to === "SPECIFIC_ADDON" ? "ADDON" : couponForm.applicable_to,
        addon_id: couponForm.applicable_to === "SPECIFIC_ADDON" && couponForm.addon_id ? couponForm.addon_id : undefined,
        vendor_id: couponForm.vendor_id.trim() || undefined,
        max_uses: parseInt(couponForm.max_uses, 10),
        one_time_per_vendor: couponForm.one_time_per_vendor,
      } as any);
      setIsCouponModalOpen(false);
      setCouponForm({
        code: "",
        discount_type: "FIXED_INR",
        discount_value: "500",
        valid_days: "30",
        applicable_to: "SETUP_FEE",
        addon_id: availableAddons.length > 0 ? availableAddons[0].id : "",
        vendor_id: "",
        max_uses: "100",
        one_time_per_vendor: true,
      });
      loadCoupons();
    } catch (err: any) {
      alert(err.message || "Failed to create coupon");
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;
    setDeletingCouponId(couponId);
    try {
      await platformApi.deleteAdminCoupon(couponId);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || "Failed to delete coupon");
    } finally {
      setDeletingCouponId(null);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl pb-12">
      {/* SECTION 1: Membership Plans & Pricing */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plans & Setup Pricing</h1>
            <p className="text-sm text-slate-500">
              Configure monthly app membership charges (₹499/mo), regular setup fees, and discounted sale pricing
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-xs hover:bg-purple-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create New Plan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const salePrice = p.setup_fee_sale_price_inr ?? p.setup_fee_inr;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={p.is_active ? "active" : "inactive"} />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit Plan"
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deletingId === p.id}
                        title="Delete Plan"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deletingId === p.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">{p.slug}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900">₹{p.monthly_price_inr}</span>
                      <span className="text-xs text-slate-500">/ month (Auto-debit on APK approval)</span>
                    </div>

                    <div className="mt-2.5 p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <div className="text-[11px] text-slate-500 font-medium">One-Time Setup Fee</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-lg font-bold text-purple-700">₹{salePrice}</span>
                        {p.setup_fee_inr > salePrice && (
                          <span className="text-xs text-slate-400 line-through">₹{p.setup_fee_inr}</span>
                        )}
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Active Price
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                      <span>{p.storage_limit_mb} MB Cloud Storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-blue-500" />
                      <span>Up to {p.max_products} Products</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span>Branded Android Mobile App Included</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Configured via Super Admin</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deletingId === p.id}
                    className="font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Discount Coupons Management */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Promotional & Vendor Discount Coupons
            </h2>
            <p className="text-sm text-slate-500">
              Generate custom coupon codes with expiration dates to provide setup fee discounts to all vendors or targeted users
            </p>
          </div>
          <button
            onClick={() => setIsCouponModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Generate Coupon
          </button>
        </div>

        {couponsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No discount coupons generated yet</p>
            <p className="text-xs text-slate-500 mt-1">Create coupons with fixed rupee discounts or percentage cuts for onboarding businesses.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Scope / User Target</th>
                    <th className="py-3 px-4">Uses</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((c) => {
                    const isExpired = new Date(c.valid_until) < new Date();
                    const discountDisplay =
                      c.discount_type === "PERCENTAGE" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 tracking-wider">
                          {c.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {discountDisplay}
                        </td>
                        <td className="py-3 px-4 text-slate-600 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(c as any).addon_name ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                {(c as any).addon_name}
                              </span>
                            ) : c.applicable_to === "ADDON_ALL" || c.applicable_to === "ADDON" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                                All Add-ons
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                                Setup Fee
                              </span>
                            )}

                            {(c as any).one_time_per_vendor && (
                              <span className="inline-flex items-center text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                1x / Vendor
                              </span>
                            )}
                          </div>

                          <div>
                            {c.vendor_id ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                <User className="w-3 h-3 text-slate-400" />
                                Vendor: {c.vendor_id.slice(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">All Vendors</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold">{c.used_count}</span>
                          <span className="text-slate-400"> / {c.max_uses}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(c.valid_until).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isExpired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                              EXPIRED
                            </span>
                          ) : c.is_active ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              DISABLED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            disabled={deletingCouponId === c.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Plan Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlan ? "Edit Plan Pricing & Quota" : "Create Plan"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Starter Store"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Monthly Subscription Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.monthly_price_inr}
                  onChange={(e) => setFormData({ ...formData, monthly_price_inr: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Charged on auto-debit basis once Android APK is tested and approved by vendor.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Setup Fee Base MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.setup_fee_inr}
                    onChange={(e) => setFormData({ ...formData, setup_fee_inr: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Shown struck-through</p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Setup Fee Sale Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.setup_fee_sale_price_inr}
                    onChange={(e) => setFormData({ ...formData, setup_fee_sale_price_inr: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Actual amount charged</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Storage Limit (MB)</label>
                  <input
                    type="number"
                    required
                    value={formData.storage_limit_mb}
                    onChange={(e) => setFormData({ ...formData, storage_limit_mb: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Products</label>
                  <input
                    type="number"
                    required
                    value={formData.max_products}
                    onChange={(e) => setFormData({ ...formData, max_products: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="p_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="p_active" className="font-medium text-slate-700">
                  Plan is active for new vendor registrations
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Pricing Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Generator Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                Generate New Discount Coupon
              </h3>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE50, SPECIAL999"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl tracking-wider font-semibold text-indigo-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discount_type: e.target.value as "FIXED_INR" | "PERCENTAGE",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="FIXED_INR">Fixed Rupee (₹ off)</option>
                    <option value="PERCENTAGE">Percentage (% off)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    placeholder={couponForm.discount_type === "PERCENTAGE" ? "e.g. 20" : "e.g. 500"}
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Target / Applicable Service */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Applicable Service / Target *
                </label>
                <select
                  value={couponForm.applicable_to}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setCouponForm({
                      ...couponForm,
                      applicable_to: val,
                      addon_id: val === "SPECIFIC_ADDON" && availableAddons.length > 0 ? (couponForm.addon_id || availableAddons[0].id) : "",
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="SETUP_FEE">App Setup Fee (₹499 - ₹2000)</option>
                  <option value="ADDON_ALL">All Growth Add-ons</option>
                  <option value="SPECIFIC_ADDON">Specific Add-on Service (e.g. Custom Domain)</option>
                </select>
              </div>

              {/* If Specific Add-on is chosen */}
              {couponForm.applicable_to === "SPECIFIC_ADDON" && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                  <label className="font-semibold text-indigo-950 block text-[11px] uppercase tracking-wider">
                    Select Target Add-on *
                  </label>
                  <select
                    value={couponForm.addon_id}
                    onChange={(e) => setCouponForm({ ...couponForm, addon_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-semibold text-indigo-900 text-xs"
                  >
                    {availableAddons.map((add) => (
                      <option key={add.id} value={add.id}>
                        {add.name} (₹{add.price_inr} - {add.billing_type === "MONTHLY" ? "Monthly" : "One-Time"})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-700">
                    This promo code can ONLY be redeemed when purchasing this specific add-on.
                  </p>
                </div>
              )}

              {/* One-Time Use Per Vendor Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">
                    One-Time Use Per Vendor
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Ensures each registered vendor can only redeem this promo code once.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={couponForm.one_time_per_vendor}
                  onChange={(e) => setCouponForm({ ...couponForm, one_time_per_vendor: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    required
                    value={couponForm.valid_days}
                    onChange={(e) => setCouponForm({ ...couponForm, valid_days: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Total Uses</label>
                  <input
                    type="number"
                    required
                    value={couponForm.max_uses}
                    onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Restrict to Specific Vendor ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for all users, or paste Vendor UUID"
                  value={couponForm.vendor_id}
                  onChange={(e) => setCouponForm({ ...couponForm, vendor_id: e.target.value })}
                  className="w-full px-3.5 py-2 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCoupon}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingCoupon ? "Generating..." : "Generate Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
