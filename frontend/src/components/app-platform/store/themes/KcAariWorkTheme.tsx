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
import { pixelTracker } from "@/lib/app-platform/pixel-tracker";

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

  const handleWhatsAppClick = (product?: any, source: string = "general") => {
    pixelTracker.trackWhatsAppClick(config, {
      productName: product?.name,
      productId: product?.id,
      price: product?.effective_price || product?.regular_price,
      source: source,
    });
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
      effective_price: p.effective_price || p.regular_price,
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
  };

  const handleBuyNow = (e: React.MouseEvent, p: any) => {
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
      effective_price: p.effective_price || p.regular_price,
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
    pixelTracker.trackInitiateCheckout(config, {
      total: itemPrice,
      itemCount: 1,
    });
    router.push(getStoreHref(slug, "/checkout"));
  };

  const handleToggleWishlist = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    const currentlyInWishlist = isInWishlist(p.id);
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
    if (!currentlyInWishlist) {
      pixelTracker.trackAddToWishlist(config, {
        id: p.id,
        name: p.name,
        price: p.effective_price || p.regular_price || 0,
      });
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#FDFBF7] text-slate-900 font-sans selection:bg-[#D4AF37]/30">
      {/* ──────────────────────────────────────────────
          1. TOP ANNOUNCEMENT BAR
      ────────────────────────────────────────────── */}
      <div className="bg-[#041D10] border-b border-[#D4AF37]/25 text-amber-100 text-[11px] sm:text-xs py-2 px-3 sm:px-4 w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 max-w-full">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-medium text-amber-200 text-[10px] sm:text-xs line-clamp-1 sm:line-clamp-none">
              ✨ Flat 10% Off on Pre-Bridal Orders | Free Pan-India Delivery on Orders above ₹2,999
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-amber-200/80">
            <span className="hidden xs:inline">Est. Dispatch: 3-5 Days</span>
            <span className="hidden xs:inline">•</span>
            <a
              href={`tel:${whatsappPhone}`}
              className="hover:text-amber-300 font-semibold transition-colors flex items-center gap-1"
            >
              <Phone className="w-3 h-3 text-[#D4AF37] shrink-0" />
              <span>{displayPhone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          2. LUXURY STOREFRONT HEADER
      ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#062817]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-md w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Title */}
          <Link href={getStoreHref(slug)} className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#D4AF37] via-amber-200 to-[#C5A059] p-0.5 shadow-md group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-[#062817] rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-[#D4AF37] font-serif font-black text-base sm:text-xl tracking-tighter">
                KC
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-serif font-black text-sm sm:text-lg text-white tracking-wider uppercase block leading-tight truncate group-hover:text-amber-300 transition-colors">
                KC AARI WORK
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-200/90 tracking-wide sm:tracking-widest uppercase font-medium block truncate">
                Royal Bridal & Handcrafted Blouses
              </span>
            </div>
          </Link>

          {/* Search Box (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-sm mx-2">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search bridal blouses, maggam motifs, zardosi designs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white/10 border border-[#D4AF37]/30 text-white placeholder-amber-100/50 text-xs focus:outline-none focus:border-[#D4AF37] focus:bg-white/15 transition-all"
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

          {/* Actions: WhatsApp Chat, Wishlist, Cart */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* WhatsApp Direct Order Button */}
            <a
              href={getGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleWhatsAppClick(undefined, "header_chat")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:shadow-emerald-600/30"
              title="Chat with Master Designer on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
              <span className="hidden md:inline">Chat on WhatsApp</span>
              <span className="inline md:hidden text-[11px]">Chat</span>
            </a>

            {/* Wishlist Link */}
            <Link
              href={getStoreHref(slug, "/account")}
              className="relative p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-[#D4AF37]/30 transition-colors"
              title="Saved Wishlist"
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-slate-900 font-extrabold text-[9px] flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              href={getStoreHref(slug, "/cart")}
              className="relative p-1.5 sm:p-2 rounded-full bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#C5A059] text-slate-900 font-bold shadow-md hover:scale-105 transition-transform"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────
          3. ROYAL HERO SECTION (100% Mobile Responsive)
      ────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#062817] via-[#093520] to-[#041D10] text-white pt-6 pb-10 sm:pt-12 sm:pb-16 overflow-hidden border-b border-[#D4AF37]/30 w-full max-w-full">
        {/* Subtle Decorative Gold Patterns in Background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left min-w-0">
              <div className="inline-flex max-w-full items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-[#D4AF37]/60 text-amber-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider overflow-hidden">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4AF37] shrink-0" />
                <span className="truncate">Handcrafted Luxury Heritage • Direct from Artisans</span>
              </div>

              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-snug sm:leading-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-400 break-words">
                ROYAL HANDCRAFTED BRIDAL AARI WORK BLOUSES
              </h1>

              <p className="text-xs sm:text-sm text-amber-100/85 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light break-words">
                Exquisite Zardosi, Maggam, and Cutdana embroidery hand-stitched by master artisans. Tailored to your custom bridal measurements with 100% matching guarantee on every fabric.
              </p>

              {/* Call to Action Buttons: Stack on mobile, side-by-side on tablet/desktop */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3 pt-2 w-full max-w-md mx-auto lg:mx-0">
                <a
                  href="#collections"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#C5A059] text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-amber-400/25 transition-all cursor-pointer text-center"
                >
                  Shop All Blouses
                </a>
                <a
                  href={getCustomSareeMatchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleWhatsAppClick(undefined, "hero_custom_order")}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 border border-[#D4AF37]/60 font-bold text-xs sm:text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Order Custom on WhatsApp</span>
                </a>
              </div>

              {/* Social Proof Metrics Bar */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-2 sm:gap-6 text-center text-xs text-amber-200/90 font-medium max-w-md mx-auto lg:mx-0">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                  <span className="font-bold text-white font-mono text-xs sm:text-sm">2,500+</span>
                  <span className="text-[10px] sm:text-[11px] text-amber-200/70">Happy Brides</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                  <span className="font-bold text-white font-mono text-xs sm:text-sm">100%</span>
                  <span className="text-[10px] sm:text-[11px] text-amber-200/70">Custom Fit</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                  <span className="font-bold text-amber-300 font-mono text-xs sm:text-sm">4.9/5 ★</span>
                  <span className="text-[10px] sm:text-[11px] text-amber-200/70">Reviews</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3 w-full max-w-md mx-auto lg:mx-0">
                <a
                  href={`tel:${whatsappPhone}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/15 transition-colors text-center"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">Call Us: {displayPhone}</span>
                </a>
                <a
                  href={getGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleWhatsAppClick(undefined, "hero_chat_button")}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors text-center"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Chat with Designer</span>
                </a>
              </div>
            </div>

            {/* Right Hero Spotlight Card (Strictly links to dedicated product page) */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div
                onClick={() => {
                  const targetProduct = products && products.length > 0 ? products[0] : null;
                  if (targetProduct) {
                    router.push(getStoreHref(slug, `/products/${targetProduct.id}`));
                  }
                }}
                className="relative w-full max-w-sm rounded-3xl p-2 bg-gradient-to-b from-[#D4AF37]/50 via-amber-500/20 to-transparent shadow-2xl border border-[#D4AF37]/40 overflow-hidden group cursor-pointer"
              >
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
                      <span className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1">
                        View Product Page →
                      </span>
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
      <section className="bg-white border-b border-amber-900/10 py-5 sm:py-8 shadow-xs w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 w-full">
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm truncate">100% Handcrafted</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Authentic Zari Work</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm truncate">Custom Fit Guarantee</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Exact measurements</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm truncate">Express Pan-India</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Insured doorstep</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#FDFBF7] border border-amber-900/5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-serif font-bold text-slate-900 text-xs sm:text-sm truncate">Direct Artisan Chat</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Video call guidance</p>
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

              const productDetailHref = getStoreHref(slug, `/products/${p.id}`);

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(productDetailHref)}
                  className="bg-white rounded-3xl border border-amber-900/10 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                    <Link href={productDetailHref} className="block w-full h-full">
                      <img
                        src={p.thumbnail_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>

                    {/* Badge top left */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
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

                    {/* Dedicated Product Page Navigation Button on Hover */}
                    <Link
                      href={productDetailHref}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#062817]/95 text-amber-200 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all shadow-md flex items-center gap-1.5 hover:bg-[#083820] hover:scale-105 border border-[#D4AF37]/50 z-10"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-300" />
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3 text-amber-300" />
                    </Link>
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

                      <Link href={productDetailHref} className="block group/link">
                        <h3 className="font-serif font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover/link:text-[#062817] transition-colors">
                          {p.name}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </Link>
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
                      <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
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
                          onClick={() => handleWhatsAppClick(p, "product_card_whatsapp")}
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
      <section className="max-w-6xl mx-auto px-3 sm:px-4 py-8 w-full max-w-full overflow-hidden">
        <div className="rounded-3xl bg-gradient-to-r from-[#062817] via-[#0A3520] to-[#041D10] text-white p-5 sm:p-8 lg:p-10 border-2 border-[#D4AF37]/50 shadow-2xl relative overflow-hidden w-full">
          {/* Gold Glow Accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10 w-full">
            <div className="lg:col-span-7 space-y-3 sm:space-y-4 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#D4AF37] uppercase font-serif block">
                NEED CUSTOM MEASUREMENTS?
              </span>

              <h2 className="text-lg sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-white leading-tight break-words">
                CUSTOM SAREE COLOR MATCHING & MEASUREMENTS
              </h2>

              <p className="text-xs sm:text-sm text-amber-100/85 leading-relaxed font-light break-words">
                Send us your saree photo on WhatsApp. Our master designers will suggest matching aari work motifs, thread colors, and take your exact blouse measurements over video call or chat.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-100/90 pt-1">
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
                  <span>Front, Back & Sleeve Customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-bold">✓</span>
                  <span>Premium Latkans & Tassels Included</span>
                </div>
              </div>

              <div className="pt-2 sm:pt-3">
                <a
                  href={getCustomSareeMatchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleWhatsAppClick(undefined, "saree_banner_custom_order")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#C5A059] text-slate-950 font-black text-xs sm:text-sm shadow-xl hover:scale-102 transition-transform cursor-pointer text-center"
                >
                  <MessageCircle className="w-4 h-4 fill-slate-950 shrink-0" />
                  <span className="sm:hidden">Free Design Help on WhatsApp</span>
                  <span className="hidden sm:inline">Get Free Design Recommendation on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Right Photo Illustration */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80"
                  alt="Aari Work Threads and Needlework"
                  className="w-full h-48 sm:h-56 object-cover"
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
                onClick={() => handleWhatsAppClick(undefined, "footer_chat_button")}
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
    </div>
  );
}

