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
  ShieldAlert,
  CheckCircle,
  XCircle,
  Plus,
  ExternalLink,
  Store,
  Smartphone,
  CreditCard,
  HardDrive,
  X,
  AlertCircle,
} from "lucide-react";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorDetail, setVendorDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => {
    loadVendors();
  }, [search, statusFilter]);

  const viewDetails = async (id: string) => {
    setSelectedVendorId(id);
    setDetailLoading(true);
    try {
      const detail = await platformApi.getAdminVendorDetail(id);
      setVendorDetail(detail);
    } catch (e: any) {
      alert(e.message || "Failed to load vendor details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (vendorId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to change vendor status to ${newStatus}?`)) return;
    try {
      await platformApi.updateVendorStatus(vendorId, newStatus);
      if (vendorDetail && vendorDetail.id === vendorId) {
        setVendorDetail({ ...vendorDetail, status: newStatus });
      }
      loadVendors();
    } catch (err: any) {
      alert(err.message || "Failed to update vendor status");
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("https://digital-growth-studio-api.onrender.com/api/v1/platform/admin/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("dgs_platform_token")}`,
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
          <p className="text-sm text-slate-500">Monitor all registered vendors, inspect profiles, configure apps, and control account status</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-xs hover:bg-purple-700 transition-colors"
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
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
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
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{v.vendor_code}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{v.business_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{v.subdomain}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800">{v.owner_name}</p>
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
                      <button
                        onClick={() => viewDetails(v.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Full Details Modal */}
      {selectedVendorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-purple-600 font-bold">{vendorDetail?.vendor_code}</span>
                <h3 className="text-xl font-bold text-slate-900">{vendorDetail?.business_name || "Vendor Profile"}</h3>
              </div>
              <button onClick={() => setSelectedVendorId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !vendorDetail ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="mt-4 space-y-6 text-xs">
                {/* Status Toggle Bar */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-medium block">Current Account Status:</span>
                    <div className="mt-1">
                      <StatusBadge status={vendorDetail.status} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {vendorDetail.status !== "active" && (
                      <button
                        onClick={() => handleUpdateStatus(vendorDetail.id, "active")}
                        className="px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Activate Account
                      </button>
                    )}
                    {vendorDetail.status !== "suspended" && (
                      <button
                        onClick={() => handleUpdateStatus(vendorDetail.id, "suspended")}
                        className="px-3 py-1.5 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                      >
                        Suspend Account
                      </button>
                    )}
                    {vendorDetail.status !== "inactive" && (
                      <button
                        onClick={() => handleUpdateStatus(vendorDetail.id, "inactive")}
                        className="px-3 py-1.5 rounded-lg font-semibold bg-slate-600 text-white hover:bg-slate-700 transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Business Information */}
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-purple-600" />
                    1. Business Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Owner Name:</span>
                      <p className="font-semibold text-slate-900">{vendorDetail.owner_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Category:</span>
                      <p className="font-semibold text-slate-900">{vendorDetail.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>
                      <p className="text-slate-800">{vendorDetail.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone:</span>
                      <p className="text-slate-800 font-mono">{vendorDetail.phone}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">GST Number:</span>
                      <p className="font-mono text-slate-800">{vendorDetail.gst_number || "Not provided"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Address:</span>
                      <p className="text-slate-800">{vendorDetail.address || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Store & Subdomain */}
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    2. Storefront & Quota
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Subdomain:</span>
                      <p className="font-mono font-semibold text-blue-600">{vendorDetail.subdomain}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Catalog Size:</span>
                      <p className="font-semibold text-slate-900">{vendorDetail.total_products} products • {vendorDetail.total_orders} orders</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Bunny Storage Consumption:</span>
                      <p className="font-semibold text-slate-900">{vendorDetail.storage_used_mb} MB used / {vendorDetail.storage_limit_mb} MB limit</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Theme Colors:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: vendorDetail.primary_color }} />
                        <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: vendorDetail.secondary_color }} />
                        <span className="font-mono text-[10px] text-slate-500">{vendorDetail.primary_color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Android App Configuration & Status */}
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    3. Android Mobile App Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">App Name:</span>
                      <p className="font-semibold text-slate-900">{vendorDetail.app_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Package Name:</span>
                      <p className="font-mono text-slate-800">{vendorDetail.package_id}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">App Build Status:</span>
                      <div className="mt-0.5"><StatusBadge status={vendorDetail.app_build_status} /></div>
                    </div>
                    <div>
                      <span className="text-slate-400">Play Store Status:</span>
                      <div className="mt-0.5"><StatusBadge status={vendorDetail.publication_status} /></div>
                    </div>
                  </div>
                </div>

                {/* 4. Payment Configuration */}
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    4. Payment Integration Status
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Cash on Delivery (COD):</span>
                      <p className="font-semibold text-slate-900">{vendorDetail.cod_enabled ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Razorpay Gateway:</span>
                      <p className="font-semibold text-slate-900">
                        {vendorDetail.razorpay_enabled ? `Active (${vendorDetail.razorpay_key_id})` : "Not Configured"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  {creating ? "Provisioning..." : "Create Vendor Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

