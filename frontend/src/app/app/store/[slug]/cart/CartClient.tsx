"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist } from "@/lib/app-platform/wishlist-store";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import PixelInjector from "@/components/app-platform/store/PixelInjector";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Heart,
} from "lucide-react";

export default function CartClient() {
  const params = useParams();
  const router = useRouter();
  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { items, itemCount, subtotal, updateQty, removeItem, clearCart, isLoaded } =
    useVendorCart(slug);
  const { toggleItem: toggleWishlist } = useVendorWishlist(slug);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    async function loadConfig() {
      try {
        const cfg = await platformApi.getPublicStoreConfig(resolvedSlug);
        setConfig(cfg);
      } catch (e) {
        console.error("Failed to load store config:", e);
      } finally {
        setLoading(false);
      }
    }
    if (resolvedSlug) {
      loadConfig();
    }
  }, [params]);

  useEffect(() => {
    if (typeof document !== "undefined" && config?.store_name) {
      document.title = `Shopping Cart | ${config.store_name}`;
      if (config.logo_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) link.href = config.logo_url;
      }
    }
  }, [config]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const primaryColor = config?.primary_color || "#2563EB";
  const freeMin = Number(config?.free_shipping_min_order) || 0;
  const isFreeDelivery = freeMin > 0 && subtotal >= freeMin;
  const shippingCharge =
    config?.shipping_enabled !== false
      ? isFreeDelivery
        ? 0
        : Number(config?.shipping_charge) || 0
      : 0;
  const finalTotal = subtotal + shippingCharge;
  const freeShippingProgress = freeMin > 0 ? Math.min(100, Math.round((subtotal / freeMin) * 100)) : 100;
  const amountNeededForFree = freeMin > subtotal ? freeMin - subtotal : 0;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col font-sans">
      <PixelInjector config={config} pageTitle={`Cart | ${config?.store_name || "Store"}`} />
      <StoreHeader slug={slug} config={config} backHref={getStoreHref(slug)} backLabel="Back to Products" />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 flex-1 w-full max-w-full overflow-hidden">
        {/* Page Title */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Shopping Cart
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Items reserved for you at <strong>{config?.store_name}</strong>
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Looks like you haven't added anything to your cart from {config?.store_name} yet. Explore the catalog and discover exciting deals!
            </p>
            <div className="pt-2">
              <Link
                href={getStoreHref(slug)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Start Shopping Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left 2 Cols: Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Free Delivery Threshold Banner */}
              {freeMin > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <Truck className="w-4 h-4 text-blue-600" />
                      {isFreeDelivery ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Congratulations! You have unlocked FREE Delivery!
                        </span>
                      ) : (
                        <span>
                          Add <strong className="text-blue-600">₹{amountNeededForFree.toLocaleString("en-IN")}</strong> more for <strong>FREE Delivery</strong>
                        </span>
                      )}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{freeShippingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFreeDelivery ? "bg-emerald-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={getStoreHref(slug, `/products/${item.product_id}`)}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        {item.variant_name && (
                          <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Option: {item.variant_name}
                          </span>
                        )}
                        {item.sku && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                        )}
                        <p className="text-xs font-semibold text-slate-900 mt-1">
                          ₹{item.effective_price.toLocaleString("en-IN")}
                          {item.price > item.effective_price && (
                            <span className="ml-1.5 text-[11px] text-slate-400 line-through">
                              ₹{item.price.toLocaleString("en-IN")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Selector & Item Total */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-xs font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Increase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <p className="text-sm font-bold text-slate-900 font-mono">
                          ₹{(item.effective_price * item.quantity).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            toggleWishlist({
                              id: item.product_id,
                              product_id: item.product_id,
                              name: item.name,
                              slug: item.slug,
                              regular_price: item.price,
                              effective_price: item.effective_price,
                              thumbnail_url: item.thumbnail_url,
                              in_stock: true,
                            });
                            removeItem(item.id);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Move to Wishlist"
                        >
                          <Heart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={getStoreHref(slug)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  ← Continue Shopping
                </Link>
                <span className="text-xs text-slate-400">
                  {itemCount} {itemCount === 1 ? "item" : "items"} in cart
                </span>
              </div>
            </div>

            {/* Right Col: Order Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-24">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-semibold text-slate-900 font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Estimated Shipping:
                  </span>
                  {isFreeDelivery ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : shippingCharge === 0 ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-semibold text-slate-900 font-mono">₹{shippingCharge.toLocaleString("en-IN")}</span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-base font-bold text-slate-900">
                  <span>Estimated Total</span>
                  <span className="text-blue-700 font-mono">₹{finalTotal.toLocaleString("en-IN")}</span>
                </div>
                <p className="text-[11px] text-slate-400 text-right">Taxes & fees calculated at checkout</p>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  onClick={() => router.push(getStoreHref(slug, "/checkout"))}
                  className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safe & Verified Vendor Storefront</span>
                  </div>
                  <p>Cash on Delivery is supported. Pay when your parcel arrives safely.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Checkout Bar */}
      {items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center justify-between gap-3 shadow-lg">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Payable</p>
            <p className="text-base font-extrabold text-blue-700 font-mono">₹{finalTotal.toLocaleString("en-IN")}</p>
          </div>
          <button
            onClick={() => router.push(getStoreHref(slug, "/checkout"))}
            className="py-2.5 px-5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}

