"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import {
  ShoppingCart,
  Zap,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  ArrowRight,
  Package,
} from "lucide-react";

export default function ProductDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "abc";
  const productId = (params?.productId as string) || "";

  const [product, setProduct] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { addItem } = useVendorCart(slug);

  useEffect(() => {
    async function loadData() {
      try {
        const [prod, cfg] = await Promise.all([
          platformApi.getPublicStoreProduct(slug, productId),
          platformApi.getPublicStoreConfig(slug),
        ]);
        setProduct(prod);
        setConfig(cfg);
        if (prod?.images && prod.images.length > 0) {
          setActiveImage(prod.images[0].image_url);
        } else if (prod?.thumbnail_url) {
          setActiveImage(prod.thumbnail_url);
        }
      } catch (e) {
        console.error("Failed to load product detail:", e);
      } finally {
        setLoading(false);
      }
    }
    if (slug && productId) {
      loadData();
    }
  }, [slug, productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const primaryColor = config?.primary_color || "#2563EB";

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <StoreHeader slug={slug} config={config} />
        <main className="max-w-md mx-auto px-4 py-20 text-center space-y-4 flex-1">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500">
            This item is currently unavailable in <strong>{config?.store_name}</strong>.
          </p>
          <div className="pt-2">
            <Link
              href={`/app/store/${slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              Browse Store Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
        <StoreFooter slug={slug} config={config} />
      </div>
    );
  }

  const imagesList = product.images && product.images.length > 0
    ? product.images.map((img: any) => img.image_url)
    : product.thumbnail_url
    ? [product.thumbnail_url]
    : [];

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.regular_price,
      effective_price: product.effective_price,
      thumbnail_url: product.thumbnail_url || (imagesList.length > 0 ? imagesList[0] : undefined),
      quantity: qty,
      stock_quantity: product.stock_quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.regular_price,
      effective_price: product.effective_price,
      thumbnail_url: product.thumbnail_url || (imagesList.length > 0 ? imagesList[0] : undefined),
      quantity: qty,
      stock_quantity: product.stock_quantity,
    });
    router.push(`/app/store/${slug}/checkout`);
  };

  const discountPercent =
    product.sale_price && product.sale_price < product.regular_price
      ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} backHref={`/app/store/${slug}`} backLabel="Back to Products" />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 sm:pb-8 flex-1 w-full space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href={`/app/store/${slug}`} className="hover:text-blue-600 transition-colors">
            {config?.store_name}
          </Link>
          <span>/</span>
          {product.category_name && (
            <>
              <span className="text-slate-500">{product.category_name}</span>
              <span>/</span>
            </>
          )}
          <span className="font-semibold text-slate-900 line-clamp-1">{product.name}</span>
        </div>

        {/* Product Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Gallery */}
          <div className="space-y-4">
            <div className="aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 relative group">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package className="w-16 h-16" />
                </div>
              )}
              {discountPercent > 0 && (
                <span className="absolute top-4 left-4 bg-rose-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Thumbnail Row */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {imagesList.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === img
                        ? "border-blue-600 ring-2 ring-blue-100"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Angle ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details & Purchase Actions */}
          <div className="space-y-6">
            <div>
              {product.category_name && (
                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                  {product.category_name}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {product.name}
              </h1>
              {product.sku && (
                <p className="text-xs text-slate-400 font-mono mt-1">SKU: {product.sku}</p>
              )}
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    ₹{product.effective_price.toLocaleString("en-IN")}
                  </span>
                  {product.sale_price && product.sale_price < product.regular_price && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      ₹{product.regular_price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Inclusive of all local taxes</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  product.in_stock
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {product.in_stock ? `In Stock (${product.stock_quantity})` : "Out of Stock"}
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <span>Quantity:</span>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="p-2 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center font-bold font-mono text-sm">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock_quantity || 10, qty + 1))}
                  disabled={qty >= (product.stock_quantity || 10)}
                  className="p-2 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className="py-3 px-5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!product.in_stock}
                className="py-3 px-5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now (Checkout)</span>
              </button>
            </div>

            {/* Shipping & Delivery Guarantee Details */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Delivery Information</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-600 pl-6 list-disc">
                <li>
                  Estimated Delivery: <strong>{config?.estimated_delivery_days || "3-5 Business Days"}</strong>
                </li>
                {config?.free_shipping_min_order && config.free_shipping_min_order > 0 ? (
                  <li>
                    Free shipping on orders over <strong>₹{config.free_shipping_min_order}</strong>
                  </li>
                ) : null}
                <li>
                  Cash on Delivery (COD) supported upon door arrival.
                </li>
                <li>
                  Shipping to: <strong>{config?.allowed_countries || "India"}</strong>
                </li>
              </ul>
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm">Product Description</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center gap-2 shadow-lg">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] text-slate-500 font-medium truncate">{product.name}</p>
          <p className="text-sm font-black text-slate-900 font-mono">₹{product.effective_price.toLocaleString("en-IN")}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {added ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ShoppingCart className="w-3.5 h-3.5" />}
          <span>{added ? "Added" : "Cart"}</span>
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!product.in_stock}
          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: primaryColor }}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Buy Now</span>
        </button>
      </div>

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}

