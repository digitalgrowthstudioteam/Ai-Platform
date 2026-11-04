"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist } from "@/lib/app-platform/wishlist-store";
import { getStoreHref } from "@/lib/app-platform/store-route-helper";
import { pixelTracker } from "@/lib/app-platform/pixel-tracker";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Package,
  ShieldCheck,
  Building2,
  Ticket,
  Copy,
  Check,
  Star,
  Quote,
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  ArrowRight,
  Plus,
  Heart,
  HelpCircle,
} from "lucide-react";

interface FmcgStoreThemeProps {
  slug: string;
  config: any;
  categories: any[];
  products: any[];
  banners: any[];
}

export default function FmcgStoreTheme({
  slug,
  config,
  categories,
  products,
  banners,
}: FmcgStoreThemeProps) {
  const router = useRouter();
  const { addItem, itemCount: cartCount } = useVendorCart(slug);
  const { isInWishlist, toggleItem } = useVendorWishlist(slug);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<string>("About Us");
  const [couponCopied, setCouponCopied] = useState(false);

  // Customer session name
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    const updateCustomer = () => {
      try {
        const sess = localStorage.getItem(`dgs_customer_session_${slug}`);
        if (sess) {
          const parsed = JSON.parse(sess);
          if (parsed?.name && parsed?.isLoggedIn) {
            setCustomerName(parsed.name.trim().split(" ")[0]);
            return;
          }
        }
        setCustomerName(null);
      } catch (e) {
        setCustomerName(null);
      }
    };
    updateCustomer();
    window.addEventListener("storage", updateCustomer);
    window.addEventListener("dgs_customer_auth_changed", updateCustomer);
    return () => {
      window.removeEventListener("storage", updateCustomer);
      window.removeEventListener("dgs_customer_auth_changed", updateCustomer);
    };
  }, [slug]);

  const primaryColor = config?.primary_color || "#ff7300";
  const brandName = config?.store_name || "My Shop Partner";
  const brandPhone = config?.contact_phone || "+91 8332023338";
  const brandEmail = config?.contact_email || "support@myshoppartner.in";
  const brandAddress =
    config?.business_address ||
    "#102, Brigade IRV Center, Nallurahalli, Whitefield, Bengaluru, Karnataka 560066";

  const heroBanner = banners && banners.length > 0 ? banners[0] : null;

  const handleCopyCoupon = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 2000);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(getStoreHref(slug, `/categories?q=${encodeURIComponent(searchQuery.trim())}`));
    }
  };

  const faqs = [
    {
      cat: "About Us",
      q: `What is ${brandName}?`,
      a: `${brandName} is a verified FMCG & daily essentials wholesale platform connecting retail businesses and consumers directly to manufacturer-backed inventory at wholesale margins.`,
    },
    {
      cat: "About Us",
      q: `What makes ${brandName} different from other suppliers?`,
      a: `We provide 100% verified authentic stock, transparent digital invoicing, zero hidden subscription charges, and fast doorstep courier dispatch across India.`,
    },
    {
      cat: "Order Related",
      q: `How can I order bulk items at wholesale prices?`,
      a: `Simply browse our categories, add desired quantities to your cart, and proceed to checkout. You can select Cash on Delivery (COD) or Instant Online Payment.`,
    },
    {
      cat: "Order Related",
      q: `Is Cash on Delivery (COD) supported?`,
      a: `Yes! Cash on Delivery is available across all serviceable pincodes. You pay securely at your doorstep when the delivery agent arrives.`,
    },
    {
      cat: "Refund Related",
      q: `Does ${brandName} supply to home consumers & small businesses?`,
      a: `Yes, both retail consumers and Kirana store owners can purchase without minimum order limits while enjoying wholesale volume pricing.`,
    },
    {
      cat: "Account Related",
      q: `How does ${brandName} guarantee fresh dispatch?`,
      a: `All batches undergo strict quality inspections before dispatch from verified FMCG distribution centers, ensuring maximum shelf life and tamper-proof packaging.`,
    },
  ];

  const filteredFaqs = faqs.filter((f) => f.cat === faqCategory);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 flex flex-col font-sans pb-16 sm:pb-0">
      {/* 1. Header (Vibrant Orange #ff7300 matching Screenshot 3) */}
      <header
        style={{ backgroundColor: primaryColor }}
        className="text-white sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand Logo or Stylized Name */}
          <Link
            href={getStoreHref(slug, "/")}
            className="flex items-center gap-2 group select-none shrink-0"
          >
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt={brandName}
                className="h-9 sm:h-11 max-w-[170px] object-contain brightness-0 invert"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="bg-white text-[#ff7300] font-black text-xs sm:text-sm px-2 py-0.5 rounded shadow-xs uppercase tracking-tight">
                  My Shop
                </div>
                <span className="text-white font-extrabold text-lg sm:text-xl tracking-tight">
                  PARTNER
                </span>
              </div>
            )}
          </Link>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Cart Icon */}
            <Link
              href={getStoreHref(slug, "/cart")}
              className="relative p-2 text-white hover:bg-black/10 rounded-full transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#ff7300] font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Login / Customer Account Button */}
            <Link
              href={getStoreHref(slug, "/account")}
              className="bg-white text-[#ff7300] font-bold text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-xs hover:bg-orange-50 transition-colors uppercase tracking-wide flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>{customerName ? customerName : "LOGIN"}</span>
            </Link>

            {/* Search Icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-white hover:bg-black/10 rounded-full transition-colors"
              title="Search Catalog"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-black/10 rounded-full transition-colors"
              title="Toggle Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="bg-orange-700/30 px-4 py-2 border-t border-white/20 animate-in slide-in-from-top-2"
          >
            <div className="max-w-6xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by brand, category or keyword..."
                  className="w-full bg-white text-slate-900 text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border-0 shadow-xs focus:ring-2 focus:ring-white outline-hidden"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-white text-[#ff7300] font-bold text-xs px-3 py-2 rounded-lg hover:bg-orange-50"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-72 h-full shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-extrabold text-slate-900 text-base">Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 text-sm font-semibold text-slate-700">
                <Link
                  href={getStoreHref(slug, "/")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-50 text-[#ff7300]"
                >
                  <Home className="w-4 h-4" /> Home Storefront
                </Link>
                <Link
                  href={getStoreHref(slug, "/categories")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-[#ff7300] transition-colors"
                >
                  <LayoutGrid className="w-4 h-4" /> Browse 18 Categories
                </Link>
                <Link
                  href={getStoreHref(slug, "/cart")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-[#ff7300] transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> My Shopping Cart ({cartCount})
                </Link>
                <Link
                  href={getStoreHref(slug, "/account")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-[#ff7300] transition-colors"
                >
                  <User className="w-4 h-4" /> Customer Account & Orders
                </Link>
              </nav>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-3">
                  Store Policies
                </span>
                <div className="space-y-1 text-xs text-slate-600">
                  <Link
                    href={getStoreHref(slug, "/policies/terms")}
                    className="block px-3 py-1.5 hover:text-[#ff7300]"
                  >
                    Terms & Conditions
                  </Link>
                  <Link
                    href={getStoreHref(slug, "/policies/privacy")}
                    className="block px-3 py-1.5 hover:text-[#ff7300]"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href={getStoreHref(slug, "/policies/shipping")}
                    className="block px-3 py-1.5 hover:text-[#ff7300]"
                  >
                    Shipping Policy
                  </Link>
                  <Link
                    href={getStoreHref(slug, "/policies/refund")}
                    className="block px-3 py-1.5 hover:text-[#ff7300]"
                  >
                    Cancellation & Refund
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
              <p className="font-semibold text-slate-800">{brandName}</p>
              <p className="text-[11px] text-slate-400">{brandPhone}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Banner Slider Section (Screenshot 3) */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="relative min-h-[260px] sm:min-h-[380px] md:min-h-[440px] flex items-center">
          <img
            src={
              heroBanner?.image_url ||
              "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1400&auto=format&fit=crop&q=80"
            }
            alt="Wholesale Grocery Essentials"
            className="absolute inset-0 w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

          <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full text-white">
            <span className="inline-block bg-[#ff7300] text-white text-[11px] sm:text-xs font-black uppercase px-3 py-1 rounded-full mb-3 shadow-md">
              Wholesale Direct
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black max-w-xl leading-tight sm:leading-none uppercase tracking-tight mb-3">
              {heroBanner?.title || "Chocolates, Milkshakes & Daily Essentials"}
            </h1>
            <p className="text-xs sm:text-base text-slate-200 max-w-lg mb-6 leading-relaxed">
              {heroBanner?.description ||
                "Source premium wholesale inventory directly from verified suppliers. Doorstep delivery & transparent pricing."}
            </p>
            <div>
              {/* IMPORTANT: Opens dedicated Category Page on full page, NOT popup! */}
              <Link
                href={getStoreHref(slug, "/categories")}
                className="inline-flex items-center gap-2 bg-[#ff7300] hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg transition-transform active:scale-95 uppercase tracking-wider"
              >
                Shop All Categories
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four Metric Stat Cards (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 -mt-6 sm:-mt-8 relative z-20 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Categories */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-md flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-100/70 text-[#ff7300] flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {categories.length || 18}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">
                Wholesale Categories
              </div>
            </div>
          </div>

          {/* Card 2: Products */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-md flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {products.length}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">
                Wholesale Products
              </div>
            </div>
          </div>

          {/* Card 3: Quality Verified */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-md flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                100%
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">
                Verified Suppliers
              </div>
            </div>
          </div>

          {/* Card 4: Wholesale Ecosystem Hub */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-md flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                1
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">
                Wholesale Hub Ecosystem
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "OUR CATEGORIES" 18-Tile Grid Section (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-8 w-full">
        <div className="text-center mb-8">
          <span className="text-xs font-black text-[#ff7300] uppercase tracking-widest bg-orange-100/60 px-3 py-1 rounded-full inline-block mb-2">
            OUR CATEGORIES
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Explore Wholesale Product Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Click any category to browse verified products on our dedicated category page.
          </p>
        </div>

        {/* 18 Tile Grid (Screenshot 3) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => {
            return (
              /* IMPORTANT: Navigates to dedicated /categories page with query param (NEW FULL PAGE!) */
              <Link
                key={cat.id}
                href={getStoreHref(slug, `/categories?cat=${cat.id}`)}
                className="bg-white rounded-2xl p-3 border border-slate-200/90 hover:border-orange-400 hover:shadow-lg transition-all group flex flex-col items-center text-center cursor-pointer"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
                  <img
                    src={cat.image_url || "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400"}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#ff7300] transition-colors leading-tight line-clamp-2">
                  {cat.name}
                </h3>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Coupon Codes Section (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="w-4 h-4 text-[#ff7300]" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Coupon Codes
          </h3>
        </div>

        {/* Coupon Card Graphic */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-900 via-stone-800 to-amber-950 text-white p-5 sm:p-7 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Premium Quality • Direct from Mill
            </span>
            <h4 className="text-xl sm:text-2xl font-black tracking-tight">
              Good Rice. Better Health.
            </h4>
            <p className="text-xs text-amber-100 max-w-md">
              Apply coupon <span className="font-mono font-bold text-white">RICE50</span> to get ₹50 off on all rice and staple food items on orders above ₹499.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-amber-200 uppercase font-semibold block">
                COUPON CODE
              </span>
              <span className="text-base font-black tracking-widest text-amber-300 font-mono">
                RICE50
              </span>
            </div>
            <button
              onClick={() => handleCopyCoupon("RICE50")}
              className="bg-[#ff7300] hover:bg-orange-600 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {couponCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 6. The Wholesale Ecosystem Section (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 py-12 w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          The Wholesale Ecosystem
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto leading-relaxed">
          Direct from Verified Suppliers • Bulk Margins • Doorstep Logistics • Fast Delivery
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8 text-left">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff7300] flex items-center justify-center font-bold">
              01
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Direct Wholesale Rates</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Skip intermediaries and procure inventory directly from approved FMCG manufacturers.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              02
            </div>
            <h4 className="font-bold text-slate-900 text-sm">100% Genuine Stock</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every shipment is verified for freshness, packaging authenticity, and standard expiry.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              03
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Doorstep Express Dispatch</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Reliable pan-India delivery with live SMS and WhatsApp tracking for every dispatch.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              04
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Cash on Delivery & GST Bills</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pay securely at doorstep with complete tax invoice compliance for input credit.
            </p>
          </div>
        </div>
      </section>

      {/* 7. "What our partners say about us" Testimonials Section (Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 py-8 w-full">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-center mb-6">
          What our partners say about us
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Testimonial 1 (Muted Purple-Slate Card matching Screenshot 3) */}
          <div className="bg-[#4D455D] text-white p-6 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Quote className="w-8 h-8 text-white/40" />
                <div className="flex items-center gap-1 text-amber-300">
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                </div>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                &ldquo;Affordable rates & top-notch quality. Our customers love the fresh inventory and prompt weekly dispatches.&rdquo;
              </p>
            </div>
            <div className="pt-3 border-t border-white/20 flex items-center justify-between">
              <div>
                <h5 className="font-extrabold text-sm text-white">Priya Sharma</h5>
                <span className="text-[11px] text-slate-300">Verified Retail Partner</span>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-[#4D455D] text-white p-6 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Quote className="w-8 h-8 text-white/40" />
                <div className="flex items-center gap-1 text-amber-300">
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                  <Star className="w-4 h-4 fill-amber-300" />
                </div>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                &ldquo;On-time delivery and genuine branded goods every single week. Highly recommended wholesale partner.&rdquo;
              </p>
            </div>
            <div className="pt-3 border-t border-white/20 flex items-center justify-between">
              <div>
                <h5 className="font-extrabold text-sm text-white">Rahul Nair</h5>
                <span className="text-[11px] text-slate-300">Retail Store Owner</span>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
      </section>

      {/* 8. "Frequently asked questions" Section (Screenshot 3) */}
      <section className="max-w-4xl mx-auto px-4 py-12 w-full">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center mb-6">
          Frequently asked questions
        </h2>

        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 scrollbar-none text-xs font-bold">
          {["About Us", "Order Related", "Refund Related", "Account Related"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setFaqCategory(cat);
                setActiveFaq(0);
              }}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                faqCategory === cat
                  ? "bg-[#ff7300] text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordions */}
        <div className="space-y-3 mt-4">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 hover:text-[#ff7300] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180 text-[#ff7300]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-100 leading-relaxed bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Dark Footer (Screenshot 2 & 3) */}
      <footer className="bg-[#0A0F1D] text-slate-400 text-xs mt-16 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-slate-800">
          {/* Company Column */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              COMPANY
            </span>
            <h4 className="text-base font-extrabold text-white">{brandName}</h4>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs">
              {brandAddress}
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              GSTIN: {config?.gst_number || "29AAOCB6773A1ZF"}
            </p>
            <div className="space-y-1.5 pt-1">
              <a
                href={`tel:${brandPhone}`}
                className="flex items-center gap-2 text-slate-300 hover:text-[#ff7300] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#ff7300]" />
                <span>{brandPhone}</span>
              </a>
              <a
                href={`mailto:${brandEmail}`}
                className="flex items-center gap-2 text-slate-300 hover:text-[#ff7300] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#ff7300]" />
                <span>{brandEmail}</span>
              </a>
            </div>
          </div>

          {/* Know More Column */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              KNOW MORE
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <li>
                <Link
                  href={getStoreHref(slug, "/")}
                  className="hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/categories")}
                  className="hover:text-white transition-colors"
                >
                  Browse Catalogue
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/sell")}
                  className="hover:text-white transition-colors"
                >
                  Sell on {brandName}
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/privacy")}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/terms")}
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/refund")}
                  className="hover:text-white transition-colors"
                >
                  Cancellation & Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/shipping")}
                  className="hover:text-white transition-colors"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${brandPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Customer Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Follow Us, Play Store Badge, Copyright */}
        <div className="max-w-6xl mx-auto px-4 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              FOLLOW US ON
            </span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors text-xs font-bold">
                in
              </span>
              <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors text-xs font-bold">
                ig
              </span>
              <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors text-xs font-bold">
                yt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Orange Badge */}
            <div className="bg-[#ff7300] text-white px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-tight shadow-md">
              {brandName}
            </div>

            {/* Google Play Store Badge */}
            <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 select-none shadow-sm">
              <div className="text-[9px] uppercase font-semibold leading-tight text-slate-400">
                GET IT ON
                <div className="text-xs font-bold text-white tracking-wide">Google Play</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 text-center text-slate-600 text-[11px]">
          Copyright © {new Date().getFullYear()} {brandName}. All Rights Reserved.
        </div>
      </footer>

      {/* 10. Sticky Mobile Bottom Navigation (Screenshot 2 & 3) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around py-2 shadow-lg">
        <Link
          href={getStoreHref(slug, "/")}
          className="flex flex-col items-center gap-0.5 text-[#ff7300]"
        >
          <Home className="w-5 h-5 text-[#ff7300]" />
          <span className="text-[10px] font-bold text-[#ff7300]">Home</span>
        </Link>

        <Link
          href={getStoreHref(slug, "/categories")}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#ff7300]"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Categories</span>
        </Link>

        <Link
          href={getStoreHref(slug, "/cart")}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#ff7300] relative"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-2 bg-[#ff7300] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-semibold">Cart</span>
        </Link>

        <Link
          href={getStoreHref(slug, "/account")}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#ff7300]"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Account</span>
        </Link>
      </nav>
    </div>
  );
}

