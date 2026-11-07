"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { Banner } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import { Image as ImageIcon, Plus, Edit2, Trash2, X, AlertCircle, Upload, Loader2, Check } from "lucide-react";

export default function VendorBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    promo_offer: "",
    image_url: "",
    link_url: "",
    sort_order: "1",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const res = await platformApi.uploadFile(file, "banners");
      setFormData((prev) => ({ ...prev, image_url: res.url }));
    } catch (err: any) {
      alert(err.message || "Failed to upload banner image");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  };

  const load = async () => {
    try {
      const data = await platformApi.getBanners();
      setBanners(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      promo_offer: "",
      image_url: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80",
      link_url: "",
      sort_order: String(banners.length + 1),
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditingBanner(b);
    setFormData({
      title: b.title,
      description: b.description || "",
      promo_offer: b.promo_offer || "",
      image_url: b.image_url,
      link_url: b.link_url || "",
      sort_order: String(b.sort_order),
      is_active: b.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        promo_offer: formData.promo_offer,
        image_url: formData.image_url,
        link_url: formData.link_url,
        sort_order: parseInt(formData.sort_order, 10),
        is_active: formData.is_active,
      };
      if (editingBanner) {
        await platformApi.updateBanner(editingBanner.id, payload);
      } else {
        await platformApi.createBanner(payload);
      }
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to save banner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      await platformApi.deleteBanner(id);
      load();
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Promotional Banners</h1>
          <p className="text-sm text-slate-500">Highlight season sales and featured collections on your store and Android mobile app</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Banner
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          No banners configured. Add a promotional hero banner to attract shoppers.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
              <div className="relative aspect-video w-full bg-slate-100">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                {b.promo_offer && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-xs">
                    {b.promo_offer}
                  </span>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={b.is_active ? "active" : "inactive"} />
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{b.title}</h3>
                  {b.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description}</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Order: {b.sort_order}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">{editingBanner ? "Edit Banner" : "New Promotional Banner"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Banner Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Summer Solstice Sale"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Promotional Tag / Badge
                </label>
                <input
                  type="text"
                  value={formData.promo_offer}
                  onChange={(e) => setFormData({ ...formData, promo_offer: e.target.value })}
                  placeholder="e.g. FLAT 40% OFF"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Banner Photo (CDN Upload)
                </label>
                {formData.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2 group">
                    <img
                      src={formData.image_url}
                      alt="Banner Preview"
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 text-xs font-bold rounded-lg shadow-sm">
                        <span>Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center mb-2">
                    <label className="cursor-pointer inline-flex flex-col items-center gap-1.5 text-xs text-slate-600 font-medium hover:text-blue-600 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span>{uploadingBanner ? "Uploading photo..." : "Upload Banner Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {uploadingBanner && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading photo to high-speed CDN...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="b_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="b_active" className="text-xs font-medium text-slate-700">
                    Active & visible
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

