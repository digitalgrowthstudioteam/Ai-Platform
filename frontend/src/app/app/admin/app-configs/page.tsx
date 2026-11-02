"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { VendorListItem } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import { Smartphone, ExternalLink, Edit2, Check, X, ShieldAlert, Code2 } from "lucide-react";

export default function AdminAppConfigsPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [formData, setFormData] = useState({
    app_build_status: "BUILT",
    publication_status: "PUBLISHED",
    playstore_url: "",
    app_version: "1.0.0",
  });
  const [submitting, setSubmitting] = useState(false);

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

  const openEdit = async (v: VendorListItem) => {
    try {
      const detail = await platformApi.getAdminVendorDetail(v.id);
      setSelectedVendor(detail);
      setFormData({
        app_build_status: detail.app_build_status || "NOT_REQUESTED",
        publication_status: detail.publication_status || "UNPUBLISHED",
        playstore_url: detail.playstore_url || "",
        app_version: detail.app_version || "1.0.0",
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    setSubmitting(true);
    try {
      await platformApi.updateVendorAppConfigByAdmin(selectedVendor.id, formData);
      setSelectedVendor(null);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to update app status");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Developer Android App Tracker</h1>
        <p className="text-sm text-slate-500">
          Central developer handover console providing assets, package IDs, and build lifecycle tracking for each vendor's branded app
        </p>
      </div>

      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start gap-3 text-xs text-purple-900">
        <Code2 className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Appointed Developer Instructions:</span> Use the Package ID, store slug API endpoint (/api/store/[slug]/config), and theme assets listed below to compile and sign each vendor's Flutter/Android application. Once deployed to Google Play Console, update the version and live store URL here.
        </div>
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
                <th className="py-3 px-4">Store / App Name</th>
                <th className="py-3 px-4">Store Slug</th>
                <th className="py-3 px-4">Build Status</th>
                <th className="py-3 px-4">Publication</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{v.vendor_code}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{v.business_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">in.digitalgrowthstudio.{v.store_slug}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-blue-600">{v.store_slug}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={v.app_build_status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] text-slate-600">{v.status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openEdit(v)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Update Build Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-[11px] text-purple-600 font-bold">{selectedVendor.vendor_code}</span>
                <h3 className="text-base font-bold text-slate-900">Developer Build Tracking</h3>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div><span className="text-slate-400">Package ID:</span> {selectedVendor.package_id}</div>
                <div><span className="text-slate-400">API Endpoint:</span> /api/store/{selectedVendor.store_slug}/config</div>
                <div><span className="text-slate-400">Primary Color:</span> {selectedVendor.app_primary_color}</div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Android Application Build Status</label>
                <select
                  value={formData.app_build_status}
                  onChange={(e) => setFormData({ ...formData, app_build_status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="NOT_REQUESTED">NOT_REQUESTED</option>
                  <option value="QUEUED">QUEUED (In developer queue)</option>
                  <option value="IN_DEVELOPMENT">IN_DEVELOPMENT (Compiling & testing)</option>
                  <option value="BUILT">BUILT (APK & AAB signed ready)</option>
                  <option value="FAILED">FAILED (Compilation issue)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Google Play Publication Status</label>
                <select
                  value={formData.publication_status}
                  onChange={(e) => setFormData({ ...formData, publication_status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="UNPUBLISHED">UNPUBLISHED</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW (Under Google Review)</option>
                  <option value="PUBLISHED">PUBLISHED (Live on Play Store)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">App Version</label>
                  <input
                    type="text"
                    value={formData.app_version}
                    onChange={(e) => setFormData({ ...formData, app_version: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Play Store URL</label>
                  <input
                    type="url"
                    value={formData.playstore_url}
                    onChange={(e) => setFormData({ ...formData, playstore_url: e.target.value })}
                    placeholder="https://play.google.com/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedVendor(null)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Update Tracking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

