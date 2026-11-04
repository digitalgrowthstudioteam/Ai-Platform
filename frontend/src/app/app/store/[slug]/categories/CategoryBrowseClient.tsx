"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist } from "@/lib/app-platform/wishlist-store";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import PixelInjector from "@/components/app-platform/store/PixelInjector";
import { pixelTracker } from "@/lib/app-platform/pixel-tracker";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Grid,
  Sparkles,
  Clock,
  Tag,
  SlidersHorizontal,
  Home,
  LayoutGrid,
  User,
  Heart,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Frown,
  ArrowRight,
  Plus,
  Check,
} from "lucide-react";

export default function CategoryBrowseClient() {
  const params = useParams();
  const router = useRouter();

  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);
  const [config, setConfig] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "featured" | "new" | "price_drop">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  const { addItem, itemCount: cartCount } = useVendorCart(slug);
  const { isInWishlist, toggleItem } = useVendorWishlist(slug);

  const categorySliderRef = useRef<HTMLDivElement>(null);

  // Customer session name
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    // Initial category from URL search params
    if (typeof window !== "undefined") {
      const urlCat = new URLSearchParams(window.location.search).get("cat");
      if (urlCat) {
        setSelectedCat(urlCat);
      }
      const urlSearch = new URLSearchParams(window.location.search).get("q");
      if (urlSearch) {
        setSearchQuery(urlSearch);
      }
    }

    // Check session cache for instant render
    let hasCache = false;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(`dgs_store_cache_${resolvedSlug}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.cfg) {
            setConfig(parsed.cfg);
            setCategories(parsed.cats || []);
            setProducts(parsed.prods || []);
            setLoading(false);
            hasCache = true;
          }
        } catch (e) {}
      }
    }

    async function loadCatalog() {
      if (!hasCache) setLoading(true);
      setError(null);
      try {
        const [cfg, cats, prods] = await Promise.all([
          platformApi.getPublicStoreConfig(resolvedSlug),
          platformApi.getPublicStoreCategories(resolvedSlug),
          platformApi.getPublicStoreProducts(resolvedSlug),
        ]);
        setConfig(cfg);
        setCategories(cats);
        setProducts(prods);

        if (typeof window !== "undefined") {
          const prev = sessionStorage.getItem(`dgs_store_cache_${resolvedSlug}`);
          const prevParsed = prev ? JSON.parse(prev) : {};
          sessionStorage.setItem(
            `dgs_store_cache_${resolvedSlug}`,
            JSON.stringify({ ...prevParsed, cfg, cats, prods })
          );
        }
      } catch (err: any) {
        if (!hasCache) setError(err.message || "Failed to load store categories.");
      } finally {
        setLoading(false);
      }
    }

    if (resolvedSlug) {
      loadCatalog();
    }
  }, [params]);

  // Sync customer auth
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

  // Track page view when selected category changes
  useEffect(() => {
    if (selectedCat && categories.length > 0) {
      const current = categories.find((c) => c.id === selectedCat);
      if (current && config) {
        pixelTracker.trackPageView(config, `${current.name} - ${brandName}`);
      }
    }
  }, [selectedCat, categories, config, brandName]);

  // Update browser document title
  useEffect(() => {
    if (typeof document !== "undefined" && config?.store_name) {
      const currentCatObj = categories.find((c) => c.id === selectedCat);
      const catName = currentCatObj ? currentCatObj.name : "Browse All Categories";
      document.title = `${catName} | ${config.store_name}`;
    }
  }, [config, selectedCat, categories]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCat(catId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (catId) {
        url.searchParams.set("cat", catId);
      } else {
        url.searchParams.delete("cat");
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleClearAllFilters = () => {
    setSelectedCat("");
    setActiveTabFilter("all");
    setSearchQuery("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("cat");
      url.searchParams.delete("q");
      window.history.pushState({}, "", url.toString());
    }
  };

  const scrollSlider = (direction: "left" | "right") => {
    if (categorySliderRef.current) {
      const offset = direction === "left" ? -280 : 280;
      categorySliderRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleAddToCart = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    const itemPrice = p.effective_price || p.regular_price || 0;
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
    pixelTracker.trackAddToCart(config, {
      id: p.id,
      name: p.name,
      price: itemPrice,
      quantity: 1,
    });
    setAddedMap((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [p.id]: false }));
    }, 1800);
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat ? p.category_id === selectedCat : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    if (!matchesCat || !matchesSearch) return false;

    if (activeTabFilter === "featured") return !!p.is_featured;
    if (activeTabFilter === "new") return true; // Most recent products
    if (activeTabFilter === "price_drop") return !!p.sale_price && p.sale_price < p.regular_price;
    return true;
  });

  const activeCategoryObj = categories.find((c) => c.id === selectedCat);
  const activeCategoryTitle = activeCategoryObj ? activeCategoryObj.name : "All Products";

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans pb-16 sm:pb-0">
      <PixelInjector config={config} pageTitle={`Categories - ${brandName}`} />

      {/* 1. Header (Vibrant Orange #ff7300 matching Screenshot 2) */}
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
            {/* Cart Icon with Counter Badge */}
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
              title="Search Products"
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
          <div className="bg-orange-700/30 px-4 py-2 border-t border-white/20 animate-in slide-in-from-top-2">
            <div className="max-w-6xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by brand, name or keyword..."
                  className="w-full bg-white text-slate-900 text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border-0 shadow-xs focus:ring-2 focus:ring-white outline-hidden"
                  autoFocus
                />
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-72 h-full shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-extrabold text-slate-900 text-base">Menu</span>
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-[#ff7300] transition-colors"
                >
                  <Home className="w-4 h-4" /> Home Storefront
                </Link>
                <Link
                  href={getStoreHref(slug, "/categories")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-50 text-[#ff7300]"
                >
                  <LayoutGrid className="w-4 h-4" /> Browse Categories
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
                  Legal & Policies
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

      {/* 2. Breadcrumbs & Category Title (Screenshot 2: HOME > BROWSE) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-4 sm:pt-6">
        <nav className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          <Link href={getStoreHref(slug, "/")} className="hover:text-[#ff7300] transition-colors">
            HOME
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-800">BROWSE</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
          {activeCategoryTitle}
        </h1>

        {/* 3. Filter Pills Row (Screenshot 2: ALL PRODUCTS, FEATURED, NEWLY LISTED, PRICE DROP, FILTERS) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none text-xs font-bold tracking-wide">
          <button
            onClick={() => {
              setSelectedCat("");
              setActiveTabFilter("all");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition-all shadow-xs ${
              !selectedCat && activeTabFilter === "all"
                ? "bg-[#ff7300] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            ALL PRODUCTS
          </button>

          <button
            onClick={() => setActiveTabFilter("featured")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition-all shadow-xs ${
              activeTabFilter === "featured"
                ? "bg-[#ff7300] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            FEATURED
          </button>

          <button
            onClick={() => setActiveTabFilter("new")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition-all shadow-xs ${
              activeTabFilter === "new"
                ? "bg-[#ff7300] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            NEWLY LISTED
          </button>

          <button
            onClick={() => setActiveTabFilter("price_drop")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition-all shadow-xs ${
              activeTabFilter === "price_drop"
                ? "bg-[#ff7300] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            PRICE DROP
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap bg-white text-slate-700 border border-slate-200 hover:border-slate-300 transition-all shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            FILTERS
          </button>
        </div>

        {/* 4. Horizontal Category Slider Carousel (Screenshot 2) */}
        <div className="relative my-4">
          {/* Scroll Buttons */}
          <button
            onClick={() => scrollSlider("left")}
            aria-label="Previous categories"
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors hidden sm:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollSlider("right")}
            aria-label="Next categories"
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors hidden sm:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={categorySliderRef}
            className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none snap-x"
          >
            {categories.map((cat) => {
              const isActive = selectedCat === cat.id;
              const catProds = products.filter((p) => p.category_id === cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-3 p-2.5 pr-4 rounded-xl shrink-0 transition-all text-left shadow-xs snap-start ${
                    isActive
                      ? "bg-[#ff7300] text-white shadow-md ring-2 ring-[#ff7300]/30"
                      : "bg-white text-slate-800 border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30"
                  }`}
                  style={{ minWidth: "210px" }}
                >
                  <img
                    src={cat.image_url || "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200"}
                    alt={cat.name}
                    className="w-12 h-12 rounded-lg object-cover shadow-xs bg-white shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-bold text-xs uppercase leading-tight line-clamp-1 ${
                        isActive ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {cat.name}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isActive ? "text-orange-100" : "text-slate-400"
                      }`}
                    >
                      {catProds.length} products
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Sub-category / Selected Category Banner Box (Screenshot 2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 my-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-100/70 border border-orange-200 flex flex-col items-center justify-center text-[#ff7300] font-black shrink-0">
            <Grid className="w-4 h-4" />
            <span className="text-[9px] tracking-wider uppercase">ALL</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {activeCategoryTitle}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              All {activeCategoryTitle}
            </h2>
          </div>
        </div>

        {/* 6. Products Grid OR Empty State (Screenshot 2) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#ff7300] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600">Loading catalog items...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5 my-6">
            {filteredProducts.map((p) => {
              const regularPrice = p.regular_price || 0;
              const effectivePrice = p.effective_price || p.regular_price || 0;
              const hasDiscount = regularPrice > effectivePrice;
              const discountPct = hasDiscount
                ? Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  <div className="relative aspect-square bg-slate-50 overflow-hidden">
                    <img
                      src={p.thumbnail_url || "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500"}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {hasDiscount && (
                      <span className="absolute top-2 left-2 bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                        {discountPct}% OFF
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleItem({
                          id: p.id,
                          product_id: p.id,
                          name: p.name,
                          slug: p.slug,
                          regular_price: p.regular_price,
                          effective_price: p.effective_price,
                          thumbnail_url: p.thumbnail_url,
                        });
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-slate-600 hover:text-red-500 shadow-xs"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isInWishlist(p.id) ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    {p.sku && (
                      <span className="text-[10px] font-mono font-medium text-slate-400 uppercase mb-1">
                        {p.sku}
                      </span>
                    )}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2 flex-1">
                      {p.name}
                    </h3>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-base sm:text-lg font-black text-slate-900">
                        ₹{effectivePrice}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{regularPrice}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, p)}
                      className={`w-full py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                        addedMap[p.id]
                          ? "bg-emerald-600 text-white"
                          : "bg-[#ff7300] text-white hover:bg-orange-600"
                      }`}
                    >
                      {addedMap[p.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added to Cart
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Exact Empty State from User's Screenshot 2 */
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center my-6">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <Frown className="w-10 h-10 text-slate-400 stroke-1" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-sm mb-6 leading-relaxed">
              We could not find any approved storefront products for the current filter.
            </p>
            <button
              onClick={handleClearAllFilters}
              className="bg-[#ff7300] text-white font-bold text-xs sm:text-sm px-8 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-all uppercase tracking-wider active:scale-95"
            >
              CLEAR ALL FILTERS
            </button>
          </div>
        )}
      </main>

      {/* 7. Dark Footer (Screenshot 2 & 3) */}
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

      {/* 8. Sticky Mobile Bottom Navigation (Screenshot 2 & 3) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around py-2 shadow-lg">
        <Link
          href={getStoreHref(slug, "/")}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#ff7300]"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </Link>

        <Link
          href={getStoreHref(slug, "/categories")}
          className="flex flex-col items-center gap-0.5 text-[#ff7300]"
        >
          <LayoutGrid className="w-5 h-5 text-[#ff7300]" />
          <span className="text-[10px] font-bold text-[#ff7300]">Categories</span>
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
