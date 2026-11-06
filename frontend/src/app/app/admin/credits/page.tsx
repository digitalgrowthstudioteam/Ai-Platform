"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { AiCreditPack } from "@/lib/app-platform/types";
import {
  Sparkles,
  Save,
  Plus,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Settings,
  Gift,
  Coins,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";

export default function SuperAdminCreditsPage() {
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Configuration state
  const [welcomeCredits, setWelcomeCredits] = useState<number>(5);
  const [importCost, setImportCost] = useState<number>(1);
  const [imageCost, setImageCost] = useState<number>(2);
  const [creditPacks, setCreditPacks] = useState<AiCreditPack[]>([]);

  // Vendor accounts state
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Grant Modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [targetVendor, setTargetVendor] = useState<any | null>(null);
  const [grantAmount, setGrantAmount] = useState<number>(25);
  const [grantReason, setGrantReason] = useState<string>("Promotion reward / merchant onboarding");
  const [granting, setGranting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [config, vendorList] = await Promise.all([
        platformApi.getAdminCreditConfig(),
        platformApi.getAdminVendorCredits(),
      ]);

      if (config) {
        setWelcomeCredits(config.welcome_credits ?? 5);
        setImportCost(config.import_product_credit_cost ?? 1);
        setImageCost(config.image_studio_credit_cost ?? 2);
        setCreditPacks(config.credit_packs ?? []);
      }
      setVendors(vendorList || []);
    } catch (e: any) {
      console.error(e);
      setMessage({ type: "error", text: e.message || "Failed to load credit settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchVendors = async (q: string) => {
    setSearch(q);
    setLoadingVendors(true);
    try {
      const results = await platformApi.getAdminVendorCredits(q);
      setVendors(results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMessage(null);
    try {
      await platformApi.updateAdminCreditConfig({
        welcome_credits: Number(welcomeCredits),
        import_product_credit_cost: Number(importCost),
        image_studio_credit_cost: Number(imageCost),
        credit_packs: creditPacks,
      });

      setMessage({ type: "success", text: "Credit pack pricing and rules updated live across the platform!" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to save pricing configuration." });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUpdatePackField = (index: number, field: keyof AiCreditPack, value: any) => {
    const updated = [...creditPacks];
    updated[index] = { ...updated[index], [field]: value };
    setCreditPacks(updated);
  };

  const handleAddNewPack = () => {
    const newId = `pack_custom_${Date.now()}`;
    const newPack: AiCreditPack = {
      id: newId,
      name: "Special Pack",
      credits: 150,
      price_inr: 399,
      tag: "Limited Offer",
      popular: false,
      active: true,
    };
    setCreditPacks([...creditPacks, newPack]);
  };

  const handleDeletePack = (index: number) => {
    if (creditPacks.length <= 1) {
      alert("At least one credit pack must remain active.");
      return;
    }
    const updated = creditPacks.filter((_, i) => i !== index);
    setCreditPacks(updated);
  };

  const handleGrantCredits = async () => {
    if (!targetVendor || !grantAmount) return;
    setGranting(true);
    try {
      const res = await platformApi.grantAdminVendorCredits({
        vendor_id: targetVendor.vendor_id,
        amount: Number(grantAmount),
        reason: grantReason.trim() || "Admin grant",
      });

      setMessage({
        type: "success",
        text: `Granted ${grantAmount} credits to ${targetVendor.vendor_code}. New balance: ${res.new_balance} credits.`,
      });
      setGrantModalOpen(false);
      // Reload vendor list
      const updatedList = await platformApi.getAdminVendorCredits(search);
      setVendors(updatedList);
    } catch (e: any) {
      alert(e.message || "Failed to grant credits.");
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Credits & Pricing</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Super Admin Control
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Set real-time pricing for vendor credit packs, configure feature costs, and allocate credits
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={savingConfig}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Pricing Changes
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Action Costs & Welcome Bonus Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <Settings className="w-5 h-5 text-purple-600" />
          <h3>Credit Consumption Rules & Welcome Bonus</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-500" />
              Default Welcome Credits
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Free credits automatically granted to new stores</p>
            <input
              type="number"
              value={welcomeCredits}
              onChange={(e) => setWelcomeCredits(Number(e.target.value))}
              min={0}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              1-Click Product Import Cost
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Credits deducted per product link scraped</p>
            <input
              type="number"
              value={importCost}
              onChange={(e) => setImportCost(Number(e.target.value))}
              min={1}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-purple-600" />
              AI Image Studio Redesign Cost
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Credits deducted per studio photo makeover</p>
            <input
              type="number"
              value={imageCost}
              onChange={(e) => setImageCost(Number(e.target.value))}
              min={1}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Credit Packs Pricing Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
              Credit Packs Pricing Matrix (Vendor Dashboard)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit the price in ₹ and credits included for each pack. Changes reflect instantly on checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddNewPack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Pack
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Pack Name</th>
                <th className="py-3 px-4">Credits Count</th>
                <th className="py-3 px-4">Price (₹ INR)</th>
                <th className="py-3 px-4">Tag / Badge</th>
                <th className="py-3 px-4">Effective Cost / Product</th>
                <th className="py-3 px-4 text-center">Popular?</th>
                <th className="py-3 px-4 text-center">Active?</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {creditPacks.map((pack, i) => {
                const perCredit = (pack.price_inr / (pack.credits || 1)).toFixed(2);
                return (
                  <tr key={pack.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={pack.name}
                        onChange={(e) => handleUpdatePackField(i, "name", e.target.value)}
                        className="w-full max-w-[160px] px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 text-xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={pack.credits}
                        onChange={(e) => handleUpdatePackField(i, "credits", Number(e.target.value))}
                        min={1}
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-purple-700 text-xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-bold text-slate-900 text-sm">
                        <span>₹</span>
                        <input
                          type="number"
                          value={pack.price_inr}
                          onChange={(e) => handleUpdatePackField(i, "price_inr", Number(e.target.value))}
                          min={1}
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 font-black text-slate-900 text-xs"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={pack.tag || ""}
                        onChange={(e) => handleUpdatePackField(i, "tag", e.target.value)}
                        placeholder="e.g. Most Popular"
                        className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                      ₹{perCredit} / cr
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(pack.popular)}
                        onChange={(e) => handleUpdatePackField(i, "popular", e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(pack.active)}
                        onChange={(e) => handleUpdatePackField(i, "active", e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePack(i)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Pack"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Credit Balances Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Vendor Credit Accounts Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect vendor credit balances and manually allocate or adjust credits with audit history
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchVendors(e.target.value)}
              placeholder="Search vendor code / store..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Vendor Code</th>
                <th className="py-3 px-4">Business / Store</th>
                <th className="py-3 px-4">Owner & Email</th>
                <th className="py-3 px-4 text-center">AI Credits Available</th>
                <th className="py-3 px-4 text-center">Transactions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => (
                <tr key={v.vendor_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-purple-700">{v.vendor_code}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{v.business_name || v.store_name || "Store"}</p>
                    {v.subdomain && (
                      <p className="text-[11px] text-slate-400">{v.subdomain}.digitalgrowthstudio.in</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{v.owner_name}</p>
                    <p className="text-[11px] text-slate-400">{v.email}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200/80">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {v.ai_credits} Credits
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-600">
                    {v.total_transactions} txns
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetVendor(v);
                        setGrantModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Grant / Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Credits Modal */}
      {grantModalOpen && targetVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Adjust Credits for {targetVendor.vendor_code}
              </h3>
              <button
                onClick={() => setGrantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">
                  Store: <span className="font-semibold text-slate-800">{targetVendor.business_name}</span> • Current Balance:{" "}
                  <span className="font-bold text-purple-700">{targetVendor.ai_credits} Credits</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Credits to Add (or enter negative to deduct)
                </label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. Promotional package, refund, loyalty grant"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={granting || !grantAmount}
                  onClick={handleGrantCredits}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {granting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
