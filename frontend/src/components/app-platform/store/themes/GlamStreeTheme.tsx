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
  GLAM_STREE_CATEGORIES,
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
  Eye,
  Plus,
  HelpCircle,
  Clock,
  Layers,
  Droplets,
} from "lucide-react";
import PolicyModal, { PolicyType } from "@/components/app-platform/store/PolicyModal";

interface GlamStreeThemeProps {
  slug: string;
  config: any;
  categories?: any[];
  products?: any[];
  banners?: any[];
}

export default function GlamStreeTheme({
  slug,
  config,
  categories = [],
  products = [],
  banners = [],
}: GlamStreeThemeProps) {
  const router = useRouter();
  const { addItem, itemCount: cartCount } = useVendorCart(slug);
  const { isInWishlist, toggleItem, itemCount: wishlistCount } = useVendorWishlist(slug);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sizingModalOpen, setSizingModalOpen] = useState(false);
  const [activeCatFilter, setActiveCatFilter] = useState("all");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);

  // Customer session
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

  const brandName = config?.store_name || "Glam stree nails";
  const brandPhone = config?.contact_phone || "7499904962";
  const brandEmail = config?.contact_email || "apekshajondhale1111@gmail.com";
  const brandAddress = config?.business_address || "Pune, Maharashtra, India";
  const cleanPhone = brandPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hi ${brandName}! I am browsing your online store and have a question regarding nail sizing & orders.`
  )}`;

  // Catalog items: prefer API products if vendor uploaded them; otherwise use rich realistic collection
  const displayProducts: GlamNailProduct[] =
    products && products.length > 0
      ? products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug || p.id,
          category_id: p.category_id || "cat-bestsellers",
          category_name: p.category_name || "Press On Nails",
          regular_price: p.regular_price || 1299,
          sale_price: p.effective_price || p.sale_price || 499,
          effective_price: p.effective_price || p.sale_price || 499,
          discount_percentage:
            p.regular_price && p.sale_price
              ? Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)
              : 62,
          thumbnail_url:
            p.thumbnail_url ||
            "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
          images: p.images?.map((im: any) => im.image_url) || [p.thumbnail_url],
          rating: 5.0,
          review_count: 24,
          description: p.description || "Handcrafted luxury press-on nails.",
          shape: "Almond",
          finish: "Glossy Gel",
          in_stock: p.in_stock ?? true,
          stock_quantity: p.stock_quantity ?? 50,
          featured: true,
        }))
      : GLAM_STREE_PRODUCTS;

  const filteredProducts =
    activeCatFilter === "all"
      ? displayProducts
      : displayProducts.filter(
          (p) =>
            p.category_id === activeCatFilter ||
            p.category_name.toLowerCase().includes(activeCatFilter.toLowerCase())
        );

  const handleAddToCart = (e: React.MouseEvent, p: GlamNailProduct) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: p.id,
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      sku: `GS-${p.id.slice(0, 8)}`,
      price: p.regular_price,
      effective_price: p.effective_price,
      thumbnail_url: p.thumbnail_url,
      quantity: 1,
      stock_quantity: p.stock_quantity,
    });
    pixelTracker.trackAddToCart(config, {
      id: p.id,
      name: p.name,
      price: p.effective_price,
      quantity: 1,
    });
    setAddedMap((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [p.id]: false }));
    }, 1800);
  };

  const handleToggleWishlist = (e: React.MouseEvent, p: GlamNailProduct) => {
    e.preventDefault();
    e.stopPropagation();
    const currentlyIn = isInWishlist(p.id);
    toggleItem({
      id: p.id,
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      regular_price: p.regular_price,
      effective_price: p.effective_price,
      sale_price: p.sale_price,
      thumbnail_url: p.thumbnail_url,
      category_name: p.category_name,
      in_stock: p.in_stock,
    });
    if (!currentlyIn) {
      pixelTracker.trackAddToWishlist(config, {
        id: p.id,
        name: p.name,
        price: p.effective_price,
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(getStoreHref(slug, `/categories?q=${encodeURIComponent(searchQuery.trim())}`));
    }
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

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 flex flex-col font-sans selection:bg-pink-100 selection:text-pink-900">
      {/* 1. TOP ANNOUNCEMENT BAR (Deep Navy Blue matching Screenshot 1 & 2) */}
      <div className="bg-[#0b192c] text-white text-[11px] sm:text-xs py-2 px-3 sm:px-4 tracking-wide z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="bg-pink-500/20 text-pink-300 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0">
              SALE
            </span>
            <span className="font-medium truncate">
              Flat 10% off on your first order with code <strong className="text-yellow-300 font-black">FIRST10</strong> | Free Shipping above ₹999
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300 text-[11px] shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Phone className="w-3 h-3 text-emerald-400" /> WhatsApp Sizing Help: +91 {brandPhone}
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Clean White Luxury Navbar with Standard Left-Aligned Logo) */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          {/* Left: Mobile Hamburger + Standard Left Logo + Desktop Nav Links */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors md:hidden shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Standard Left-Aligned Brand Logo */}
            <Link
              href={getStoreHref(slug, "/")}
              className="flex items-center gap-2 group select-none shrink-0"
            >
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

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-700 ml-2">
              <Link
                href={getStoreHref(slug, "/")}
                className="text-[#0b192c] font-black border-b-2 border-[#0b192c] pb-0.5"
              >
                Home
              </Link>
              <Link
                href={getStoreHref(slug, "/categories")}
                className="hover:text-pink-600 transition-colors"
              >
                Press On Nails
              </Link>
              <button
                onClick={() => setSizingModalOpen(true)}
                className="hover:text-pink-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-yellow-600" /> Sizing Guide
              </button>
              <Link
                href={getStoreHref(slug, "/categories?cat=cat-bestsellers")}
                className="hover:text-pink-600 transition-colors text-pink-600 font-bold"
              >
                Bestsellers
              </Link>
            </nav>
          </div>

          {/* Right: Actions (Search, Wishlist, Account, Cart) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-slate-700 hover:text-[#0b192c] hover:bg-slate-100 rounded-full transition-colors"
              title="Search nails"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

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
                <span className="absolute -top-1 -right-1 bg-[#0b192c] text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search Bar Dropdown */}
        {searchOpen && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 animate-fadeIn">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-2xl mx-auto flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search press-on nails by color, shape (Almond, Coffin) or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-white pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#0b192c] shadow-xs"
                />
              </div>
              <button
                type="submit"
                className="bg-[#0b192c] text-white px-4 py-2 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-serif font-black text-[#0b192c] text-lg uppercase tracking-tight">
                  {brandName}
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Link
                  href={getStoreHref(slug, "/")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-50 text-pink-700"
                >
                  Home Storefront
                </Link>
                <Link
                  href={getStoreHref(slug, "/categories")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  All Press On Nails
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSizingModalOpen(true);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-yellow-700"
                >
                  <Ruler className="w-4 h-4" /> Find My Perfect Size
                </button>
                <Link
                  href={getStoreHref(slug, "/cart")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> Shopping Cart ({cartCount})
                </Link>
                <Link
                  href={getStoreHref(slug, "/account")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <User className="w-4 h-4" /> Customer Account
                </Link>
              </nav>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-3">
                  Store Policies
                </span>
                <div className="space-y-1 text-xs text-slate-600">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActivePolicy("terms");
                    }}
                    className="block px-3 py-1 text-left w-full hover:text-pink-600"
                  >
                    Terms & Conditions
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActivePolicy("privacy");
                    }}
                    className="block px-3 py-1 text-left w-full hover:text-pink-600"
                  >
                    Privacy Policy
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActivePolicy("shipping");
                    }}
                    className="block px-3 py-1 text-left w-full hover:text-pink-600"
                  >
                    Shipping Policy
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActivePolicy("refund");
                    }}
                    className="block px-3 py-1 text-left w-full hover:text-pink-600"
                  >
                    Return & Refund
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
              <p className="font-bold text-slate-800">{brandName}</p>
              <p className="text-[11px] text-slate-400">+91 {brandPhone}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. HERO BANNER SECTION (Screenshot 4) */}
      <section className="relative bg-gradient-to-br from-pink-50 via-[#fcf7f4] to-amber-50/50 border-b border-slate-200/80 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-14 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4 sm:space-y-5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-pink-100/80 text-pink-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-pink-600" />
              100% Handcrafted • Reusable Up To 5 Times
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-black text-[#0b192c] tracking-tight leading-[1.15]">
              Salon Quality Nails in Just <span className="text-pink-600 italic">10 Minutes</span>.
            </h1>

            <p className="text-xs sm:text-base text-slate-600 max-w-xl leading-relaxed">
              Ditch the expensive salon appointments and damaging drills. Get custom-tailored, multi-layered UV gel press-on nails that look and feel like genuine acrylic extensions.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link
                href={getStoreHref(slug, "/categories")}
                className="bg-[#0b192c] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 uppercase tracking-wider"
              >
                <span>Shop Bestsellers</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setSizingModalOpen(true)}
                className="bg-[#D4A373] hover:bg-[#c39262] text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-full shadow-xs transition-colors flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
              >
                <Ruler className="w-4 h-4" />
                <span>Find My Size</span>
              </button>
            </div>

            {/* Quick Micro Badges */}
            <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" /> Zero Nail Damage
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" /> Free Prep Kit (₹299 Value)
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" /> COD Across India
              </span>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="md:col-span-5 relative">
            <div className="relative mx-auto max-w-sm aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=85"
                alt="Glam Stree Press On Nails"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 right-3 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wide">
                FLAT 60% OFF
              </div>
              <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Starting From
                  </div>
                  <div className="text-base font-black text-slate-900">
                    ₹499 <span className="line-through text-xs font-normal text-slate-400">₹1,299</span>
                  </div>
                </div>
                <Link
                  href={getStoreHref(slug, "/categories")}
                  className="bg-[#0b192c] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  View All
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COLLECTION TABS (Screenshot 4) */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-4 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-extrabold text-pink-600 uppercase tracking-widest">
              COLLECTIONS
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-[#0b192c]">
              Bestseller Press-On Nails
            </h2>
          </div>
          <Link
            href={getStoreHref(slug, "/categories")}
            className="text-xs font-bold text-[#0b192c] hover:text-pink-600 flex items-center gap-1 transition-colors"
          >
            Browse All ({displayProducts.length}) <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {GLAM_STREE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCatFilter(cat.id === "cat-all" ? "all" : cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                (cat.id === "cat-all" && activeCatFilter === "all") ||
                activeCatFilter === cat.id
                  ? "bg-[#0b192c] text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* 5. PRODUCT GRID (4 Columns Desktop / 2 Mobile - Screenshot 4) */}
      <section className="max-w-6xl mx-auto px-4 py-4 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((p) => {
            const isAdded = addedMap[p.id];
            const inWish = isInWishlist(p.id);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-lg hover:border-slate-300 transition-all group flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
                  <Link href={getStoreHref(slug, `/products/${p.id}`)}>
                    <img
                      src={p.thumbnail_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </Link>

                  {/* Discount Badge */}
                  <div className="absolute top-2 left-2 bg-yellow-400 text-slate-900 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase">
                    {p.discount_percentage}% OFF
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => handleToggleWishlist(e, p)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-pink-600 transition-colors shadow-xs"
                    title={inWish ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart
                      className={`w-4 h-4 ${inWish ? "fill-pink-600 text-pink-600" : ""}`}
                    />
                  </button>

                  {/* Free Kit Indicator */}
                  <div className="absolute bottom-1.5 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded text-center truncate">
                    Includes Free ₹299 Prep Kit
                  </div>
                </div>

                {/* Details Container */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {/* Star Rating */}
                    <div className="flex items-center gap-1 text-amber-500 text-[11px] font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{p.rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">({p.review_count})</span>
                    </div>

                    {/* Title */}
                    <Link
                      href={getStoreHref(slug, `/products/${p.id}`)}
                      className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-pink-600 transition-colors line-clamp-2 mt-1 leading-snug"
                    >
                      {p.name}
                    </Link>

                    {/* Shape Tag */}
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Shape: <span className="text-slate-700 font-semibold">{p.shape}</span>
                    </div>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm sm:text-base font-black text-slate-900">
                        ₹{p.effective_price}
                      </div>
                      <div className="text-[10px] text-slate-400 line-through">
                        ₹{p.regular_price}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, p)}
                      disabled={isAdded}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isAdded
                          ? "bg-emerald-600 text-white"
                          : "bg-[#0b192c] hover:bg-slate-800 text-white shadow-xs"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-8">
          <Link
            href={getStoreHref(slug, "/categories")}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white border-2 border-[#0b192c] text-[#0b192c] hover:bg-[#0b192c] hover:text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xs"
          >
            <span>View All Press On Nails</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 6. "FIND MY PERFECT SIZE" BANNER (Gold Button matching Screenshot 3) */}
      <section className="max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="bg-gradient-to-r from-amber-500 via-[#D4A373] to-amber-600 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left z-10">
            <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">
              ACCURATE FIT GUARANTEE
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">
              Unsure About Your Nail Size?
            </h3>
            <p className="text-xs sm:text-sm text-white/90 max-w-xl">
              Every set is customized to your exact cuticle curves. Measure your natural nail bed in 2 minutes with regular tape or order our universal sizing kit.
            </p>
          </div>
          <button
            onClick={() => setSizingModalOpen(true)}
            className="bg-white text-slate-900 hover:bg-slate-100 font-black text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-md uppercase tracking-wider transition-all z-10 shrink-0 cursor-pointer flex items-center gap-2"
          >
            <Ruler className="w-4 h-4 text-amber-600" />
            <span>Open Sizing Guide</span>
          </button>
        </div>
      </section>

      {/* 7. WHY CHOOSE GLAM STREE (4 Value Cards) */}
      <section className="bg-white border-y border-slate-200/80 py-12 px-4 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[11px] font-black text-pink-600 uppercase tracking-widest">
              THE GLAM STREE STANDARD
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c] mt-1">
              Why 10,000+ Women Love Our Press-On Nails
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-slate-200/70 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">10-Minute Application</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                No salon appointments or UV lights. Prep cuticles, press down for 30 seconds, and you’re ready to shine.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-slate-200/70 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Reusable Up To 5 Times</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Handcrafted with 5 layers of durable cured gel. Does not chip, bend, or fade after wear.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-slate-200/70 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Zero Natural Nail Damage</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Soak in warm soapy water for effortless, painless removal that leaves natural keratin intact.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-slate-200/70 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-xs">
                <Droplets className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">100% Waterproof</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Shower, wash dishes, swim, or hit the gym with complete confidence. Zero pop-offs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. "WHAT YOU ALL HAVE BEEN SAYING" (Customer Photo Reviews - Screenshot 3 & 4) */}
      <section className="max-w-6xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-8">
          <span className="text-[11px] font-black text-pink-600 uppercase tracking-widest">
            REAL RESULTS
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c]">
            What You All Have Been Saying
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real customer manicure photos and verified experiences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GLAM_STREE_REVIEWS.map((rev, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                <img
                  src={rev.photo_url}
                  alt={rev.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{rev.date}</span>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed font-sans">
                    "{rev.review}"
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{rev.name}</span>
                    <span className="text-[10px] text-slate-400">{rev.city}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified Buyer
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. SHAPE & LENGTH GUIDE (Visual Diagram) */}
      <section className="bg-pink-50/50 border-y border-slate-200/80 py-12 px-4 w-full">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div>
            <span className="text-[11px] font-black text-pink-600 uppercase tracking-widest">
              CUSTOM SILHOUETTES
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c]">
              Shape & Length Guide
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-1">
              Choose the silhouette that compliments your lifestyle and finger shape.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {GLAM_STREE_SHAPES.map((sh, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center space-y-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center mx-auto font-serif font-black text-sm">
                  {idx + 1}
                </div>
                <h4 className="font-bold text-xs text-slate-900">{sh.name}</h4>
                <p className="text-[10px] text-slate-500 leading-tight">{sh.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FREQUENTLY ASKED QUESTIONS (Screenshot 4) */}
      <section className="max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-8">
          <span className="text-[11px] font-black text-pink-600 uppercase tracking-widest">
            GOT QUESTIONS?
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Everything you need to know about measuring, applying, and caring for your nails
          </p>
        </div>

        <div className="space-y-3">
          {GLAM_STREE_FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-900 font-sans">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. TRUST BADGES BAR */}
      <section className="bg-[#0b192c] text-white py-8 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <Truck className="w-5 h-5 mx-auto text-pink-400" />
            <h5 className="font-bold text-xs">Free Delivery</h5>
            <p className="text-[11px] text-slate-400">On prepaid orders above ₹999</p>
          </div>
          <div className="space-y-1">
            <ShieldCheck className="w-5 h-5 mx-auto text-emerald-400" />
            <h5 className="font-bold text-xs">Cash on Delivery</h5>
            <p className="text-[11px] text-slate-400">Available across all India pin codes</p>
          </div>
          <div className="space-y-1">
            <RotateCcw className="w-5 h-5 mx-auto text-yellow-400" />
            <h5 className="font-bold text-xs">7-Day Sizing Guarantee</h5>
            <p className="text-[11px] text-slate-400">Hassle-free size alteration support</p>
          </div>
          <div className="space-y-1">
            <Sparkles className="w-5 h-5 mx-auto text-purple-400" />
            <h5 className="font-bold text-xs">Complimentary Kit</h5>
            <p className="text-[11px] text-slate-400">Free glue, tabs, file & buffer</p>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-[#07111e] text-slate-400 py-12 px-4 text-xs border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <h4 className="font-serif font-black text-white text-base uppercase tracking-tight">
              {brandName}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              India's premier handcrafted press-on nail studio. Salon extensions at home in 10 minutes with zero natural nail damage.
            </p>
            <div className="pt-2 text-[11px] space-y-1">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pink-400" /> +91 {brandPhone}
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-pink-400" /> {brandEmail}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-400" /> {brandAddress}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Quick Links
            </h5>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href={getStoreHref(slug, "/")} className="hover:text-white transition-colors">
                  Home Storefront
                </Link>
              </li>
              <li>
                <Link href={getStoreHref(slug, "/categories")} className="hover:text-white transition-colors">
                  Shop All Press On Nails
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setSizingModalOpen(true)}
                  className="hover:text-white transition-colors text-left"
                >
                  Nail Sizing & Length Chart
                </button>
              </li>
              <li>
                <Link href={getStoreHref(slug, "/cart")} className="hover:text-white transition-colors">
                  Shopping Cart ({cartCount})
                </Link>
              </li>
              <li>
                <Link href={getStoreHref(slug, "/account")} className="hover:text-white transition-colors">
                  Customer Login & Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Sizing Help */}
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Sizing Standard
            </h5>
            <div className="text-[11px] space-y-1 text-slate-400">
              <p><strong className="text-slate-200">XS:</strong> 14, 11, 12, 11, 8 mm</p>
              <p><strong className="text-slate-200">S:</strong> 15, 12, 13, 12, 9 mm</p>
              <p><strong className="text-slate-200">M:</strong> 16, 13, 14, 13, 10 mm (Most Popular)</p>
              <p><strong className="text-slate-200">L:</strong> 17, 14, 15, 14, 11 mm</p>
              <p className="text-yellow-400 font-semibold pt-1">Custom Sizes Accepted</p>
            </div>
          </div>

          {/* Policies */}
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Legal Policies
            </h5>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => setActivePolicy("terms")} className="hover:text-white text-left">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => setActivePolicy("privacy")} className="hover:text-white text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActivePolicy("shipping")} className="hover:text-white text-left">
                  Shipping Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActivePolicy("refund")} className="hover:text-white text-left">
                  Cancellation & Refund
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {brandName}. Handcrafted in India. All Rights Reserved.
        </div>
      </footer>

      {/* SIZING MODAL */}
      {sizingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSizingModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
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

            {/* Sizing Table */}
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
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
                    {sz.key}
                  </span>
                </div>
              ))}
            </div>

            {/* Step by step measurement */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-amber-600" /> How to Measure in 2 Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800">
                <li>Place a clear scotch tape across the widest part of your nail bed.</li>
                <li>Mark both sidewalls with a pen, remove tape, and measure the distance with a mm ruler.</li>
              </ol>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl text-center shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> WhatsApp Sizing Support
              </a>
              <button
                onClick={() => setSizingModalOpen(false)}
                className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

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

