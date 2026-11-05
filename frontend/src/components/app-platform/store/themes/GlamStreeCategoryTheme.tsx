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
  SlidersHorizontal,
  Home,
  CheckCircle2,
} from "lucide-react";
import PolicyModal, { PolicyType } from "@/components/app-platform/store/PolicyModal";

interface GlamStreeCategoryThemeProps {
  slug: string;
  config: any;
  categories?: any[];
  products?: any[];
  selectedCatId?: string;
  searchQueryParam?: string;
}

export default function GlamStreeCategoryTheme({
  slug,
  config,
  categories = [],
  products = [],
  selectedCatId,
  searchQueryParam = "",
}: GlamStreeCategoryThemeProps) {
  const router = useRouter();
  const { addItem, itemCount: cartCount } = useVendorCart(slug);
  const { isInWishlist, toggleItem, itemCount: wishlistCount } = useVendorWishlist(slug);

  const [activeCat, setActiveCat] = useState<string>(selectedCatId || "all");
  const [activeTab, setActiveTab] = useState<"all" | "featured" | "new" | "price_drop">("all");
  const [searchQuery, setSearchQuery] = useState(searchQueryParam);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sizingModalOpen, setSizingModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
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
  const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hi ${brandName}! I have a question about sizing and ordering press-on nails.`
  )}`;

  // Product source
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
          review_count: 32,
          description: p.description || "Handcrafted luxury press-on nails.",
          shape: "Almond",
          finish: "Glossy Gel",
          in_stock: p.in_stock ?? true,
          stock_quantity: p.stock_quantity ?? 50,
          featured: true,
        }))
      : GLAM_STREE_PRODUCTS;

  const filteredProducts = displayProducts.filter((p) => {
    const matchesCat =
      activeCat === "all"
        ? true
        : p.category_id === activeCat ||
          p.category_name.toLowerCase().includes(activeCat.toLowerCase());

    const matchesSearch = searchQuery.trim()
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shape.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.finish.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesCat && matchesSearch;
  });

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
      {/* 1. TOP ANNOUNCEMENT BAR (Screenshot 2) */}
      <div className="bg-[#0b192c] text-white text-[11px] sm:text-xs py-2 px-4 tracking-wide z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="bg-pink-500/20 text-pink-300 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
              SALE
            </span>
            <span className="font-medium truncate">
              Flat 10% off with coupon <strong className="text-yellow-300 font-black">FIRST10</strong> | Free Shipping above ₹999
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300 text-[11px]">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-400" /> Sizing Helpline: +91 {brandPhone}
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Clean White Navbar with Standard Left-Aligned Logo) */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          {/* Left: Mobile Hamburger + Standard Left Logo + Desktop Nav */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
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
                    Studio Catalog
                  </span>
                </div>
              )}
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-700 ml-2">
              <Link href={getStoreHref(slug, "/")} className="hover:text-pink-600 transition-colors">
                Home
              </Link>
              <span className="text-[#0b192c] font-black border-b-2 border-[#0b192c] pb-0.5">
                Press On Nails
              </span>
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

          {/* Right: Actions (Search, Account, Cart) */}
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
                <span className="absolute -top-1 -right-1 bg-[#0b192c] text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-center gap-2">
              <input
                type="text"
                placeholder="Search nails by color, finish (Glossy, Matte), or shape..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#0b192c]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 3. BREADCRUMBS & COLLECTION BANNER */}
      <div className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 pb-2 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          <Link href={getStoreHref(slug, "/")} className="hover:text-slate-700">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-800 font-semibold">Press On Nails</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c]">
              All Press-On Nails
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredProducts.length} handcrafted luxury styles with complimentary prep kits
            </p>
          </div>

          <button
            onClick={() => setSizingModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#D4A373] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs hover:bg-[#c39262] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Nail Sizing Guide</span>
          </button>
        </div>

        {/* Collection Filter Pills (Screenshot 2) */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          {GLAM_STREE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id === "cat-all" ? "all" : cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                (cat.id === "cat-all" && activeCat === "all") || activeCat === cat.id
                  ? "bg-[#0b192c] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {cat.name} ({cat.count || 8})
            </button>
          ))}
        </div>
      </div>

      {/* 4. PRODUCT CARDS GRID (Screenshot 2: 4 Columns Desktop / 2 Mobile) */}
      <section className="max-w-6xl mx-auto px-4 py-4 w-full flex-1">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto my-8 space-y-3">
            <Sparkles className="w-10 h-10 text-pink-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No matching nails found</h3>
            <p className="text-xs text-slate-500">
              Try clearing your search query or choosing another collection tab.
            </p>
            <button
              onClick={() => {
                setActiveCat("all");
                setSearchQuery("");
              }}
              className="bg-[#0b192c] text-white text-xs font-bold px-5 py-2.5 rounded-full"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((p) => {
              const isAdded = addedMap[p.id];
              const inWish = isInWishlist(p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-lg hover:border-slate-300 transition-all group flex flex-col justify-between"
                >
                  <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
                    <Link href={getStoreHref(slug, `/products/${p.id}`)}>
                      <img
                        src={p.thumbnail_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </Link>

                    <div className="absolute top-2 left-2 bg-yellow-400 text-slate-900 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase">
                      {p.discount_percentage}% OFF
                    </div>

                    <button
                      onClick={(e) => handleToggleWishlist(e, p)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-pink-600 transition-colors shadow-xs"
                      title={inWish ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart
                        className={`w-4 h-4 ${inWish ? "fill-pink-600 text-pink-600" : ""}`}
                      />
                    </button>

                    <div className="absolute bottom-1.5 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded text-center truncate">
                      Free Salon Care Kit Included
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-1 text-amber-500 text-[11px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{p.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({p.review_count})</span>
                      </div>

                      <Link
                        href={getStoreHref(slug, `/products/${p.id}`)}
                        className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-pink-600 transition-colors line-clamp-2 mt-1 leading-snug"
                      >
                        {p.name}
                      </Link>

                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Shape: <span className="text-slate-700 font-semibold">{p.shape}</span>
                      </div>
                    </div>

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
        )}
      </section>

      {/* 5. RICH BRAND STORY & CUSTOMER EDUCATION SECTION (Exact Replica of Screenshot 2) */}
      <section className="bg-white border-t border-slate-200/90 py-16 px-4 w-full mt-12">
        <div className="max-w-4xl mx-auto space-y-10 text-slate-700 leading-relaxed text-xs sm:text-sm">
          {/* Main Headline */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0b192c] tracking-tight">
              Tailored Fit, Premium Blend - Everyday Press On Nails
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Crafted with 5 layers of salon-cured UV gel, our handcrafted press-on nails deliver the strength, apex, and finish of a ₹2,500 studio acrylic extension in under 10 minutes. Designed for modern Indian women who want flawless manicures without damaging natural nails.
            </p>
          </div>

          {/* Section 1: What is Tailored Fit */}
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#0b192c]">
              What is Tailored Fit / Custom Sized Press On Nails?
            </h3>
            <p>
              Unlike mass-manufactured drugstore plastic nails that pinch cuticles or pop off after hours, tailored fit press-on nails are measured millimeter by millimeter to match the exact curvature of your natural nail beds. Each set is individually pre-shaped, hand-painted, and coated with salon gel to guarantee zero cuticle gaps and seamless natural appearance.
            </p>
          </div>

          {/* Section 2: Why Choose */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#0b192c]">
              Why Choose Custom Sized Press On Nails?
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">10-Minute Salon Finish at Home:</strong> Skip 2-hour salon appointments and smelly acrylic fumes. Apply anywhere effortlessly.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">Reusable Up to 5 Times:</strong> Crafted with high-grade flexible ABS and UV-cured gel that won’t bend, snap, or discolor.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">Zero Natural Nail Damage:</strong> Painless warm soapy water removal preserves your natural nail plate and natural keratin.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">100% Waterproof & Chip-Resistant:</strong> Shower, do household chores, swim, and workout without fear of lifting.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">Universal Sizing & Custom Options:</strong> Available in XS, S, M, L standards or custom thumb-to-pinky millimeter sizing.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Everyday Designs */}
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#0b192c]">
              Everyday Wear Nail Designs for Daily Luxury
            </h3>
            <p>
              Our collections are curated to blend effortless office minimalism with weekend glam. From classic Parisian French Tips and glazed donut chrome to deep wine burgundy and velvet emerald green, every design is engineered with ergonomic C-curves for comfortable typing, driving, and smartphone use.
            </p>
          </div>

          {/* Section 4: Popular Search Queries */}
          <div className="space-y-2 bg-[#FAF8F5] p-5 rounded-2xl border border-slate-200/80">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Popular Search Queries
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                "Press on nails India",
                "Custom press on nails online",
                "Reusable bridal press on nails",
                "French nude almond nails",
                "Damage free nail extensions",
                "Glossy wine burgundy nails",
                "Nail sizing guide mm",
                "COD press on nails",
              ].map((tag, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[11px] font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Section 5: Reusable with Kit */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#0b192c]">
              Reusable Luxury Nails with Complete Salon Care Kit
            </h3>
            <p>
              Every order from Glam Stree Nails includes a complimentary application kit worth ₹299 containing:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 font-semibold text-slate-800">
                ✓ 1 Liquid Nail Glue (2-3 Weeks)
              </div>
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 font-semibold text-slate-800">
                ✓ 24 Gel Adhesive Tabs (3-5 Days)
              </div>
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 font-semibold text-slate-800">
                ✓ 1 Double-Sided Nail File
              </div>
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 font-semibold text-slate-800">
                ✓ 1 Cuticle Pusher
              </div>
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 font-semibold text-slate-800">
                ✓ 1 Nail Buffer Block
              </div>
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 font-semibold text-slate-800">
                ✓ 2 Alcohol Prep Cleanser Wipes
              </div>
            </div>
          </div>

          {/* Section 6: FAQs (Screenshot 2) */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <h3 className="text-xl font-serif font-black text-[#0b192c] text-center">
              Frequently Asked Questions
            </h3>

            <div className="space-y-2.5">
              {GLAM_STREE_FAQS.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="font-bold text-xs sm:text-sm text-slate-900">{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-[#07111e] text-slate-400 py-12 px-4 text-xs border-t border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <h4 className="font-serif font-black text-white text-base uppercase tracking-tight">
              {brandName}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Handcrafted salon press-on nails delivered across India. 10-minute application with zero natural nail damage.
            </p>
            <div className="text-[11px] space-y-1 text-slate-400">
              <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-pink-400" /> +91 {brandPhone}</p>
              <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-pink-400" /> {brandEmail}</p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-pink-400" /> {brandAddress}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Quick Links</h5>
            <ul className="space-y-1.5">
              <li><Link href={getStoreHref(slug, "/")} className="hover:text-white">Home Storefront</Link></li>
              <li><button onClick={() => setSizingModalOpen(true)} className="hover:text-white text-left">Sizing Chart (XS - L)</button></li>
              <li><Link href={getStoreHref(slug, "/cart")} className="hover:text-white">Cart ({cartCount})</Link></li>
              <li><Link href={getStoreHref(slug, "/account")} className="hover:text-white">Customer Login</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Sizing Help</h5>
            <div className="text-[11px] space-y-1">
              <p>XS: 14, 11, 12, 11, 8 mm</p>
              <p>S: 15, 12, 13, 12, 9 mm</p>
              <p>M: 16, 13, 14, 13, 10 mm</p>
              <p>L: 17, 14, 15, 14, 11 mm</p>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Policies</h5>
            <ul className="space-y-1.5">
              <li><button onClick={() => setActivePolicy("terms")} className="hover:text-white text-left">Terms & Conditions</button></li>
              <li><button onClick={() => setActivePolicy("privacy")} className="hover:text-white text-left">Privacy Policy</button></li>
              <li><button onClick={() => setActivePolicy("shipping")} className="hover:text-white text-left">Shipping Policy</button></li>
              <li><button onClick={() => setActivePolicy("refund")} className="hover:text-white text-left">Return & Refund</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {brandName}. All Rights Reserved.
        </div>
      </footer>

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
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
                    {sz.key}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <a
                href={whatsappUrl}
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

