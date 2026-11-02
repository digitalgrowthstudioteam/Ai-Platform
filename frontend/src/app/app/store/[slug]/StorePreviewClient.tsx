"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import {
  Store,
  ShoppingCart,
  Star,
  CheckCircle2,
  X,
  Smartphone,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  AlertCircle,
  Truck,
} from "lucide-react";

export default function StorePreviewClient() {
  const params = useParams();
  const slug = (params?.slug as string) || "abc";

  const [config, setConfig] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Category filter
  const [selectedCat, setSelectedCat] = useState<string>("");

  // Checkout modal
  const [checkoutProduct, setCheckoutProduct] = useState<any>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  useEffect(() => {
    async function loadStore() {
      setLoading(true);
      setError(null);
      try {
        const [cfg, bans, cats, prods] = await Promise.all([
          platformApi.getPublicStoreConfig(slug),
          platformApi.getPublicStoreBanners(slug),
          platformApi.getPublicStoreCategories(slug),
          platformApi.getPublicStoreProducts(slug),
        ]);
        setConfig(cfg);
        setBanners(bans);
        setCategories(cats);
        setProducts(prods);
      } catch (err: any) {
        setError(err.message || "Failed to load store.");
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadStore();
    }
  }, [slug]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;
    setOrdering(true);
    try {
      const order = await platformApi.createPublicOrder(slug, {
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        payment_method: "COD",
        items: [
          {
            product_id: checkoutProduct.id,
            quantity: checkoutQty,
          },
        ],
        notes: "Placed via Web Storefront Preview",
      });
      setOrderSuccess(order);
    } catch (e: any) {
      alert(e.message || "Failed to place order");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-xs">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Store Not Available</h2>
          <p className="text-xs text-slate-500 mt-2">{error || "Could not resolve store configuration for this subdomain."}</p>
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
      {/* Store Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logo_url ? (
              <img src={config.logo_url} alt={config.store_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {config.store_name[0]}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{config.store_name}</h1>
              <p className="text-xs text-slate-500 line-clamp-1">{config.description || "Official Online Store"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.free_shipping_min_order && config.free_shipping_min_order > 0 ? (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Truck className="w-3.5 h-3.5" />
                Free Delivery above ₹{config.free_shipping_min_order}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              COD Available
            </span>
          </div>
        </div>
      </header>

      {/* Hero Banners */}
      {banners.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-6 w-full">
          <div
            className="w-full rounded-2xl overflow-hidden relative shadow-sm text-white p-8 md:p-12 flex flex-col justify-end min-h-[220px]"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.2)), url(${banners[0].image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {banners[0].promo_offer && (
              <span
                className="self-start px-3 py-1 rounded-full text-xs font-bold text-white mb-2 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {banners[0].promo_offer}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{banners[0].title}</h2>
            {banners[0].description && <p className="text-sm text-slate-200 mt-1 max-w-xl">{banners[0].description}</p>}
          </div>
        </div>
      )}

      {/* Main Catalog */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={p.thumbnail_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"}
                    alt={p.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
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

                <div className="p-4">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{p.category_name || "General"}</p>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-base font-extrabold text-slate-900">₹{p.effective_price.toLocaleString("en-IN")}</span>
                  {p.sale_price && p.sale_price > 0 && (
                    <span className="text-xs text-slate-400 line-through">₹{p.regular_price}</span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setCheckoutProduct(p);
                    setCheckoutQty(1);
                    setOrderSuccess(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Order with COD
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Store Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-slate-900 mb-1">{config.store_name}</h4>
            <p className="text-slate-400">{config.business_address || "Online Storefront"}</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Customer Care</h4>
            <p className="text-slate-400">Email: {config.contact_email || "N/A"}</p>
            <p className="text-slate-400">Phone: {config.contact_phone || "N/A"}</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Operating Hours</h4>
            <p className="text-slate-400">{config.opening_hours}</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-100 text-center text-slate-400 text-[11px]">
          Powered by Digital Growth Studio Multi-Vendor App Platform
        </div>
      </footer>

      {/* Checkout Modal */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {orderSuccess ? "Order Confirmed!" : "Checkout Order (Cash on Delivery)"}
              </h3>
              <button onClick={() => setCheckoutProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Thank you for your order!</h4>
                <p className="text-xs text-slate-600 font-mono">
                  Order Number: <strong className="text-blue-600">{orderSuccess.order_number}</strong>
                </p>
                <p className="text-xs text-slate-500">
                  Total: ₹{orderSuccess.total_amount.toLocaleString("en-IN")} • Payment: {orderSuccess.payment_method}
                </p>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-left">
                  This order has been securely saved under vendor <strong>{config.store_name}</strong> and is visible in their dashboard.
                </div>
                <button
                  onClick={() => setCheckoutProduct(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="mt-4 space-y-3.5 text-xs">
                {/* Product Summary */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{checkoutProduct.name}</p>
                    <p className="text-slate-500">Price: ₹{checkoutProduct.effective_price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={checkoutQty}
                      onChange={(e) => setCheckoutQty(parseInt(e.target.value, 10) || 1)}
                      className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Delivery Address</label>
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="House/Flat number, Street name, City, Pincode"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between font-bold">
                  <span>Total Payable on Delivery:</span>
                  <span className="text-blue-700 text-sm">₹{(checkoutProduct.effective_price * checkoutQty).toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCheckoutProduct(null)}
                    className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ordering}
                    className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-xs disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {ordering ? "Placing Order..." : "Confirm COD Order"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

