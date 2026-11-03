"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist } from "@/lib/app-platform/wishlist-store";
import { getStoreHref } from "@/lib/app-platform/store-route-helper";
import {
  ShoppingCart,
  Heart,
  Phone,
  MessageCircle,
  Sparkles,
  Scissors,
  Ruler,
  Truck,
  ShieldCheck,
  Star,
  Check,
  ChevronRight,
  Eye,
  X,
  Share2,
  Clock,
  ArrowRight,
  Package,
} from "lucide-react";
import PolicyModal, { PolicyType } from "@/components/app-platform/store/PolicyModal";

interface KcAariWorkThemeProps {
  slug: string;
  config: any;
  categories: any[];
  products: any[];
  banners: any[];
}

export default function KcAariWorkTheme({
  slug,
  config,
  categories,
  products,
  banners,
}: KcAariWorkThemeProps) {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { addItem, itemCount: cartCount } = useVendorCart(slug);
  const { isInWishlist, toggleItem, itemCount: wishlistCount } = useVendorWishlist(slug);

  // Dynamic business WhatsApp and display phone for this specific business/subdomain
  const rawBusinessPhone =
    config?.whatsapp_number ||
    config?.contact_phone ||
    config?.business_phone ||
    "";
  const cleanDigits = rawBusinessPhone.replace(/[^0-9]/g, "");
  // Indian 10-digit mobile numbers get prefixed with 91 for WhatsApp international format
  const whatsappPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  const displayPhone = rawBusinessPhone.trim()
    ? (rawBusinessPhone.startsWith("+") ? rawBusinessPhone : (cleanDigits.length === 10 ? `+91 ${cleanDigits}` : `+${cleanDigits}`))
    : (whatsappPhone ? `+${whatsappPhone}` : "+91 8999899577");

  const storeDisplayName = config?.store_name || "KC AARI WORK";
  const storeDisplayAddress = config?.business_address || "Pune, Maharashtra, India";
  const storeDisplayEmail = config?.contact_email || "support@digitalgrowthstudio.in";

  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);

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

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat ? p.category_id === selectedCat : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCat && matchesSearch;
  });

  const getWhatsAppOrderUrl = (product: any) => {
    const text = encodeURIComponent(
      `Hi ${storeDisplayName}! 🌟\n\nI want to order this bridal blouse from your website:\n*${product.name}*\nPrice: ₹${product.effective_price || product.regular_price}\nSKU: ${product.sku || "N/A"}\n\nPlease share blouse customization options, saree color matching, and measurement details.`
    );
    return `https://wa.me/${whatsappPhone}?text=${text}`;
  };

  const getGeneralWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `Hi ${storeDisplayName}! 🌸 I am visiting your website and want to consult with your master designer regarding a custom bridal aari work blouse.`
    );
    return `https://wa.me/${whatsappPhone}?text=${text}`;
  };

  const getCustomSareeMatchUrl = () => {
    const text = encodeURIComponent(
      `Hi ${storeDisplayName}! 🧵 I have a saree photo and need your design recommendation for a matching bridal aari / maggam work blouse. Can I share the photos and discuss measurements?`
    );
    return `https://wa.me/${whatsappPhone}?text=${text}`;
  };

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
      effective_price: p.effective_price || p.regular_price,
      thumbnail_url: p.thumbnail_url,
      quantity: 1,
      stock_quantity: p.stock_quantity,
    });
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
      effective_price: p.effective_price || p.regular_price,
      thumbnail_url: p.thumbnail_url,
      quantity: 1,
      stock_quantity: p.stock_quantity,
    });
    router.push(getStoreHref(slug, "/checkout"));
  };

  const handleToggleWishlist = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      id: p.id,
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      regular_price: p.regular_price,
      effective_price: p.effective_price || p.regular_price,
      sale_price: p.sale_price,
      thumbnail_url: p.thumbnail_url,
      category_name: p.category_name,
      in_stock: p.stock_quantity > 0,
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-[#D4AF37]/30">
      {/* ──────────────────────────────────────────────
          1. TOP ANNOUNCEMENT BAR
      ────────────────────────────────────────────── */}
      <div className="bg-[#041D10] border-b border-[#D4AF37]/25 text-amber-100 text-[11px] sm:text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-amber-200">
              ✨ Flat 10% Off on Pre-Bridal Orders | Free Pan-India Delivery on Orders above ₹2,999
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-amber-200/80">
            <span>Est. Dispatch: 3-5 Business Days</span>
            <span>•</span>
            <a
              href={`tel:${whatsappPhone}`}
              className="hover:text-amber-300 font-semibold transition-colors flex items-center gap-1"
            >
              <Phone className="w-3 h-3 text-[#D4AF37]" />
              {displayPhone}
            </a>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          2. LUXURY STOREFRONT HEADER
      ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#062817]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand Logo & Title */}
          <Link href={getStoreHref(slug)} className="flex items-center gap-3 shrink-0 group">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-amber-200 to-[#C5A059] p-0.5 shadow-md group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#062817] rounded-[14px] flex items-center justify-center text-[#D4AF37] font-serif font-black text-xl tracking-tighter">
                KC
              </div>
            </div>
            <div>
              <span className="font-serif font-black text-base sm:text-lg text-white tracking-wider uppercase block leading-tight group-hover:text-amber-300 transition-colors">
                KC AARI WORK
              </span>
              <span className="text-[10px] text-amber-200/90 tracking-widest uppercase font-medium">
                Royal Bridal & Handcrafted Blouses
              </span>
            </div>
          </Link>

          {/* Search Box (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search bridal blouses, maggam motifs, zardosi designs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full bg-white/10 border border-[#D4AF37]/30 text-white placeholder-amber-100/50 text-xs focus:outline-none focus:border-[#D4AF37] focus:bg-white/15 transition-all"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-200/70 text-xs">
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/70 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Actions & WhatsApp Direct Order */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* WhatsApp Direct Order Button */}
            <a
              href={getGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:shadow-emerald-600/30"
              title="Chat with Master Designer on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span className="hidden sm:inline">Chat on WhatsApp</span>
              <span className="sm:hidden font-sans">Chat</span>
            </a>

            {/* Wishlist Link */}
            <Link
              href={getStoreHref(slug, "/account")}
              className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-[#D4AF37]/30 transition-colors"
              title="Saved Wishlist"
            >
              <Heart className="w-4 h-4 text-amber-200" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-slate-900 font-extrabold text-[10px] flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              href={getStoreHref(slug, "/cart")}
              className="relative p-2 rounded-full bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#C5A059] text-slate-900 font-bold shadow-md hover:scale-105 transition-transform"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────
          3. ROYAL HERO SECTION (Matches Screenshot!)
      ────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#062817] via-[#093520] to-[#041D10] text-white pt-8 pb-12 sm:pt-14 sm:pb-16 overflow-hidden border-b border-[#D4AF37]/30">
        {/* Subtle Decorative Gold Patterns in Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-[#D4AF37]/60 text-amber-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Handcrafted Luxury Heritage • Direct from Artisans</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-400">
                ROYAL HANDCRAFTED BRIDAL AARI WORK BLOUSES
              </h1>

              <p className="text-xs sm:text-sm text-amber-100/85 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                Exquisite Zardosi, Maggam, and Cutdana embroidery hand-stitched by master artisans. Tailored to your custom bridal measurements with 100% matching guarantee on every fabric.
              </p>

              {/* Call to Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#collections"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#C5A059] text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-amber-400/25 transition-all cursor-pointer hover:scale-102"
                >
                  Shop All Blouses
                </a>
                <a
                  href={getCustomSareeMatchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 border border-[#D4AF37]/60 font-bold text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Order Custom on WhatsApp</span>
                </a>
              </div>

              {/* Social Proof Metrics Bar */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-amber-200/90 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white font-mono text-sm">2,500+</span>
                  <span className="text-[11px] text-amber-200/70">Happy Brides</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white font-mono text-sm">100%</span>
                  <span className="text-[11px] text-amber-200/70">Custom Fitting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-amber-300 font-mono text-sm">4.9/5 ★</span>
                  <span className="text-[11px] text-amber-200/70">Verified Reviews</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <a
                  href={`tel:${whatsappPhone}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/15 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-300" />
                  <span>Call Us: {displayPhone}</span>
                </a>
                <a
                  href={getGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat with Designer</span>
                </a>
              </div>
            </div>

            {/* Right Hero Spotlight Card (Matches Screenshot!) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm rounded-3xl p-2 bg-gradient-to-b from-[#D4AF37]/50 via-amber-500/20 to-transparent shadow-2xl border border-[#D4AF37]/40 overflow-hidden group">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=85"
                    alt="Royal Peacock Gold Handcrafted Bridal Blouse"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30" />

                  {/* Corner Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#D4AF37] text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                    Bridal Showstopper
                  </div>

                  {/* Bottom Product Info */}
                  <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-[#062817]/90 backdrop-blur-md border border-[#D4AF37]/30 text-white">
                    <p className="text-[10px] text-amber-200 uppercase tracking-wider font-semibold">
                      Authentic Pure Silk Embroidery
                    </p>
                    <h3 className="font-serif font-bold text-sm text-white line-clamp-1">
                      Royal Peacock Gold Handcrafted Bridal Blouse
                    </h3>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/10">
                      <span className="font-mono text-amber-300 font-extrabold text-sm">
                        ₹4,950
                      </span>
                      <a
                        href={getWhatsAppOrderUrl({
                          name: "Royal Peacock Gold Handcrafted Bridal Blouse",
                          effective_price: 4950,
                          sku: "KCA-HERO-001",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        Order on WhatsApp →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          4. TRUST BADGES STRIP (Cream Background)
      ────────────────────────────────────────────── */}
      <section className="bg-white border-b border-amber-900/10 py-6 sm:py-8 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm">100% Handcrafted</h4>
              <p className="text-[11px] text-slate-500">Authentic Zari & Maggam Work</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <Ruler className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm">Custom Fit Guarantee</h4>
              <p className="text-[11px] text-slate-500">Tailored to exact measurements</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm">Express Pan-India</h4>
              <p className="text-[11px] text-slate-500">Insured doorstep dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm">Direct Artisan Chat</h4>
              <p className="text-[11px] text-slate-500">Video call measurement help</p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          5. BRIDAL & FESTIVE BLOUSE COLLECTIONS (Catalog)
      ────────────────────────────────────────────── */}
      <section id="collections" className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-8">
        {/* Section Heading */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-[11px] font-bold tracking-widest text-[#C5A059] uppercase block font-serif">
            CURATED FOR SPECIAL OCCASIONS
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-[#062817] tracking-tight">
            BRIDAL & FESTIVE BLOUSE COLLECTIONS
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
            Choose from our ready-to-stitch designer blouses or order completely customized matching your saree fabric and neckline.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCat("")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCat === ""
                ? "bg-[#062817] text-amber-200 shadow-md border border-[#D4AF37]/50"
                : "bg-white text-slate-700 border border-slate-200 hover:border-amber-300"
            }`}
          >
            All Collections ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(c.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCat === c.id
                  ? "bg-[#062817] text-amber-200 shadow-md border border-[#D4AF37]/50"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-amber-300"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid (Matches Screenshot!) */}
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-md mx-auto space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">No Designs Found</h3>
            <p className="text-xs text-slate-500">Try selecting a different collection tab.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p, idx) => {
              const discountPct =
                p.sale_price && p.regular_price
                  ? Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)
                  : 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-amber-900/10 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                    <img
                      src={p.thumbnail_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Badge top left */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#062817]/90 text-amber-200 text-[10px] font-bold shadow-xs border border-[#D4AF37]/30">
                        {idx === 0
                          ? "✨ Most Loved Bridal"
                          : idx === 1
                          ? "🔥 Trending Festive"
                          : idx === 2
                          ? "👑 Royal Wedding Edition"
                          : idx === 3
                          ? "📦 Ready-to-Ship Box"
                          : "🌟 Handcrafted Detail"}
                      </span>
                    </div>

                    {/* Wishlist Button top right */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(e, p)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition-all z-10 cursor-pointer"
                      title="Add to Wishlist"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isInWishlist(p.id) ? "fill-rose-500 text-rose-500" : "text-slate-400 hover:text-rose-500"
                        }`}
                      />
                    </button>

                    {/* Quick View Button Hover */}
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(p)}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#062817]/90 text-amber-200 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Quick View
                    </button>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Color swatches */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-800 border border-white shadow-xs" title="Emerald Green" />
                        <span className="w-3 h-3 rounded-full bg-rose-700 border border-white shadow-xs" title="Crimson Red" />
                        <span className="w-3 h-3 rounded-full bg-pink-600 border border-white shadow-xs" title="Rani Pink" />
                        <span className="w-3 h-3 rounded-full bg-amber-600 border border-white shadow-xs" title="Mustard Gold" />
                        <span className="text-[10px] text-slate-400 font-mono ml-1">+ Custom Colors</span>
                      </div>

                      <h3 className="font-serif font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-[#062817] transition-colors">
                        {p.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      {/* Pricing */}
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg sm:text-xl font-extrabold text-[#062817] font-mono">
                            ₹{(p.effective_price || p.regular_price).toLocaleString("en-IN")}
                          </span>
                          {p.sale_price && p.regular_price && (
                            <span className="text-xs text-slate-400 line-through font-mono">
                              ₹{p.regular_price.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {discountPct > 0 && (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>

                      {/* Action Buttons: WhatsApp Order (Primary) & Add to Cart */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(e, p)}
                          className="w-full py-2.5 px-3 rounded-xl border border-[#062817] text-[#062817] hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer text-center"
                        >
                          Add to Cart
                        </button>
                        <a
                          href={getWhatsAppOrderUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────
          6. CUSTOM SAREE COLOR MATCHING & MEASUREMENTS (Screenshot Match!)
      ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#062817] via-[#0A3520] to-[#041D10] text-white p-6 sm:p-10 border-2 border-[#D4AF37]/50 shadow-2xl relative overflow-hidden">
          {/* Gold Glow Accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[11px] font-bold tracking-widest text-[#D4AF37] uppercase font-serif">
                NEED CUSTOM MEASUREMENTS?
              </span>

              <h2 className="text-xl sm:text-3xl font-serif font-black tracking-tight text-white leading-tight">
                CUSTOM SAREE COLOR MATCHING & MEASUREMENTS
              </h2>

              <p className="text-xs sm:text-sm text-amber-100/85 leading-relaxed font-light">
                Send us your saree photo on WhatsApp. Our master designers will suggest matching aari work motifs, thread colors, and take your exact blouse measurements over video call or chat.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-amber-100/90 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-bold">✓</span>
                  <span>100% Saree Color Match Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-bold">✓</span>
                  <span>Video Call Measurement Guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-bold">✓</span>
                  <span>Front, Back & Sleeve Neck Customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-bold">✓</span>
                  <span>Premium Latkans & Hand-rolled Tassels Included</span>
                </div>
              </div>

              <div className="pt-3">
                <a
                  href={getCustomSareeMatchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#C5A059] text-slate-950 font-black text-xs sm:text-sm shadow-xl hover:scale-102 transition-transform cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-slate-950" />
                  <span>Get Free Design Recommendation on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Right Photo Illustration */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80"
                  alt="Aari Work Threads and Needlework"
                  className="w-full h-56 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          7. AARI WORK BLOUSE CARE GUIDE (Matches Screenshot!)
      ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-[11px] font-bold tracking-widest text-[#C5A059] uppercase block font-serif">
            KEEP YOUR HERITAGE WEAR PRISTINE
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#062817] tracking-tight">
            AARI WORK BLOUSE CARE GUIDE
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-light">
            Handcrafted embroidery requires mindful care to protect metallic zari threads and cutdana stones for generations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-xs space-y-2 hover:border-[#D4AF37]/50 transition-colors">
            <div className="text-2xl">🧼</div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">Dry Clean Only</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Never hand-wash or machine-wash heavy zari and zardosi work. Always opt for professional dry cleaning.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-xs space-y-2 hover:border-[#D4AF37]/50 transition-colors">
            <div className="text-2xl">🌬️</div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">Store in Cotton Cloth</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Wrap the blouse in pure cotton or mulmul cloth to protect embroidery threads from moisture and tarnishing.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-xs space-y-2 hover:border-[#D4AF37]/50 transition-colors">
            <div className="text-2xl">❌</div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">Avoid Direct Perfume</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Perfumes, mists, and deos contain chemicals that can tarnish golden zari and metallic cutdana beads.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-xs space-y-2 hover:border-[#D4AF37]/50 transition-colors">
            <div className="text-2xl">♨️</div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">Iron on Reverse Side</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Always iron on reverse side with low heat, or use steam from distance without touching the embroidery.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          8. LUXURY BOUTIQUE FOOTER (Deep Green & Gold)
      ────────────────────────────────────────────── */}
      <footer className="bg-[#041D10] text-amber-100/90 pt-12 pb-8 border-t border-[#D4AF37]/30 text-xs">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C5A059] p-0.5">
                <div className="w-full h-full bg-[#041D10] rounded-[10px] flex items-center justify-center text-[#D4AF37] font-serif font-black text-lg">
                  KC
                </div>
              </div>
              <h3 className="font-serif font-black text-lg text-white uppercase tracking-wider">
                KC AARI WORK
              </h3>
            </div>
            <p className="text-amber-100/70 text-xs leading-relaxed max-w-md">
              Luxury handcrafted bridal blouses, maggam work, and zardosi embroidery made with pure love and passion by traditional artisans.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={getGeneralWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Order on WhatsApp</span>
              </a>
              <a
                href={`tel:${whatsappPhone}`}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-colors inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-amber-300" />
                <span>Call Us</span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-serif font-bold text-white uppercase tracking-wider text-xs mb-3">
              Collections & Help
            </h4>
            <ul className="space-y-2 text-amber-200/80">
              <li>
                <a href="#collections" className="hover:text-amber-300 transition-colors">
                  Bridal Heavy Work
                </a>
              </li>
              <li>
                <a href="#collections" className="hover:text-amber-300 transition-colors">
                  Floral & Peacock Motifs
                </a>
              </li>
              <li>
                <a href="#collections" className="hover:text-amber-300 transition-colors">
                  Simple Festive Wear
                </a>
              </li>
              <li>
                <a href="#collections" className="hover:text-amber-300 transition-colors">
                  Custom Stitched Pieces
                </a>
              </li>
              <li>
                <Link href={getStoreHref(slug, "/cart")} className="hover:text-amber-300 transition-colors">
                  My Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-white uppercase tracking-wider text-xs mb-3">
              Boutique Studio
            </h4>
            <ul className="space-y-2 text-amber-200/80">
              <li>📞 Direct: {displayPhone}</li>
              <li>💬 WhatsApp: {displayPhone}</li>
              <li>📍 Studio: {storeDisplayAddress}</li>
              <li>⏰ Hours: Mon - Sat: 10 AM - 8:30 PM</li>
              <li className="text-[11px] text-emerald-400 font-semibold">✓ Custom Orders Open</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-amber-200/60 text-center sm:text-left">
          <p>© {new Date().getFullYear()} KC AARI WORK. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-amber-200/80">
            <button
              type="button"
              onClick={() => setActivePolicy("terms")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActivePolicy("privacy")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActivePolicy("shipping")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Shipping & Delivery
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActivePolicy("refund")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Return & Refund
            </button>
          </div>
          <p className="flex items-center justify-center gap-1.5">
            <span>Powered by</span>
            <span className="font-bold text-amber-300">Digital Growth Studio</span>
          </p>
        </div>
      </footer>

      {/* Boutique Policy Modal */}
      {activePolicy && (
        <PolicyModal
          isOpen={Boolean(activePolicy)}
          onClose={() => setActivePolicy(null)}
          type={activePolicy}
          storeName={config?.store_name || "KC AARI WORK"}
          content={getPolicyContent(activePolicy)}
        />
      )}

      {/* ──────────────────────────────────────────────
          9. QUICK VIEW PRODUCT MODAL
      ────────────────────────────────────────────── */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#D4AF37]/40 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={quickViewProduct.thumbnail_url}
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-[#062817] text-amber-200 font-bold text-[10px] uppercase">
                  Handcrafted Pure Silk
                </span>

                <h3 className="font-serif font-black text-xl text-slate-900 leading-snug">
                  {quickViewProduct.name}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {quickViewProduct.description}
                </p>

                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-2xl font-black text-[#062817] font-mono">
                    ₹{(quickViewProduct.effective_price || quickViewProduct.regular_price).toLocaleString("en-IN")}
                  </span>
                  {quickViewProduct.sale_price && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      ₹{quickViewProduct.regular_price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={getWhatsAppOrderUrl(quickViewProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Order on WhatsApp (Custom Fitting)</span>
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        handleAddToCart(e, quickViewProduct);
                        setQuickViewProduct(null);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-[#062817] text-[#062817] hover:bg-slate-50 font-bold text-xs cursor-pointer text-center"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        handleBuyNow(e, quickViewProduct);
                        setQuickViewProduct(null);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#062817] text-amber-200 hover:bg-[#0A3520] font-bold text-xs cursor-pointer text-center"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

