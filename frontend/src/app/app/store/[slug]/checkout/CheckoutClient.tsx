"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import {
  CreditCard,
  Banknote,
  Truck,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";

export default function CheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "abc";

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items, subtotal, clearCart, isLoaded } = useVendorCart(slug);

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [orderNotes, setOrderNotes] = useState("");

  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await platformApi.getPublicStoreConfig(slug);
        setConfig(cfg);
        if (cfg.cod_enabled === false && cfg.razorpay_enabled) {
          setPaymentMethod("ONLINE");
        }
      } catch (e) {
        console.error("Failed to load store config:", e);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadConfig();
    }

    // Auto-fill previous details if present in localStorage
    try {
      const savedName = localStorage.getItem("dgs_customer_name");
      const savedPhone = localStorage.getItem("dgs_customer_phone");
      const savedAddress = localStorage.getItem("dgs_customer_address");
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
      if (savedAddress) setStreetAddress(savedAddress);
    } catch (e) {}
  }, [slug]);

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
  const shippingFee =
    config?.shipping_enabled !== false
      ? isFreeDelivery
        ? 0
        : Number(config?.shipping_charge) || 0
      : 0;
  const codFee = paymentMethod === "COD" ? Number(config?.cod_charge) || 0 : 0;
  const grandTotal = subtotal + shippingFee + codFee;

  // Pincode validation
  const isPincodeRestricted = config?.serviceable_pincodes_type === "restricted";
  const allowedPincodesList = (config?.serviceable_pincodes || "")
    .split(/[\n, ]+/)
    .map((p: string) => p.trim())
    .filter(Boolean);
  const pincodeError =
    isPincodeRestricted &&
    pincode.length === 6 &&
    !allowedPincodesList.includes(pincode);
  const canPlaceOrder =
    !isPincodeRestricted || (pincode.length === 6 && allowedPincodesList.includes(pincode));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Your cart is empty. Please add products to checkout.");
      return;
    }
    if (!canPlaceOrder) {
      setError("Entered delivery pincode is outside this vendor's serviceable zones.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fullAddress = `${streetAddress.trim()}, ${city.trim()}, ${stateName.trim()} - PIN: ${pincode.trim()} (${config?.allowed_countries || "India"})`;

      // Cache details for fast checkout next time
      try {
        localStorage.setItem("dgs_customer_name", customerName);
        localStorage.setItem("dgs_customer_phone", customerPhone);
        localStorage.setItem("dgs_customer_address", streetAddress);
      } catch (e) {}

      const orderPayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        shipping_address: fullAddress,
        payment_method: paymentMethod,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        notes: orderNotes.trim() || `Order placed via Web Storefront (Est: ${config?.estimated_delivery_days || "3-5 Days"})`,
      };

      const order = await platformApi.createPublicOrder(slug, orderPayload);

      // Clear this vendor's cart
      clearCart();

      // Navigate directly to the dedicated Order Detail Page
      router.push(`/app/store/${slug}/order/${order.id || order.order_number}`);
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} backHref={`/app/store/${slug}/cart`} backLabel="Back to Cart" />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Breadcrumb / Step Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href={`/app/store/${slug}`} className="hover:text-blue-600 transition-colors">
            {config?.store_name || "Store"}
          </Link>
          <span>/</span>
          <Link href={`/app/store/${slug}/cart`} className="hover:text-blue-600 transition-colors">
            Cart ({items.length})
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Secure Checkout</span>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
            <p className="text-xs text-slate-500">
              Please add items from {config?.store_name} to your cart before proceeding to checkout.
            </p>
            <div className="pt-2">
              <Link
                href={`/app/store/${slug}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                Explore Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left 2 Cols: Detailed Checkout Sections */}
            <div className="lg:col-span-2 space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Customer Contact Information */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Mobile Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-blue-600 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">For delivery updates & courier dispatch</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Email Address <span className="text-slate-400 font-normal">(Optional for order receipt)</span>
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. rahul.sharma@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery Address & Pincode */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Shipping & Delivery Address</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Street Address / House No. / Building <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Flat/House number, Apartment name, Street name, Locality"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        State <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Delivery Pincode <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 400001"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-blue-600 transition-colors"
                      />
                    </div>
                  </div>

                  {pincodeError && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Delivery Zone Notice:</span> Pincode{" "}
                        <strong>{pincode}</strong> is outside this store's serviceable zones. Please check your pincode or contact merchant support.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Serviceable Country: <strong>{config?.allowed_countries || "India"}</strong> • Expected Delivery: <strong>{config?.estimated_delivery_days || "3-5 Business Days"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Payment Method Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Payment Option</h3>
                </div>

                <div className="space-y-3">
                  {config?.cod_enabled !== false && (
                    <label
                      className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === "COD"
                          ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "COD"}
                        onChange={() => setPaymentMethod("COD")}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <Banknote className="w-4 h-4 text-emerald-600" />
                            Cash on Delivery (COD)
                          </span>
                          {config?.cod_charge && config.cod_charge > 0 ? (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              +₹{config.cod_charge} Handling
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Zero Extra Fee
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Pay cash or UPI directly to the delivery courier when your order arrives at your doorstep.
                        </p>
                      </div>
                    </label>
                  )}

                  {config?.razorpay_enabled && (
                    <label
                      className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === "ONLINE"
                          ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "ONLINE"}
                        onChange={() => setPaymentMethod("ONLINE")}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            Online Payment (Razorpay Secure)
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Instant Confirmation
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          UPI (GPay, PhonePe, Paytm), Credit/Debit Card, Net Banking & Wallets.
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <label className="font-bold text-slate-900 text-xs block mb-1">
                  Delivery Notes / Landmark Instructions <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Leave package with security guard, Near water tank"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-600 transition-colors"
                />
              </div>
            </div>

            {/* Right Col: Order Summary & Placement */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Your Order Review</h3>
                <Link href={`/app/store/${slug}/cart`} className="text-xs text-blue-600 hover:underline font-semibold">
                  Edit Cart
                </Link>
              </div>

              {/* Items List Preview */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
                {items.map((it) => (
                  <div key={it.product_id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {it.thumbnail_url ? (
                        <img src={it.thumbnail_url} alt={it.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 line-clamp-1">{it.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Qty: {it.quantity} × ₹{it.effective_price}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 font-mono shrink-0">
                      ₹{(it.effective_price * it.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-900 font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Delivery Fee:
                  </span>
                  {isFreeDelivery ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : shippingFee === 0 ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-semibold text-slate-900 font-mono">₹{shippingFee.toLocaleString("en-IN")}</span>
                  )}
                </div>

                {freeMin > 0 && !isFreeDelivery && (
                  <div className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center justify-between">
                    <span>Add ₹{(freeMin - subtotal).toLocaleString("en-IN")} more for Free Delivery!</span>
                    <span className="font-semibold">MOV ₹{freeMin}</span>
                  </div>
                )}

                {codFee > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Cash on Delivery Handling:</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{codFee.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="text-blue-700 font-mono text-lg">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Estimated Arrival: <strong>{config?.estimated_delivery_days || "3-5 Business Days"}</strong></span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={submitting || !canPlaceOrder}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? (
                    <span>Placing Your Order...</span>
                  ) : (
                    <>
                      <span>{paymentMethod === "COD" ? "Confirm Order with Cash on Delivery" : "Proceed to Secure Payment"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safe Merchant Dispatch</span>
                  </div>
                  <p>
                    Your order will be directly fulfilled by <strong>{config?.store_name}</strong>. A tracking confirmation page will load immediately upon placement.
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}

