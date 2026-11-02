"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { Product, Category } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  Eye,
  ExternalLink,
  Check,
  AlertCircle,
} from "lucide-react";

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [storeSlug, setStoreSlug] = useState<string>("abc");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [prods, cats, me] = await Promise.all([
        platformApi.getProducts({ category_id: selectedCat || undefined }),
        platformApi.getCategories(),
        platformApi.getMe().catch(() => null),
      ]);
      setProducts(prods);
      setCategories(cats);
      if (me?.store_slug) {
        setStoreSlug(me.store_slug);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCat]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await platformApi.deleteProduct(id);
      setMessage({ type: "success", text: `Product "${name}" deleted successfully.` });
      loadData();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to delete product" });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Add New Product CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500">
            Manage your store catalog, upload photos, configure variants, inventory, and pricing
          </p>
        </div>
        <Link
          href="/app/dashboard/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
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
            No products found. Click &quot;Add New Product&quot; to populate your store catalog.
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
                          <Link
                            href={`/app/dashboard/products/${p.id}`}
                            className="relative shrink-0 block hover:opacity-80 transition-opacity"
                            title="Edit this product"
                          >
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
                          </Link>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/app/dashboard/products/${p.id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                                title="Edit this product"
                              >
                                {p.name}
                              </Link>
                              {p.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                              {p.has_variants && p.variants && p.variants.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {p.variants.length} Variants
                                </span>
                              )}
                              <a
                                href={`/app/store/${storeSlug}/products/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex text-slate-400 hover:text-blue-600 transition-colors"
                                title="Open Live Storefront Page"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
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
                          <a
                            href={`/app/store/${storeSlug}/products/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Live Product Page"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <Link
                            href={`/app/dashboard/products/${p.id}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product (Opens Edit URL)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete Product"
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
    </div>
  );
}
