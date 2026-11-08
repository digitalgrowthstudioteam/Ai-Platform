"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { VendorListItem } from "@/lib/app-platform/types";
import { HardDrive, Edit2, Check, X, ShieldAlert, AlertCircle } from "lucide-react";

export default function AdminStoragePage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [newLimitMb, setNewLimitMb] = useState("1024");
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      const data = await platformApi.getAdminVendors();
      setVendors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdateLimit = async (vendorId: string) => {
    setUpdating(true);
    try {
      await platformApi.updateVendorStorageLimit(vendorId, parseInt(newLimitMb, 10));
      setEditingVendorId(null);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to update storage limit");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cloud Storage Management</h1>
        <p className="text-sm text-slate-500">Monitor image & asset consumption across all stores, detect over-quota usage, and adjust limits</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Vendor ID</th>
                <th className="py-3 px-4">Business / Store</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4">Storage Consumed</th>
                <th className="py-3 px-4">Quota Limit</th>
                <th className="py-3 px-4 text-right">Adjust Quota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => {
                const usedMb = v.storage_used_mb ?? 0;
                const limitMb = v.storage_limit_mb ?? 1024;
                const pct = Math.min(100, Math.round((usedMb / limitMb) * 100));
                return (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{v.vendor_code}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{v.business_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{v.subdomain}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{v.total_products} items</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">
                          {usedMb >= 1024 ? `${(usedMb / 1024).toFixed(2)} GB` : `${usedMb.toFixed(1)} MB`}
                        </span>
                        <span className="text-[11px] text-slate-400">({pct}%)</span>
                      </div>
                      <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-purple-600"
                          }`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {limitMb >= 1024 ? `${(limitMb / 1024).toFixed(limitMb % 1024 === 0 ? 0 : 1)} GB` : `${limitMb} MB`}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {editingVendorId === v.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            value={newLimitMb}
                            onChange={(e) => setNewLimitMb(e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                          />
                          <button
                            onClick={() => handleUpdateLimit(v.id)}
                            disabled={updating}
                            className="px-2 py-1 rounded bg-purple-600 text-white font-semibold text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingVendorId(null)}
                            className="px-2 py-1 rounded text-slate-500 hover:bg-slate-100 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingVendorId(v.id);
                            setNewLimitMb(String(limitMb));
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Modify Quota
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

