"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { Product, Category } from "@/lib/app-platform/types";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  Star,
  Loader2,
  Check,
  AlertCircle,
  Tag,
  Package,
  Layers,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ManagedImage {
  id: string;
  image_url: string;
  sort_order: number;
  is_thumbnail: boolean;
}

interface ManagedVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock_quantity: string;
  images: string[];
}

interface ProductFormProps {
  productId?: string;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(productId && productId !== "new" && productId !== "placeholder");

  const [loading, setLoading] = useState(isEditing);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSlug, setStoreSlug] = useState<string>("abc");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    regular_price: "",
    sale_price: "",
    sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    stock_quantity: "10",
    category_id: "",
    status: "active",
    is_featured: false,
  });

  // Main Images Gallery State (Upload Only)
  const [productImages, setProductImages] = useState<ManagedImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Variants State (Upload Only, placed below main images)
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ManagedVariant[]>([]);
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [descMode, setDescMode] = useState<"formatted" | "html">("formatted");

  const convertHtmlToPlainText = (html: string): string => {
    if (!html) return "";
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<td[^>]*>/gi, " ")
      .replace(/<\/td>/gi, " | ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // Load existing product or default categories
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const [cats, me] = await Promise.all([
          platformApi.getCategories().catch(() => []),
          platformApi.getMe().catch(() => null),
        ]);

        if (!isMounted) return;
        setCategories(cats);
        if (me?.store_slug) setStoreSlug(me.store_slug);

        if (isEditing && productId) {
          let prod: Product | null = null;
          try {
            prod = await platformApi.getProduct(productId);
          } catch {
            const list = await platformApi.getProducts().catch(() => []);
            prod = list.find((p) => p.id === productId || p.slug === productId) || null;
          }

          if (!isMounted) return;

          if (prod) {
            const rawDesc = prod.description || "";
            const isHtml = /<[a-z][\s\S]*>/i.test(rawDesc);
            setFormData({
              name: prod.name,
              description: isHtml ? convertHtmlToPlainText(rawDesc) : rawDesc,
              regular_price: String(prod.regular_price),
              sale_price: prod.sale_price ? String(prod.sale_price) : "",
              sku: prod.sku,
              stock_quantity: String(prod.stock_quantity),
              category_id: prod.category_id || (cats.length > 0 ? cats[0].id : ""),
              status: prod.status || "active",
              is_featured: prod.is_featured || false,
            });

            // Images
            let initialImages: ManagedImage[] = [];
            if (prod.images && prod.images.length > 0) {
              initialImages = [...prod.images]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((img, idx) => ({
                  id: img.id || `img-${idx}`,
                  image_url: img.image_url,
                  sort_order: idx,
                  is_thumbnail: idx === 0,
                }));
            } else if (prod.thumbnail_url) {
              initialImages = [
                {
                  id: "thumb-0",
                  image_url: prod.thumbnail_url,
                  sort_order: 0,
                  is_thumbnail: true,
                },
              ];
            }
            setProductImages(initialImages);

            // Variants
            if (prod.has_variants && prod.variants && prod.variants.length > 0) {
              setHasVariants(true);
              setVariants(
                prod.variants.map((v) => ({
                  id: v.id,
                  name: v.name,
                  sku: v.sku,
                  price: v.price !== undefined && v.price !== null ? String(v.price) : "",
                  stock_quantity: String(v.stock_quantity),
                  images: v.images || [],
                }))
              );
            } else {
              setHasVariants(false);
              setVariants([]);
            }
          }
        } else {
          // New product defaults
          if (cats.length > 0) {
            setFormData((prev) => ({ ...prev, category_id: cats[0].id }));
          }
        }
      } catch (err: any) {
        if (isMounted) setMessage({ type: "error", text: err.message || "Failed to load product data" });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [productId, isEditing]);

  // Main Image Upload Handler (Upload Only)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setMessage(null);
    try {
      const newImgs: ManagedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await platformApi.uploadFile(file, "products");
        newImgs.push({
          id: `uploaded-${Date.now()}-${i}`,
          image_url: res.url,
          sort_order: productImages.length + i,
          is_thumbnail: productImages.length === 0 && i === 0,
        });
      }
      setProductImages((prev) => [...prev, ...newImgs]);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Image upload failed. Please try again." });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  // Variant Handlers (Upload Only)
  const addVariantRow = () => {
    const num = variants.length + 1;
    const baseSku = formData.sku || "SKU";
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${num}`,
        name: "",
        sku: `${baseSku}-V${num}`,
        price: "",
        stock_quantity: "10",
        images: [],
      },
    ]);
  };

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariantField = (index: number, field: keyof ManagedVariant, value: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleVariantFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVariantIdx(index);
    try {
      const res = await platformApi.uploadFile(file, "products");
      setVariants((prev) =>
        prev.map((v, i) =>
          i === index ? { ...v, images: [...v.images, res.url] } : v
        )
      );
    } catch (err: any) {
      alert(err.message || "Variant photo upload failed");
    } finally {
      setUploadingVariantIdx(null);
      e.target.value = "";
    }
  };

  const removeVariantPhoto = (variantIndex: number, photoIndex: number) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, images: v.images.filter((_, pIdx) => pIdx !== photoIndex) }
          : v
      )
    );
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const regularPriceNum = parseFloat(formData.regular_price);
      if (isNaN(regularPriceNum) || regularPriceNum < 0) {
        throw new Error("Please enter a valid regular price.");
      }

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        regular_price: regularPriceNum,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        sku: formData.sku.trim(),
        stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
        category_id: formData.category_id || null,
        status: formData.status,
        is_featured: formData.is_featured,
        thumbnail_url: productImages.length > 0 ? productImages[0].image_url : null,
        image_urls: productImages.map((img) => img.image_url),
      };

      if (hasVariants && variants.length > 0) {
        const formattedVariants = variants.map((v, i) => ({
          id: (v.id && !v.id.startsWith("var-") && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)) ? v.id : undefined,
          name: v.name.trim() || `Option ${i + 1}`,
          sku: v.sku.trim() || `${formData.sku}-V${i + 1}`,
          price: v.price ? parseFloat(v.price) : null,
          stock_quantity: parseInt(v.stock_quantity, 10) || 0,
          images: v.images,
          sort_order: i,
          is_active: true,
        }));
        payload.has_variants = true;
        payload.variants = formattedVariants;
        payload.stock_quantity = formattedVariants.reduce((sum, v) => sum + v.stock_quantity, 0);
      } else {
        payload.has_variants = false;
        payload.variants = [];
      }

      if (isEditing && productId) {
        await platformApi.updateProduct(productId, payload);
        setMessage({ type: "success", text: "Product updated successfully! Redirecting..." });
      } else {
        await platformApi.createProduct(payload);
        setMessage({ type: "success", text: "Product created successfully! Redirecting..." });
      }

      setTimeout(() => {
        router.push("/app/dashboard/products");
      }, 1000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save product" });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading product information...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Link
            href="/app/dashboard/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products Catalog
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {isEditing ? `Edit Product: ${formData.name || "Untitled"}` : "Add New Product"}
            </h1>
            {isEditing && productId && (
              <a
                href={`/app/store/${storeSlug}/products/${productId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                title="Open live storefront page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Live Preview
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isEditing
              ? "Update details, upload photos, and organize variants for your store catalog"
              : "Create a new product with photos, pricing, inventory, and optional variants"}
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/app/dashboard/products"
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving Product..." : isEditing ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center justify-between gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          {message.type === "error" && (
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setLoading(true);
                window.location.reload();
              }}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* SECTION 1: Basic Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h2 className="text-base font-bold text-slate-900">Basic Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Classic Premium Linen Shirt"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description
              </label>
              <div className="flex items-center gap-2.5">
                {Boolean(formData.description && /<[a-z][\s\S]*>/i.test(formData.description)) && (
                  <button
                    type="button"
                    onClick={() => {
                      const plain = convertHtmlToPlainText(formData.description);
                      setFormData({ ...formData, description: plain });
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    Clean HTML to Plain Text
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      description: prev.description ? `${prev.description}\n• ` : "• ",
                    }));
                  }}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                >
                  + Add Bullet
                </button>
                <button
                  type="button"
                  onClick={() => setDescMode(descMode === "formatted" ? "html" : "formatted")}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  {descMode === "formatted" ? "Show Store Preview" : "Back to Editor"}
                </button>
              </div>
            </div>

            {descMode === "html" ? (
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2 min-h-32 max-h-60 overflow-y-auto [&_p]:mb-2 [&_h4]:font-bold [&_h4]:text-slate-900 [&_h4]:mt-3 [&_h4]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-slate-600 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_td]:p-2 [&_td]:border [&_td]:border-slate-200 [&_th]:p-2 [&_th]:border [&_th]:border-slate-200 whitespace-pre-line">
                {/<[a-z][\s\S]*>/i.test(formData.description) ? (
                  <div dangerouslySetInnerHTML={{ __html: formData.description }} />
                ) : (
                  <p>{formData.description || "No description provided yet."}</p>
                )}
              </div>
            ) : (
              <textarea
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of features, materials, care instructions, and sizing..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              />
            )}
          </div>

          {/* Pricing & Inventory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Regular Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.regular_price}
                onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
                placeholder="1499"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sale Price (₹ Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                placeholder="999"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                SKU Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-8225"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Stock Quantity {hasVariants && "(Managed by Variants)"}
              </label>
              <input
                type="number"
                min="0"
                disabled={hasVariants}
                value={
                  hasVariants
                    ? variants.reduce((sum, v) => sum + (parseInt(v.stock_quantity, 10) || 0), 0)
                    : formData.stock_quantity
                }
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active (Visible in Store & Android App)</option>
                <option value="draft">Draft (Hidden)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Featured Checkbox */}
          <div className="pt-2">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-800">
                Feature this product on store homepage and Android app hero section
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: Main Product Images Gallery (Strictly Upload Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Product Images Gallery ({productImages.length})
              </h2>
              <p className="text-xs text-slate-500">
                Upload multiple high-resolution photos. The first photo is your primary cover photo.
              </p>
            </div>
          </div>

          {/* Upload Button (Upload Only) */}
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs">
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploadingImage ? "Uploading Photo..." : "Upload Photo"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingImage}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Upload Dropzone / Gallery Grid */}
        {productImages.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
            </div>
            <p className="text-sm font-bold text-slate-800">
              {uploadingImage ? "Uploading photos to CDN..." : "Click or drag to upload product photos"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PNG, JPG, WEBP. Upload multiple photos at once.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {productImages.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className={`group relative rounded-xl border overflow-hidden bg-slate-50 transition-all ${
                    idx === 0
                      ? "ring-2 ring-blue-500 border-blue-500 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src={img.image_url}
                      alt={`Product photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Primary Cover Badge */}
                  {idx === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      Primary Cover
                    </div>
                  )}

                  {/* Ordering & Actions Toolbar */}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-0.5">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImage(idx, idx - 1)}
                          className="p-1 rounded bg-black/40 hover:bg-black/70 text-white text-[10px]"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      )}
                      {idx < productImages.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveImage(idx, idx + 1)}
                          className="p-1 rounded bg-black/40 hover:bg-black/70 text-white text-[10px]"
                          title="Move Right"
                        >
                          <ArrowLeft className="w-3 h-3 rotate-180" />
                        </button>
                      )}
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => makeCover(idx)}
                          className="p-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-bold"
                          title="Set as Cover"
                        >
                          Cover
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Upload Trigger */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-slate-400">
                Tip: The first image will be displayed on catalog cards and the Android app feed.
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add More Photos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Product Variants & Options (STRICTLY BELOW Main Product Images Gallery) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Product Variants & Options
              </h2>
              <p className="text-xs text-slate-500">
                Configure size, color, material, or custom choices with their own dedicated photos and stock
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasVariants(checked);
                if (checked && variants.length === 0) {
                  addVariantRow();
                }
              }}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-800">
              This product has multiple options / variants
            </span>
          </label>
        </div>

        {/* Variants List (Upload Only) */}
        {hasVariants && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-900 text-xs flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium">
                Add each variant (e.g. Size: "Small", Color: "Midnight Blue"). Each variant can have its own price, SKU, stock quantity, and dedicated photo gallery.
              </span>
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Variant
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((v, vIdx) => (
                <div
                  key={v.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 relative"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Variant #{vIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVariantRow(vIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Variant Details Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Variant Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => updateVariantField(vIdx, "name", e.target.value)}
                        placeholder="e.g. Red / XL or 250ml"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Variant SKU
                      </label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariantField(vIdx, "sku", e.target.value)}
                        placeholder="SKU-8225-V1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Price (₹) <span className="text-slate-400 font-normal">blank = base price</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => updateVariantField(vIdx, "price", e.target.value)}
                        placeholder={formData.regular_price || "Base price"}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock_quantity}
                        onChange={(e) => updateVariantField(vIdx, "stock_quantity", e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Variant Photos (Strictly Upload Only) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">
                        Variant Photos ({v.images.length})
                      </span>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors">
                        {uploadingVariantIdx === vIdx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingVariantIdx === vIdx ? "Uploading..." : "Upload Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingVariantIdx === vIdx}
                          onChange={(e) => handleVariantFileUpload(vIdx, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Variant Photos List */}
                    {v.images.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {v.images.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-white group"
                          >
                            <img
                              src={photoUrl}
                              alt={`Variant ${vIdx + 1} photo ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantPhoto(vIdx, pIdx)}
                              className="absolute inset-0 bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete photo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No dedicated photos uploaded for this variant yet. It will use the primary product cover photo.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
        <Link
          href="/app/dashboard/products"
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Discard Changes
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving Product..." : isEditing ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}

