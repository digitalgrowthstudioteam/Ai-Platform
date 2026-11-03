"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import {
  Store,
  ShoppingCart,
  Star,
  Check,
  Zap,
  ArrowRight,
  Package,
} from "lucide-react";

export default function StorePreviewClient() {
  const params = useParams();
  const router = useRouter();
  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);

  const [config, setConfig] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowServerNotice, setSlowServerNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Category filter
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  const { addItem } = useVendorCart(slug);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    // 1. Instant Cache: Check if we have cached storefront data to render immediately (0ms)
    let hasCache = false;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(`dgs_store_cache_${resolvedSlug}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.cfg) {
            setConfig(parsed.cfg);
            setBanners(parsed.bans || []);
            setCategories(parsed.cats || []);
            setProducts(parsed.prods || []);
            setLoading(false);
            hasCache = true;
          }
        } catch (e) {}
      }
    }

    // 2. Slow server timeout: Show helpful note if backend is waking up from sleep
    const timer = setTimeout(() => {
      setSlowServerNotice(true);
    }, 2800);

    async function loadStore() {
      if (!hasCache) {
        setLoading(true);
      }
      setError(null);
      try {
        const [cfg, bans, cats, prods] = await Promise.all([
          platformApi.getPublicStoreConfig(resolvedSlug),
          platformApi.getPublicStoreBanners(resolvedSlug),
          platformApi.getPublicStoreCategories(resolvedSlug),
          platformApi.getPublicStoreProducts(resolvedSlug),
        ]);
        setConfig(cfg);
        setBanners(bans);
        setCategories(cats);
        setProducts(prods);

        // Save fresh data to session cache
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `dgs_store_cache_${resolvedSlug}`,
            JSON.stringify({ cfg, bans, cats, prods })
          );
        }
      } catch (err: any) {
        if (!hasCache) {
          setError(err.message || "Failed to load store.");
        }
      } finally {
        clearTimeout(timer);
        setLoading(false);
        setSlowServerNotice(false);
      }
    }
    if (resolvedSlug) {
      loadStore();
    }

    return () => clearTimeout(timer);
  }, [params]);

  // Update browser tab title and favicon to match store branding
  useEffect(() => {
    if (typeof document !== "undefined" && config?.store_name) {
      document.title = `${config.store_name} | Official Online Store`;
      if (config.logo_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) {
          link.href = config.logo_url;
        }
      }
    }
  }, [config]);

  const handleAddToCart = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: p.id,
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: p.regular_price,
      effective_price: p.effective_price,
      thumbnail_url: p.thumbnail_url,
      quantity: 1,
      stock_quantity: p.stock_quantity,
    });
    setAddedMap((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [p.id]: false }));
    }, 1800);
  };

  const handleBuyNow = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: p.id,
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: p.regular_price,
      effective_price: p.effective_price,
      thumbnail_url: p.thumbnail_url,
      quantity: 1,
      stock_quantity: p.stock_quantity,
    });
    router.push(getStoreHref(slug, "/checkout"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        {slowServerNotice && (
          <div className="text-center space-y-1 animate-pulse">
            <p className="text-xs font-semibold text-slate-700">Connecting to secure store server...</p>
            <p className="text-[11px] text-slate-400">Loading catalog and theme settings</p>
          </div>
        )}
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-xs space-y-3">
          <Store className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Store Not Available</h2>
          <p className="text-xs text-slate-500">{error || "Could not resolve store configuration for this address."}</p>
        </div>
      </div>
    );
  }

  const filteredProducts = selectedCat
    ? products.filter((p) => p.category_id === selectedCat)
    : products;

  const primaryColor = config.primary_color || "#2563EB";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} />

      {/* Hero Banners Carousel */}
      {banners.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-6 w-full">
          <div className="relative rounded-3xl overflow-hidden shadow-xs border border-slate-200">
            {banners.map((b, i) => (
              <div key={b.id || i} className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden">
                <img
                  src={b.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80"}
                  alt={b.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent flex items-center p-6 sm:p-10">
                  <div className="max-w-md space-y-2 text-white">
                    {b.promo_offer && (
                      <span className="inline-block px-3 py-1 rounded-full bg-emerald-500 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-xs">
                        {b.promo_offer}
                      </span>
                    )}
                    <h2 className="text-xl sm:text-3xl font-black leading-tight text-white">{b.title}</h2>
                    {b.description && <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">{b.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Catalog View */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCat("")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === ""
                  ? "text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
              style={selectedCat === "" ? { backgroundColor: primaryColor } : {}}
            >
              All Products ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCat === c.id
                    ? "text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
                style={selectedCat === c.id ? { backgroundColor: primaryColor } : {}}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">No Products Found</h3>
            <p className="text-xs text-slate-500">There are no products available in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((p) => {
              const isAdded = Boolean(addedMap[p.id]);
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(getStoreHref(slug, `/products/${p.id}`))}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <Link href={getStoreHref(slug, `/products/${p.id}`)} className="block">
                    <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                      <img
                        src={p.thumbnail_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {p.is_featured && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-white" /> Featured
                        </span>
                      )}
                      {p.sale_price && p.sale_price > 0 && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold shadow-xs">
                          SALE
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 sm:p-4">
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        {p.category_name || "General"}
                      </p>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </Link>

                  {/* Actions & Pricing */}
                  <div className="p-3.5 sm:p-4 pt-0 space-y-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                        ₹{p.effective_price.toLocaleString("en-IN")}
                      </span>
                      {p.sale_price && p.sale_price > 0 && (
                        <span className="text-[11px] text-slate-400 line-through font-mono">
                          ₹{p.regular_price}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                      <button
                        onClick={(e) => handleAddToCart(e, p)}
                        disabled={!p.in_stock}
                        className="w-full py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 hover:bg-slate-50 disabled:opacity-40"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                        title="Add to shopping cart"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Added!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleBuyNow(e, p)}
                        disabled={!p.in_stock}
                        className="w-full py-2 px-2.5 rounded-xl text-[11px] font-bold text-white shadow-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1 disabled:opacity-40"
                        style={{ backgroundColor: primaryColor }}
                        title="Proceed straight to checkout"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Buy Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}
