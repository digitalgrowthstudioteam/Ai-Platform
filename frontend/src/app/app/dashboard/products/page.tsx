"use client";

import React, { useEffect, useState, useRef } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { Product, Category } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Check,
  AlertCircle,
  X,
  Star,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Upload,
  GripVertical,
  Loader2,
} from "lucide-react";

interface ManagedImage {
  id: string;
  image_url: string;
  sort_order: number;
  is_thumbnail: boolean;
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    regular_price: "",
    sale_price: "",
    sku: "",
    stock_quantity: "10",
    category_id: "",
    status: "active",
    is_featured: false,
  });

  // Multiple Images State
  const [productImages, setProductImages] = useState<ManagedImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        platformApi.getProducts({ category_id: selectedCat || undefined }),
        platformApi.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCat]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      regular_price: "",
      sale_price: "",
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      stock_quantity: "10",
      category_id: categories.length > 0 ? categories[0].id : "",
      status: "active",
      is_featured: false,
    });
    setProductImages([
      {
        id: "def-1",
        image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
        sort_order: 0,
        is_thumbnail: true,
      },
    ]);
    setNewImageUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || "",
      regular_price: String(p.regular_price),
      sale_price: p.sale_price ? String(p.sale_price) : "",
      sku: p.sku,
      stock_quantity: String(p.stock_quantity),
      category_id: p.category_id || "",
      status: p.status,
      is_featured: p.is_featured,
    });

    let initialImages: ManagedImage[] = [];
    if (p.images && p.images.length > 0) {
      initialImages = [...p.images]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img, idx) => ({
          id: img.id || `img-${idx}`,
          image_url: img.image_url,
          sort_order: idx,
          is_thumbnail: idx === 0,
        }));
    } else if (p.thumbnail_url) {
      initialImages = [
        {
          id: "thumb-0",
          image_url: p.thumbnail_url,
          sort_order: 0,
          is_thumbnail: true,
        },
      ];
    }
    setProductImages(initialImages);
    setNewImageUrl("");
    setIsModalOpen(true);
  };

  // Image manipulation handlers
  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= productImages.length) return;
    const updated = [...productImages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const normalized = updated.map((item, idx) => ({
      ...item,
      sort_order: idx,
      is_thumbnail: idx === 0,
    }));
    setProductImages(normalized);
  };

  const makeCover = (index: number) => {
    moveImage(index, 0);
  };

  const removeImage = (index: number) => {
    const updated = productImages
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({
        ...item,
        sort_order: idx,
        is_thumbnail: idx === 0,
      }));
    setProductImages(updated);
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    const newImg: ManagedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      image_url: trimmed,
      sort_order: productImages.length,
      is_thumbnail: productImages.length === 0,
    };
    setProductImages([...productImages, newImg]);
    setNewImageUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await platformApi.uploadFile(file, "products");
      const newImg: ManagedImage = {
        id: `uploaded-${Date.now()}`,
        image_url: res.url,
        sort_order: productImages.length,
        is_thumbnail: productImages.length === 0,
      };
      setProductImages((prev) => [...prev, newImg]);
    } catch (err: any) {
      alert(err.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    moveImage(draggedIndex, index);
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        regular_price: parseFloat(formData.regular_price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        sku: formData.sku,
        stock_quantity: parseInt(formData.stock_quantity, 10),
        category_id: formData.category_id || null,
        status: formData.status,
        is_featured: formData.is_featured,
        thumbnail_url: productImages.length > 0 ? productImages[0].image_url : null,
        image_urls: productImages.map((img) => img.image_url),
      };

      if (editingProduct) {
        await platformApi.updateProduct(editingProduct.id, payload);
        setMessage({ type: "success", text: "Product updated successfully!" });
      } else {
        await platformApi.createProduct(payload);
        setMessage({ type: "success", text: "Product added to catalog!" });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save product" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await platformApi.deleteProduct(id);
      loadData();
    } catch (e: any) {
      alert(e.message || "Failed to delete product");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500">
            Manage products, multiple photos, reorder displays, stock levels, and pricing
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="w-full sm:w-56 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No products found. Click "Add New Product" to populate your store catalog.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const displayImg =
                    p.thumbnail_url ||
                    (p.images && p.images.length > 0 ? p.images[0].image_url : null) ||
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80";
                  const totalImages = p.images?.length || (p.thumbnail_url ? 1 : 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={displayImg}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            {totalImages > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-1 rounded-sm shadow-xs">
                                +{totalImages - 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {p.name}
                              {p.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category_name || "Uncategorized"}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-3 px-4">
                        {p.sale_price && p.sale_price > 0 ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              ₹{p.sale_price.toLocaleString("en-IN")}
                            </span>
                            <span className="ml-1 text-[11px] text-slate-400 line-through">
                              ₹{p.regular_price}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">
                            ₹{p.regular_price.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{p.stock_quantity} units</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
                <p className="text-xs text-slate-500">
                  Set product details, prices, and organize your photo gallery
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Classic Linen Shirt"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Regular Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.regular_price}
                    onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sale Price (₹ optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Multiple Images Gallery Manager */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Product Images Gallery ({productImages.length})
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Upload or add multiple photos. Drag or use the arrows to reorder. The first photo is your primary cover photo.
                    </p>
                  </div>
                </div>

                {/* Add URL or File Upload Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="Paste image URL (https://...)"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add URL
                  </button>
                  <div className="relative shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Upload Photo
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Images List */}
                {productImages.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-500 font-medium">No images added yet</p>
                    <p className="text-[11px] text-slate-400">
                      Add image URLs or upload pictures from your device above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {productImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-move ${
                          idx === 0
                            ? "bg-blue-50/50 border-blue-300 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        } ${draggedIndex === idx ? "opacity-50 scale-[0.98]" : "opacity-100"}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="relative shrink-0">
                            <img
                              src={img.image_url}
                              alt={`Photo ${idx + 1}`}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80";
                              }}
                            />
                            <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {idx === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider">
                                  <Star className="w-2.5 h-2.5 fill-white" /> Primary Cover
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-slate-500">
                                  Gallery Image #{idx + 1}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs mt-0.5">
                              {img.image_url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => makeCover(idx)}
                              title="Make Primary Cover Image"
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold text-blue-700 bg-blue-100/70 hover:bg-blue-200 transition-colors"
                            >
                              Set as Cover
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, idx - 1)}
                            title="Move Up"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === productImages.length - 1}
                            onClick={() => moveImage(idx, idx + 1)}
                            title="Move Down"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            title="Remove image"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_featured" className="text-xs font-medium text-slate-700">
                  Feature this product on store homepage and Android app hero section
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                  {submitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
