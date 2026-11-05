"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist } from "@/lib/app-platform/wishlist-store";
import { getStoreHref } from "@/lib/app-platform/store-route-helper";
import { pixelTracker } from "@/lib/app-platform/pixel-tracker";
import {
  GLAM_STREE_PRODUCTS,
  GLAM_STREE_SIZES,
  GLAM_STREE_SHAPES,
  GLAM_STREE_REVIEWS,
  GLAM_STREE_FAQS,
  GlamNailProduct,
} from "@/lib/app-platform/glam-stree-data";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  Heart,
  User,
  Star,
  Check,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Ruler,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
  Share2,
  Package,
  Droplets,
  Clock,
  Layers,
} from "lucide-react";
import PolicyModal, { PolicyType } from "@/components/app-platform/store/PolicyModal";

interface GlamStreeProductThemeProps {
  slug: string;
  config: any;
  product: any;
  relatedProducts?: any[];
}

export default function GlamStreeProductTheme({
  slug,
  config,
  product,
  relatedProducts = [],
}: GlamStreeProductThemeProps) {
  const router = useRouter();
  const { addItem, itemCount: cartCount } = useVendorCart(slug);
  const { isInWishlist, toggleItem } = useVendorWishlist(slug);

  // Fallback to rich default product if requested product is sample or not found
  const matchedDefault =
    GLAM_STREE_PRODUCTS.find((p) => p.id === product?.id || p.slug === product?.slug) ||
    GLAM_STREE_PRODUCTS[0];

  const currentProduct: GlamNailProduct = {
    id: product?.id || matchedDefault.id,
    name: product?.name || matchedDefault.name,
    slug: product?.slug || matchedDefault.slug,
    category_id: product?.category_id || matchedDefault.category_id,
    category_name: product?.category_name || matchedDefault.category_name,
    regular_price: product?.regular_price || matchedDefault.regular_price,
    sale_price: product?.effective_price || product?.sale_price || matchedDefault.sale_price,
    effective_price: product?.effective_price || product?.sale_price || matchedDefault.effective_price,
    discount_percentage:
      product?.regular_price && product?.sale_price
        ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
        : matchedDefault.discount_percentage,
    thumbnail_url: product?.thumbnail_url || matchedDefault.thumbnail_url,
    images:
      product?.images && product.images.length > 0
        ? product.images.map((im: any) => (typeof im === "string" ? im : im.image_url))
        : matchedDefault.images,
    rating: matchedDefault.rating,
    review_count: matchedDefault.review_count,
    description: product?.description || matchedDefault.description,
    shape: matchedDefault.shape,
    finish: matchedDefault.finish,
    in_stock: product?.in_stock ?? true,
    stock_quantity: product?.stock_quantity ?? 45,
  };

  const [activeImage, setActiveImage] = useState<string>(
    currentProduct.images[0] || currentProduct.thumbnail_url
  );
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [selectedShape, setSelectedShape] = useState<string>("Almond");
  const [quantity, setQuantity] = useState<number>(1);
  const [added, setAdded] = useState(false);
  const [sizingModalOpen, setSizingModalOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("details");
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sess = localStorage.getItem(`dgs_customer_session_${slug}`);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed?.name && parsed?.isLoggedIn) {
          const first = parsed.name.trim().split(" ")[0];
          setCustomerName(first);
        }
      }
    } catch (e) {}
  }, [slug]);

  const brandName = config?.store_name || "Glam stree nails";
  const brandPhone = config?.contact_phone || "7499904962";
  const brandEmail = config?.contact_email || "apekshajondhale1111@gmail.com";
  const brandAddress = config?.business_address || "Pune, Maharashtra, India";
  const cleanPhone = brandPhone.replace(/[^0-9]/g, "");
  const inWish = isInWishlist(currentProduct.id);

  const handleAddToCart = () => {
    addItem({
      id: currentProduct.id,
      product_id: currentProduct.id,
      name: `${currentProduct.name} (${selectedSize} • ${selectedShape})`,
      slug: currentProduct.slug,
      sku: `GS-${currentProduct.id.slice(0, 8)}-${selectedSize}`,
      price: currentProduct.regular_price,
      effective_price: currentProduct.effective_price,
      thumbnail_url: activeImage || currentProduct.thumbnail_url,
      quantity: quantity,
      stock_quantity: currentProduct.stock_quantity,
    });
    pixelTracker.trackAddToCart(config, {
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.effective_price,
      quantity: quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    pixelTracker.trackInitiateCheckout(config, {
      total: currentProduct.effective_price * quantity,
      itemCount: quantity,
    });
    router.push(getStoreHref(slug, "/checkout"));
  };

  const handleToggleWishlist = () => {
    toggleItem({
      id: currentProduct.id,
      product_id: currentProduct.id,
      name: currentProduct.name,
      slug: currentProduct.slug,
      regular_price: currentProduct.regular_price,
      effective_price: currentProduct.effective_price,
      sale_price: currentProduct.sale_price,
      thumbnail_url: currentProduct.thumbnail_url,
      category_name: currentProduct.category_name,
      in_stock: currentProduct.in_stock,
    });
  };

  const getPolicyContent = (type: PolicyType): string => {
    switch (type) {
      case "terms":
        return config?.terms_and_conditions || "";
      case "privacy":
        return config?.privacy_policy || "";
      case "shipping":
        return config?.shipping_policy || "";
      case "refund":
        return config?.refund_policy || "";
      default:
        return "";
    }
  };

  const recommendations =
    relatedProducts && relatedProducts.length > 0
      ? relatedProducts
      : GLAM_STREE_PRODUCTS.filter((p) => p.id !== currentProduct.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 flex flex-col font-sans selection:bg-pink-100 selection:text-pink-900 pb-20 sm:pb-0">
      {/* 1. TOP ANNOUNCEMENT BAR (Screenshot 3) */}
      <div className="bg-[#0b192c] text-white text-[11px] sm:text-xs py-2 px-4 tracking-wide z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="bg-pink-500/20 text-pink-300 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
              PROMO
            </span>
            <span className="font-medium truncate">
              Flat 10% off with coupon <strong className="text-yellow-300 font-black">FIRST10</strong> | Free Shipping above ₹999
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300 text-[11px]">
            <span>Helpline: +91 {brandPhone}</span>
          </div>
        </div>
      </div>

      {/* 2. NAVBAR (Standard Left-Aligned Brand Logo) */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            {/* Standard Left-Aligned Brand Logo */}
            <Link href={getStoreHref(slug, "/")} className="flex items-center gap-2 group select-none shrink-0">
              {config?.logo_url ? (
                <img
                  src={config.logo_url}
                  alt={brandName}
                  className="h-9 sm:h-11 max-w-[170px] sm:max-w-[210px] object-contain group-hover:scale-102 transition-transform"
                />
              ) : (
                <div className="flex flex-col">
                  <span className="font-serif text-lg sm:text-2xl font-black tracking-tight text-[#0b192c] block uppercase leading-none">
                    {brandName}
                  </span>
                  <span className="text-[9px] font-sans font-bold uppercase tracking-[0.25em] text-pink-600 block mt-0.5">
                    Luxury Press-On Studio
                  </span>
                </div>
              )}
            </Link>

            <Link
              href={getStoreHref(slug, "/categories")}
              className="p-1.5 px-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold border border-slate-200"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              <span>Back to Collection</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href={getStoreHref(slug, "/account")}
              className="p-2 text-slate-700 hover:text-[#0b192c] hover:bg-slate-100 rounded-full transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold"
              title="Customer Account"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{customerName || "Login"}</span>
            </Link>

            <Link
              href={getStoreHref(slug, "/cart")}
              className="relative p-2 text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#0b192c] text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* 3. BREADCRUMB */}
      <div className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 w-full">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href={getStoreHref(slug, "/")} className="hover:text-slate-700">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={getStoreHref(slug, "/categories")} className="hover:text-slate-700">
            Press On Nails
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-800 font-semibold truncate max-w-xs sm:max-w-md">
            {currentProduct.name}
          </span>
        </div>
      </div>

      {/* 4. MAIN PRODUCT DETAIL SECTION (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Gallery & Thumbnails */}
          <div className="md:col-span-6 space-y-3">
            {/* Main Featured Image */}
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-sm">
              <img
                src={activeImage}
                alt={currentProduct.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
              <div className="absolute top-3 left-3 bg-yellow-400 text-slate-900 text-xs font-black px-2.5 py-1 rounded-md shadow-xs uppercase">
                {currentProduct.discount_percentage}% OFF
              </div>
              <button
                onClick={handleToggleWishlist}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-pink-600 transition-colors shadow-xs"
              >
                <Heart className={`w-5 h-5 ${inWish ? "fill-pink-600 text-pink-600" : ""}`} />
              </button>
            </div>

            {/* Thumbnail Strip */}
            {currentProduct.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {currentProduct.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(imgUrl)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImage === imgUrl
                        ? "border-[#0b192c] shadow-sm scale-102"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Buying Controls */}
          <div className="md:col-span-6 space-y-5">
            <div>
              {/* Star Rating Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-black text-slate-900">5.0</span>
                <span className="text-xs text-slate-400">({currentProduct.review_count} reviews)</span>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full ml-1">
                  In Stock
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c] tracking-tight leading-snug">
                {currentProduct.name}
              </h1>

              {/* Price Block */}
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  Rs. {currentProduct.effective_price}.00
                </span>
                <span className="text-base text-slate-400 line-through">
                  Rs. {currentProduct.regular_price}.00
                </span>
                <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md uppercase">
                  Save ₹{currentProduct.regular_price - currentProduct.effective_price}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mt-1">Inclusive of all taxes</p>
            </div>

            {/* Offer Callout Banner (Screenshot 3) */}
            <div className="bg-pink-50/70 border border-pink-200/80 rounded-2xl p-3 text-xs text-pink-900 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-pink-600 shrink-0" />
              <span>
                <strong>Free Shipping</strong> on all Prepaid Orders | Extra 10% off with coupon <strong>FIRST10</strong>
              </span>
            </div>

            {/* "FIND MY PERFECT SIZE" BUTTON (Mustard / Gold - Screenshot 3) */}
            <div>
              <button
                onClick={() => setSizingModalOpen(true)}
                className="w-full bg-[#D4A373] hover:bg-[#c39262] text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
              >
                <Ruler className="w-4 h-4" />
                <span>Find My Perfect Size (Nail Size Guide)</span>
              </button>
            </div>

            {/* SIZING PILLS SELECTOR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Select Nail Size:</span>
                <button
                  onClick={() => setSizingModalOpen(true)}
                  className="text-amber-700 font-semibold hover:underline"
                >
                  Size Chart
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {GLAM_STREE_SIZES.map((sz) => (
                  <button
                    key={sz.key}
                    onClick={() => setSelectedSize(sz.key)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedSize === sz.key
                        ? "border-[#0b192c] bg-[#0b192c] text-white shadow-xs font-black"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-semibold"
                    }`}
                  >
                    <div className="text-xs uppercase">{sz.key}</div>
                    <div className={`text-[9px] truncate ${selectedSize === sz.key ? "text-slate-300" : "text-slate-400"}`}>
                      {sz.key === "Custom" ? "Custom mm" : sz.key}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* SHAPE SELECTOR */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900">Select Silhouette / Shape:</div>
              <div className="flex flex-wrap gap-2">
                {GLAM_STREE_SHAPES.map((sh) => (
                  <button
                    key={sh.name}
                    onClick={() => setSelectedShape(sh.name)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                      selectedShape === sh.name
                        ? "bg-[#0b192c] text-white font-bold shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 font-medium"
                    }`}
                  >
                    {sh.name}
                  </button>
                ))}
              </div>
            </div>

            {/* QUANTITY & ACTIONS */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-3">
                {/* Quantity Box */}
                <div className="flex items-center border border-slate-300 rounded-xl bg-white p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-[#0b192c] hover:bg-slate-800 text-white"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" /> Added to Bag
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </>
                  )}
                </button>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* COMPLIMENTARY SALON CARE KIT BOX (Screenshot 3) */}
            <div className="bg-[#FAF8F5] border border-slate-200/90 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-pink-600" /> Free Salon Care Kit Included (₹299 Value)
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  FREE
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> 10 Handcrafted Custom Nails
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> 1 Liquid Super-Bond Glue
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> 24 Gel Adhesive Tabs
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> 1 Double-Sided Nail File
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> 1 Cuticle Pusher
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> 2 Alcohol Cleansing Wipes
                </li>
              </ul>
            </div>

            {/* PRODUCT ACCORDIONS (Screenshot 3) */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              {/* Accordion 1: Details */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "details" ? null : "details")}
                  className="w-full text-left p-3.5 flex items-center justify-between text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <span>Product Details & Specifications</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === "details" ? "rotate-180" : ""}`} />
                </button>
                {activeAccordion === "details" && (
                  <div className="p-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 space-y-2">
                    <p>{currentProduct.description}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div><strong>Material:</strong> 5-Layer UV Cured Salon Gel</div>
                      <div><strong>Finish:</strong> {currentProduct.finish}</div>
                      <div><strong>Wear Time:</strong> 2-3 Weeks (Glue) / 3-5 Days (Tabs)</div>
                      <div><strong>Reusable:</strong> Up to 5 Times</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: How to Apply */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "apply" ? null : "apply")}
                  className="w-full text-left p-3.5 flex items-center justify-between text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <span>How to Apply & Remove in 10 Minutes</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === "apply" ? "rotate-180" : ""}`} />
                </button>
                {activeAccordion === "apply" && (
                  <div className="p-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 space-y-2">
                    <p><strong>Application:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      <li>Push back cuticles gently with the wooden pusher.</li>
                      <li>Buff natural nail surface lightly to remove shine.</li>
                      <li>Wipe clean with the included alcohol prep pad.</li>
                      <li>Apply glue or adhesive tab, press nail down firmly at 45° angle for 30 seconds.</li>
                    </ol>
                    <p className="pt-1"><strong>Removal:</strong> Soak hands in warm water with olive oil/soap for 10-15 minutes. Gently peel off from the sides. Zero damage.</p>
                  </div>
                )}
              </div>

              {/* Accordion 3: Shipping & Return */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "shipping" ? null : "shipping")}
                  className="w-full text-left p-3.5 flex items-center justify-between text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <span>Shipping & 7-Day Sizing Guarantee</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === "shipping" ? "rotate-180" : ""}`} />
                </button>
                {activeAccordion === "shipping" && (
                  <div className="p-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 text-[11px] space-y-1.5">
                    <p>• Dispatched within 24-48 hours via Delhivery / Bluedart.</p>
                    <p>• Metro delivery within 3-5 business days across India.</p>
                    <p>• Cash on Delivery (COD) available nationwide.</p>
                    <p>• 7-Day replacement support if sizes do not fit.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "WHAT YOU ALL HAVE BEEN SAYING" (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 py-12 w-full border-t border-slate-200">
        <div className="text-center mb-8">
          <span className="text-[11px] font-black text-pink-600 uppercase tracking-widest">
            REAL REVIEWS
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c]">
            What You All Have Been Saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GLAM_STREE_REVIEWS.map((rev, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
              <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                <img src={rev.photo_url} alt={rev.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 italic">"{rev.review}"</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-900">{rev.name}</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. REVIEWS BREAKDOWN WIDGET (Screenshot 3: 5.0 Rating & Star Bars) */}
      <section className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <h3 className="text-lg font-serif font-black text-[#0b192c] mb-6">Customer Reviews</h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Overall score */}
            <div className="md:col-span-4 text-center md:text-left space-y-1">
              <div className="text-5xl font-black text-[#0b192c] flex items-center justify-center md:justify-start gap-2">
                <Star className="w-8 h-8 fill-amber-400 text-amber-400" /> 5.0
              </div>
              <p className="text-xs text-slate-500">Based on {currentProduct.review_count} verified reviews</p>
            </div>

            {/* Star Distribution Bars */}
            <div className="md:col-span-8 space-y-2 text-xs">
              {[
                { star: 5, pct: 96, count: currentProduct.review_count },
                { star: 4, pct: 4, count: 2 },
                { star: 3, pct: 0, count: 0 },
                { star: 2, pct: 0, count: 0 },
                { star: 1, pct: 0, count: 0 },
              ].map((b) => (
                <div key={b.star} className="flex items-center gap-3">
                  <span className="w-12 font-medium text-slate-600">{b.star} Stars</span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-slate-400">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. NIO SHAPE & LENGTH GUIDE (Screenshot 3) */}
      <section className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-gradient-to-br from-pink-50 via-rose-50/50 to-amber-50/40 rounded-3xl p-6 sm:p-10 border border-pink-200/80 shadow-xs text-center space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-pink-700 bg-pink-100 px-3 py-1 rounded-full">
            SIZE & SILHOUETTE GUIDE
          </span>
          <h3 className="text-2xl font-serif font-black text-[#0b192c]">
            Nail Shape & Length Visual Guide
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            Choose from five handcrafted salon apex silhouettes engineered for natural balance and grip.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
            {GLAM_STREE_SHAPES.map((sh, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-900">{sh.name}</div>
                <div className="text-[10px] text-slate-500 mt-1">{sh.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. "YOU MAY ALSO LIKE" */}
      <section className="max-w-6xl mx-auto px-4 py-12 w-full border-t border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-serif font-black text-[#0b192c]">You May Also Like</h3>
          <Link href={getStoreHref(slug, "/categories")} className="text-xs font-bold text-pink-600 hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendations.map((p: any) => (
            <Link
              key={p.id}
              href={getStoreHref(slug, `/products/${p.id}`)}
              className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-pink-600">{p.name}</h4>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-black text-xs text-slate-900">₹{p.effective_price || p.sale_price || 499}</span>
                <span className="text-[10px] text-slate-400 line-through">₹{p.regular_price || 1299}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 9. STICKY MOBILE ADD TO CART BAR */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-3 flex sm:hidden items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="text-[10px] text-slate-400 line-through">₹{currentProduct.regular_price}</div>
          <div className="text-base font-black text-slate-900">₹{currentProduct.effective_price}</div>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-[#0b192c] text-white py-2.5 px-3 rounded-xl font-bold text-xs uppercase"
          >
            {added ? "Added!" : "Add to Bag"}
          </button>
          <button
            onClick={handleBuyNow}
            className="bg-amber-600 text-white py-2.5 px-3 rounded-xl font-bold text-xs uppercase"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* SIZING MODAL */}
      {sizingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSizingModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 mb-5">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                MEASUREMENT GUIDE
              </span>
              <h3 className="text-xl font-serif font-black text-slate-900">
                Find Your Perfect Nail Size
              </h3>
              <p className="text-xs text-slate-500">
                Measure in millimeters (mm) across the widest curve of your natural nail bed
              </p>
            </div>

            <div className="space-y-2.5 mb-6">
              {GLAM_STREE_SIZES.map((sz) => (
                <div
                  key={sz.key}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <span className="font-black text-sm text-slate-900">{sz.label}</span>
                    <p className="text-[11px] text-slate-500">{sz.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSize(sz.key);
                      setSizingModalOpen(false);
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer ${
                      selectedSize === sz.key
                        ? "bg-[#0b192c] text-white"
                        : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                    }`}
                  >
                    Select {sz.key}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-amber-600" /> Need Help Measuring?
              </div>
              <p className="text-[11px] text-amber-800">
                Message us on WhatsApp with a coin next to your hand for instant personalized sizing!
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <a
                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                  `Hi ${brandName}! I need help finding my nail size for ${currentProduct.name}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> WhatsApp Sizing Support
              </a>
              <button
                onClick={() => setSizingModalOpen(false)}
                className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#07111e] text-slate-400 py-12 px-4 text-xs border-t border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <h4 className="font-serif font-black text-white text-base uppercase tracking-tight">{brandName}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Handcrafted salon press-on nails. Salon finish at home in 10 minutes with zero damage.
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Quick Links</h5>
            <ul className="space-y-1.5">
              <li><Link href={getStoreHref(slug, "/")} className="hover:text-white">Home</Link></li>
              <li><Link href={getStoreHref(slug, "/categories")} className="hover:text-white">Press On Nails</Link></li>
              <li><Link href={getStoreHref(slug, "/cart")} className="hover:text-white">Cart ({cartCount})</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Contact</h5>
            <p>WhatsApp: +91 {brandPhone}</p>
            <p>Email: {brandEmail}</p>
            <p>Location: {brandAddress}</p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Policies</h5>
            <ul className="space-y-1.5">
              <li><button onClick={() => setActivePolicy("terms")} className="hover:text-white">Terms & Conditions</button></li>
              <li><button onClick={() => setActivePolicy("privacy")} className="hover:text-white">Privacy Policy</button></li>
              <li><button onClick={() => setActivePolicy("shipping")} className="hover:text-white">Shipping Policy</button></li>
              <li><button onClick={() => setActivePolicy("refund")} className="hover:text-white">Return & Refund</button></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {brandName}. All Rights Reserved.
        </div>
      </footer>

      {/* POLICY MODAL */}
      {activePolicy && (
        <PolicyModal
          type={activePolicy}
          isOpen={true}
          onClose={() => setActivePolicy(null)}
          storeName={brandName}
          content={getPolicyContent(activePolicy)}
        />
      )}
    </div>
  );
}

