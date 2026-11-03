"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist } from "@/lib/app-platform/wishlist-store";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
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
  Heart,
  MessageCircle,
} from "lucide-react";

export default function ProductDetailClient() {
  const params = useParams();
  const router = useRouter();

  const [activeSlug, setActiveSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);
  const [activeProductId, setActiveProductId] = useState<string>(() => getStoreRouteParams(params as any).productId);

  const [product, setProduct] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { addItem } = useVendorCart(activeSlug);
  const { isInWishlist, toggleItem } = useVendorWishlist(activeSlug);

  useEffect(() => {
    async function loadData() {
      const { slug: s, productId: pId } = getStoreRouteParams(params as any);
      setActiveSlug(s);
      setActiveProductId(pId);

      if (!s || !pId || pId === "sample") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [prod, cfg, storeProds] = await Promise.all([
          platformApi.getPublicStoreProduct(s, pId),
          platformApi.getPublicStoreConfig(s),
          platformApi.getPublicStoreProducts(s).catch(() => []),
        ]);
        setProduct(prod);
        setConfig(cfg);
        if (storeProds && Array.isArray(storeProds)) {
          setRelatedProducts(storeProds.filter((p: any) => p.id !== pId).slice(0, 4));
        }
        if (prod?.has_variants && prod.variants && prod.variants.length > 0) {
          const firstVar = prod.variants[0];
          setSelectedVariantId(firstVar.id);
          if (firstVar.images && firstVar.images.length > 0) {
            setActiveImage(firstVar.images[0]);
          } else if (prod?.images && prod.images.length > 0) {
            setActiveImage(prod.images[0].image_url);
          } else if (prod?.thumbnail_url) {
            setActiveImage(prod.thumbnail_url);
          }
        } else {
          if (prod?.images && prod.images.length > 0) {
            setActiveImage(prod.images[0].image_url);
          } else if (prod?.thumbnail_url) {
            setActiveImage(prod.thumbnail_url);
          }
        }
      } catch (e) {
        console.error("Failed to load product detail:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params]);

  // Dynamic browser title & favicon
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (product?.name && config?.store_name) {
        document.title = `${product.name} | ${config.store_name}`;
      } else if (config?.store_name) {
        document.title = config.store_name;
      }
      if (config?.logo_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) link.href = config.logo_url;
      }
    }
  }, [product, config]);

  const slug = activeSlug;
  const productId = activeProductId;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isKcAariWork = slug === "kcaariwork" || config?.store_slug === "kcaariwork" || config?.primary_color === "#062817";
  const primaryColor = config?.primary_color || (isKcAariWork ? "#062817" : "#2563EB");

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
              href={getStoreHref(slug)}
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

  const selectedVariant =
    product?.has_variants && product.variants && product.variants.length > 0
      ? product.variants.find((v: any) => v.id === selectedVariantId) || product.variants[0]
      : null;

  const imagesList =
    selectedVariant?.images && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images && product.images.length > 0
      ? product.images.map((img: any) => img.image_url)
      : product.thumbnail_url
      ? [product.thumbnail_url]
      : [];

  const currentPrice = selectedVariant?.price && selectedVariant.price > 0 ? selectedVariant.price : product.effective_price;
  const currentRegularPrice = selectedVariant?.price && selectedVariant.price > 0 ? selectedVariant.price : product.regular_price;
  const currentStock = selectedVariant ? selectedVariant.stock_quantity : (product.stock_quantity || 0);
  const isInStock = currentStock > 0 && product.status === "active";

  const handleAddToCart = () => {
    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      product_id: product.id,
      variant_id: selectedVariant ? selectedVariant.id : undefined,
      variant_name: selectedVariant ? selectedVariant.name : undefined,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      slug: product.slug,
      sku: selectedVariant?.sku || product.sku,
      price: currentRegularPrice,
      effective_price: currentPrice,
      thumbnail_url: (selectedVariant?.images && selectedVariant.images.length > 0) ? selectedVariant.images[0] : (product.thumbnail_url || (imagesList.length > 0 ? imagesList[0] : undefined)),
      quantity: qty,
      stock_quantity: currentStock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      product_id: product.id,
      variant_id: selectedVariant ? selectedVariant.id : undefined,
      variant_name: selectedVariant ? selectedVariant.name : undefined,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      slug: product.slug,
      sku: selectedVariant?.sku || product.sku,
      price: currentRegularPrice,
      effective_price: currentPrice,
      thumbnail_url: (selectedVariant?.images && selectedVariant.images.length > 0) ? selectedVariant.images[0] : (product.thumbnail_url || (imagesList.length > 0 ? imagesList[0] : undefined)),
      quantity: qty,
      stock_quantity: currentStock,
    });
    router.push(getStoreHref(slug, "/checkout"));
  };

  const isWishlisted = Boolean(product?.id && isInWishlist(product.id));

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      regular_price: product.regular_price,
      effective_price: currentPrice,
      sale_price: product.sale_price,
      thumbnail_url: product.thumbnail_url || (imagesList.length > 0 ? imagesList[0] : undefined),
      category_name: product.category_name,
      in_stock: isInStock,
    });
  };

  const discountPercent =
    product.sale_price && product.sale_price < product.regular_price
      ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
      : 0;

  // Dynamic business WhatsApp and display phone
  const rawBusinessPhone = config?.whatsapp_number || config?.contact_phone || config?.business_phone || "";
  const cleanDigits = rawBusinessPhone.replace(/[^0-9]/g, "");
  const whatsappPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  const whatsappOrderUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        `Hello ${config?.store_name || "Store"}! I am interested in purchasing "${product?.name}" (Price: ₹${currentPrice.toLocaleString("en-IN")}${selectedVariant ? `, Variant: ${selectedVariant.name}` : ""}). Please assist with ordering & custom sizing.`
      )}`
    : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} backHref={getStoreHref(slug)} backLabel="Back to Products" />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 sm:pb-8 flex-1 w-full space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href={getStoreHref(slug)} className="hover:text-blue-600 transition-colors">
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
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
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
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {product.category_name && (
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${isKcAariWork ? "bg-[#062817] text-amber-200 border border-[#D4AF37]/40" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                    {product.category_name}
                  </span>
                )}
                {isKcAariWork && (
                  <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#D4AF37] text-slate-950 uppercase tracking-wider shadow-xs">
                    👑 Royal Handcrafted Aari Work
                  </span>
                )}
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold text-slate-900 leading-tight ${isKcAariWork ? "font-serif sm:text-3xl text-[#062817]" : ""}`}>
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
                    ₹{currentPrice.toLocaleString("en-IN")}
                  </span>
                  {currentRegularPrice > currentPrice && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      ₹{currentRegularPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Inclusive of all local taxes</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isInStock
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {isInStock ? `In Stock (${currentStock})` : "Out of Stock"}
              </span>
            </div>

            {/* Product Variants Selector */}
            {product.has_variants && product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Option / Variant:
                  </label>
                  {selectedVariant && (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {selectedVariant.name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v: any) => {
                    const isSelected = v.id === (selectedVariant?.id || "");
                    const hasStock = v.stock_quantity > 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          if (v.images && v.images.length > 0) {
                            setActiveImage(v.images[0]);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100"
                            : hasStock
                            ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60 line-through"
                        }`}
                      >
                        <span>{v.name}</span>
                        {v.price && v.price !== product.regular_price && (
                          <span className={`text-[11px] font-mono ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                            ₹{v.price}
                          </span>
                        )}
                        {hasStock ? (
                          <span className={`text-[10px] font-normal ${isSelected ? "text-blue-100" : "text-emerald-600"}`}>
                            ({v.stock_quantity})
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-normal">Sold Out</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  onClick={() => setQty(Math.min(currentStock || 10, qty + 1))}
                  disabled={qty >= (currentStock || 10)}
                  className="p-2 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTA Buttons & WhatsApp Order */}
            <div className="space-y-2.5 pt-2">
              {whatsappOrderUrl && (
                <a
                  href={whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Order via WhatsApp (Custom Sizing Assistance)</span>
                </a>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!isInStock}
                  className="py-3 px-5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
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
                  disabled={!isInStock}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy Now (Checkout)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isWishlisted
                    ? "bg-rose-50 border-rose-200 text-rose-700 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-rose-50/50 hover:border-rose-200 hover:text-rose-600"
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                <span>{isWishlisted ? "Saved in Your Wishlist (Click to Remove)" : "Save to Wishlist"}</span>
              </button>
            </div>

            {/* Custom Saree Match Callout for KC Aari Work */}
            {isKcAariWork && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#062817] via-[#0A3520] to-[#041D10] text-white border border-[#D4AF37]/50 shadow-md space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👑</span>
                  <span className="text-[#D4AF37] font-bold text-xs uppercase tracking-wider font-serif">
                    Custom Saree Matching Guarantee
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-relaxed font-light">
                  Send your saree photo to our design team on WhatsApp. We match the exact thread shade, zari contrast, and neckline to your bridal saree.
                </p>
              </div>
            )}

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

        {/* Related Products from this Store */}
        {relatedProducts.length > 0 && (
          <section className="pt-8 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-base sm:text-lg font-bold text-slate-900 ${isKcAariWork ? "font-serif text-[#062817]" : ""}`}>
                  {isKcAariWork ? "More Handcrafted Bridal Blouses" : `More from ${config?.store_name || "This Store"}`}
                </h3>
                <p className="text-xs text-slate-500">Explore other popular designs from our catalog</p>
              </div>
              <Link
                href={getStoreHref(slug)}
                className="text-xs font-bold hover:underline flex items-center gap-1"
                style={{ color: primaryColor }}
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((rel) => {
                const relHref = getStoreHref(slug, `/products/${rel.id}`);
                return (
                  <Link
                    key={rel.id}
                    href={relHref}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                  >
                    <div className="aspect-[4/5] bg-slate-100 overflow-hidden relative">
                      <img
                        src={rel.thumbnail_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80"}
                        alt={rel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h4 className={`text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors ${isKcAariWork ? "font-serif" : ""}`}>
                        {rel.name}
                      </h4>
                      <div className="flex items-baseline gap-1.5 pt-1">
                        <span className="text-xs font-black text-slate-900 font-mono">
                          ₹{(rel.effective_price || rel.regular_price).toLocaleString("en-IN")}
                        </span>
                        {rel.sale_price && (
                          <span className="text-[10px] text-slate-400 line-through font-mono">
                            ₹{rel.regular_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center gap-2 shadow-lg">
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-[10px] text-slate-500 font-medium truncate">
            {selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name}
          </p>
          <p className="text-sm font-black text-slate-900 font-mono">₹{currentPrice.toLocaleString("en-IN")}</p>
        </div>
        <button
          type="button"
          onClick={handleToggleWishlist}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          title="Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
        </button>
        <button
          onClick={handleAddToCart}
          disabled={!isInStock}
          className="py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {added ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ShoppingCart className="w-3.5 h-3.5" />}
          <span>{added ? "Added" : "Cart"}</span>
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!isInStock}
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

