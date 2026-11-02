"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { Plan } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import { CreditCard, Plus, Edit2, Trash2, Check, X, Sparkles, HardDrive, Package } from "lucide-react";

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
    storage_limit_mb: "1024",
    max_products: "100",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    loadPlans();
  }, []);

  const openAdd = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      slug: "",
      monthly_price_inr: "499",
      setup_fee_inr: "2000",
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

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plans & Pricing</h1>
          <p className="text-sm text-slate-500">Configure monthly membership tiers, setup fees, and storage quotas dynamically</p>
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
        {plans.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
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
                <span className="text-3xl font-extrabold text-slate-900">₹{p.monthly_price_inr}</span>
                <span className="text-xs text-slate-500"> / month</span>
                <p className="text-xs text-purple-700 font-medium mt-1">₹{p.setup_fee_inr} one-time setup fee</p>
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
                  <span>Branded Android Mobile App</span>
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
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">{editingPlan ? "Edit Plan Pricing" : "Create Plan"}</h3>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.monthly_price_inr}
                    onChange={(e) => setFormData({ ...formData, monthly_price_inr: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Setup Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.setup_fee_inr}
                    onChange={(e) => setFormData({ ...formData, setup_fee_inr: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
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
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Pricing Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

