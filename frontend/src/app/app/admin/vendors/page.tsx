"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { VendorListItem } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Users,
  Search,
  Eye,
  Plus,
  ExternalLink,
  Store,
  X,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
  Calendar,
} from "lucide-react";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Manual Provision Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    email: "",
    password: "",
    owner_name: "",
    business_name: "",
    phone: "",
    category: "General Retail",
    store_slug: "",
    plan_slug: "starter-store",
  });
  const [creating, setCreating] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vendorToGrant, setVendorToGrant] = useState<VendorListItem | null>(null);
  const [grantMonths, setGrantMonths] = useState<string>("1");
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const handleGrantAccessFromTable = async (monthsToGrant: number) => {
    if (!vendorToGrant) return;
    setGrantingAccess(true);
    try {
      const res = await platformApi.grantVendorAccessMonths(vendorToGrant.id, monthsToGrant);
      alert(res.message || `Granted ${monthsToGrant} month(s) of access!`);
      setVendorToGrant(null);
      await loadVendors();
    } catch (err: any) {
      alert(err.message || "Failed to grant access");
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleToggleStatusFromTable = async (targetStatus: string) => {
    if (!vendorToGrant) return;
    setTogglingStatus(true);
    try {
      await platformApi.updateVendorStatus(vendorToGrant.id, targetStatus);
      alert(`Vendor status set to ${targetStatus}!`);
      setVendorToGrant(null);
      await loadVendors();
    } catch (err: any) {
      alert(err.message || "Failed to update vendor status");
    } finally {
      setTogglingStatus(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await platformApi.getAdminVendors(search || undefined, statusFilter || undefined);
      setVendors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;
    setDeleting(true);
    try {
      await platformApi.deleteVendor(vendorToDelete.id);
      setVendorToDelete(null);
      await loadVendors();
    } catch (err: any) {
      alert(err.message || "Failed to delete store");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [search, statusFilter]);

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem("platform_token");
      const res = await fetch("https://digital-growth-studio-api.onrender.com/api/v1/platform/admin/vendors/provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create vendor");
      }
      setIsCreateOpen(false);
      loadVendors();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vendor Management</h1>
          <p className="text-sm text-slate-500">
            Monitor registered vendors, inspect individual accounts, configure app builds, and manage status
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-xs hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision Vendor
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor ID (VND0001), store name, email, or owner..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No vendors found matching search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Vendor ID</th>
                  <th className="py-3 px-4">Business / Store</th>
                  <th className="py-3 px-4">Owner & Contact</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Android App</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <Link
                        href={`/app/admin/vendors/${v.id}`}
                        className="text-purple-700 hover:text-purple-900 transition-colors"
                        title="Open Vendor Dedicated Page"
                      >
                        {v.vendor_code}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/app/admin/vendors/${v.id}`}
                        className="font-semibold text-slate-900 hover:text-purple-700 transition-colors block"
                        title="Open Vendor Dedicated Page"
                      >
                        {v.business_name}
                      </Link>
                      <p className="text-[11px] font-mono text-slate-400">{v.subdomain}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 font-medium">{v.owner_name}</p>
                      <p className="text-[11px] text-slate-400">{v.email} • {v.phone}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{v.total_products} items</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{v.total_orders} orders</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={v.app_build_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setVendorToGrant(v);
                            setGrantMonths("1");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Grant Platform Access / Months"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Access
                        </button>
                        <a
                          href={`/app/admin/vendors/${v.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                          title="Open Dedicated Vendor Page"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </a>
                        <button
                          type="button"
                          onClick={() => setVendorToDelete(v)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete Store"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Vendor Provisioning Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Manually Provision Vendor Account</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCreate} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={createData.business_name}
                    onChange={(e) => setCreateData({ ...createData, business_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={createData.owner_name}
                    onChange={(e) => setCreateData({ ...createData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={createData.email}
                    onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={createData.phone}
                    onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createData.password}
                    onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Store Subdomain Slug</label>
                  <input
                    type="text"
                    required
                    value={createData.store_slug}
                    onChange={(e) => setCreateData({ ...createData, store_slug: e.target.value })}
                    placeholder="e.g. fashion"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Provisioning..." : "Create Vendor Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      {vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Permanently Delete Store?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong className="text-slate-800">{vendorToDelete.business_name}</strong> (<span className="font-mono text-purple-700">{vendorToDelete.vendor_code}</span>)?
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 space-y-1.5">
              <p className="font-bold text-rose-950">⚠️ Warning:</p>
              <p>This will erase the store subdomain, products ({vendorToDelete.total_products}), orders ({vendorToDelete.total_orders}), and all merchant data permanently.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setVendorToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteVendor}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Months Access Modal */}
      {vendorToGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Clock className="w-3 h-3" />
                  Super Admin Access Control
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-1">
                  Grant Access to {vendorToGrant.business_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {vendorToGrant.vendor_code} • Current: <span className="font-semibold">{vendorToGrant.status}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVendorToGrant(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Quick Grant Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={grantingAccess}
                      onClick={() => handleGrantAccessFromTable(m)}
                      className="py-2 px-2.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition-colors cursor-pointer disabled:opacity-50 text-center"
                    >
                      +{m} {m === 1 ? "Month" : "Months"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Or Specify Custom Months
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={grantMonths}
                      onChange={(e) => setGrantMonths(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">months</span>
                  </div>
                  <button
                    type="button"
                    disabled={grantingAccess}
                    onClick={() => {
                      const m = parseInt(grantMonths, 10);
                      if (!m || m < 1) {
                        alert("Please enter a valid number of months.");
                        return;
                      }
                      handleGrantAccessFromTable(m);
                    }}
                    className="py-2 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {grantingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Grant</span>
                  </button>
                </div>
              </div>

              {/* Status Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 text-xs">Set Status Directly:</span>
                <div className="flex items-center gap-2">
                  {vendorToGrant.status === "active" ? (
                    <button
                      type="button"
                      disabled={togglingStatus}
                      onClick={() => handleToggleStatusFromTable("inactive")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      {togglingStatus ? "Updating..." : "Deactivate (Lock & Blur)"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={togglingStatus}
                      onClick={() => handleToggleStatusFromTable("active")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      {togglingStatus ? "Updating..." : "Activate Account"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
