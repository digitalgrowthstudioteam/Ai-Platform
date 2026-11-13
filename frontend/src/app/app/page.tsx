"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { platformApi } from "@/lib/app-platform/api";
import { Plan } from "@/lib/app-platform/types";
import {
  Smartphone,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Star,
  Play,
  CreditCard,
  Truck,
  Bell,
  ShoppingBag,
  HelpCircle,
  ArrowUpRight,
  Check,
  Flame,
  Package,
  Clock,
  DollarSign,
  Download,
  Share2,
  Sliders,
  Send,
  HardDrive,
  Gift,
  Menu,
  X,
} from "lucide-react";

const formatStorageGb = (mb: number) => {
  if (!mb) return "1 GB";
  const gb = mb / 1024;
  return gb >= 1 ? `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB` : `${mb} MB`;
};

const FALLBACK_PLANS: Plan[] = [
  {
    id: "b8f38d9f-e1f9-49c9-b032-0ca958e00441",
    name: "Starter Store",
    slug: "starter-store",
    monthly_price_inr: 499,
    yearly_price_inr: 4990,
    setup_fee_inr: 10000,
    setup_fee_sale_price_inr: 2000,
    waive_setup_fee_yearly: false,
    storage_limit_mb: 1024,
    max_products: 999999,
    is_active: true,
    features_json: "[]",
    created_at: new Date().toISOString(),
  },
];

export default function PlatformHomePage() {
  const { user } = usePlatformAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [plansLoading, setPlansLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [currentBannerSlide, setCurrentBannerSlide] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchPlans() {
      try {
        setPlansLoading(true);
        const fetched = await platformApi.getPublicPlans();
        if (isMounted && fetched && fetched.length > 0) {
          const activeOnly = fetched.filter((p) => p.is_active);
          if (activeOnly.length > 0) {
            setPlans(activeOnly);
          }
        }
      } catch (err) {
        console.warn("Could not fetch dynamic plans from server, using configured defaults", err);
      } finally {
        if (isMounted) setPlansLoading(false);
      }
    }
    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerSlide((prev) => (prev + 1) % 3);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const minMonthlyPrice = plans.length > 0
    ? Math.min(...plans.map((p) => p.monthly_price_inr))
    : 499;

  const minYearlyPrice = plans.length > 0
    ? Math.min(...plans.map((p) => p.yearly_price_inr ?? p.monthly_price_inr * 10))
    : 4990;

  const maxSavingsPercent = plans.reduce((max, p) => {
    const fullYear = p.monthly_price_inr * 12;
    const yr = p.yearly_price_inr ?? p.monthly_price_inr * 10;
    const pct = fullYear > 0 ? Math.round(((fullYear - yr) / fullYear) * 100) : 0;
    return Math.max(max, pct);
  }, 0);

  const minSaleSetup = plans.length > 0
    ? Math.min(...plans.map((p) => p.setup_fee_sale_price_inr ?? 2000))
    : 2000;

  const minOriginalSetup = plans.length > 0
    ? Math.min(...plans.map((p) => p.setup_fee_inr ?? 10000))
    : 10000;

  const bannerSlides = [
    {
      id: "price",
      badge: "LIMITED OFFER",
      badgeClass: "bg-amber-400 text-slate-950 font-black",
      content: (
        <span>
          Now start with your own official <strong>Branded Android App</strong> just for{" "}
          <span className="font-extrabold text-amber-300 underline decoration-amber-400 decoration-2">
            ₹{minMonthlyPrice}/mo today!
          </span>
        </span>
      ),
      ctaText: "Get Your Own App Today",
      ctaLink: "/app/register",
    },
    {
      id: "discount",
      badge: "ANNUAL SAVINGS",
      badgeClass: "bg-emerald-400 text-slate-950 font-black",
      content: (
        <span>
          Save up to{" "}
          <strong className="text-emerald-300">
            {maxSavingsPercent > 0 ? `${maxSavingsPercent}% OFF` : "special discounts"}
          </strong>{" "}
          with Annual Billing + customized setup fee options!
        </span>
      ),
      ctaText: "View Annual Plans",
      ctaLink: "#pricing",
    },
    {
      id: "instant",
      badge: "0% COMMISSION",
      badgeClass: "bg-indigo-400 text-slate-950 font-black",
      content: (
        <span>
          <strong>Direct 1-Tap UPI Settlements</strong> + Unlimited Free Push Notifications on customer lock screens!
        </span>
      ),
      ctaText: "Explore Features",
      ctaLink: "#features",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* STICKY HEADER (ANNOUNCEMENT BANNER + MODERN GLASS NAVIGATION) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full transition-all">
        {/* 1. TOP ANNOUNCEMENT BANNER (DYNAMIC & ROTATING TICKER) */}
        {!bannerDismissed && (
          <div className="bg-gradient-to-r from-purple-950 via-slate-950 to-indigo-950 border-b border-purple-500/20 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-6 shadow-md backdrop-blur-md transition-all">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              {/* Prev Slide (Desktop) */}
              <button
                type="button"
                onClick={() =>
                  setCurrentBannerSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
                }
                className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Previous announcement"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Slide Content */}
              <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center overflow-hidden">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-xs ${bannerSlides[currentBannerSlide].badgeClass}`}
                >
                  <Flame className="w-3 h-3 animate-pulse text-slate-950 fill-slate-950" />
                  {bannerSlides[currentBannerSlide].badge}
                </span>

                <div className="transition-all duration-300">
                  {bannerSlides[currentBannerSlide].content}
                </div>

                <Link
                  href={bannerSlides[currentBannerSlide].ctaLink}
                  className="inline-flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4 decoration-amber-400/50 hover:decoration-amber-300 transition-all text-xs ml-1"
                >
                  <span>{bannerSlides[currentBannerSlide].ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Next Slide & Dismiss Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentBannerSlide((prev) => (prev + 1) % bannerSlides.length)
                  }
                  className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Next announcement"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                  aria-label="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. MODERN GLASS NAVIGATION (CLEAN & DYNAMIC) */}
        <nav
          className={`border-b border-slate-800/80 transition-all ${
            isScrolled
              ? "bg-slate-950/95 shadow-xl shadow-purple-950/20 backdrop-blur-xl"
              : "bg-slate-950/85 backdrop-blur-md"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Logo */}
            <Link href="/app" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-all text-white">
                <Smartphone className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-purple-200 transition-colors">
                    Digital Growth Studio
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    App Engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Branded Android Apps for Businesses</p>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-300">
              <a
                href="#android-showcase"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
              >
                <span>Showcase</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                  New
                </span>
              </a>
              <a
                href="#features"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-all"
              >
                Features
              </a>
              <a
                href="#ai-importer"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-all"
              >
                AI Importer
              </a>
              <Link
                href="/app/demoapp"
                className="px-3 py-1.5 rounded-lg hover:text-purple-300 hover:bg-purple-950/40 transition-all flex items-center gap-1"
              >
                <span>Live Demo</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
              </Link>
              <a
                href="#pricing"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1.5 group"
              >
                <span>Pricing</span>
                <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md group-hover:bg-amber-500/25 transition-colors">
                  from ₹{minMonthlyPrice}/mo
                </span>
              </a>
              <a
                href="#faq"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-all"
              >
                FAQ
              </a>
            </div>

            {/* User Auth Buttons + Mobile Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <Link
                  href={user.role === "SUPER_ADMIN" ? "/app/admin" : "/app/dashboard"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md shadow-purple-600/30 transition-all hover:scale-[1.02]"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/app/login"
                    className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/app/register"
                    className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Get Your Own App Today</span>
                  </Link>
                </>
              )}

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-hidden"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl px-4 py-5 shadow-2xl">
              <div className="flex flex-col gap-2">
                <a
                  href="#android-showcase"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-900 transition-all flex items-center justify-between font-semibold text-sm"
                >
                  <span>App Showcase</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    New
                  </span>
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-900 transition-all font-semibold text-sm"
                >
                  Features
                </a>
                <a
                  href="#ai-importer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-900 transition-all font-semibold text-sm"
                >
                  AI 1-Click Importer
                </a>
                <Link
                  href="/app/demoapp"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-purple-300 hover:bg-purple-950/30 transition-all flex items-center justify-between font-semibold text-sm"
                >
                  <span>Live Demo App</span>
                  <ArrowUpRight className="w-4 h-4 opacity-70" />
                </Link>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-900 transition-all flex items-center justify-between font-semibold text-sm"
                >
                  <span>Pricing Plans</span>
                  <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    from ₹{minMonthlyPrice}/mo
                  </span>
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-900 transition-all font-semibold text-sm"
                >
                  Frequently Asked Questions
                </a>

                <div className="pt-3 border-t border-slate-800/80 mt-2 flex flex-col gap-2">
                  {!user && (
                    <Link
                      href="/app/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                  <Link
                    href="/app/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Get Your Own App Today — ₹{minMonthlyPrice}/mo</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. HERO SECTION (100% ANDROID APP FOCUS) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32 bg-radial from-purple-950/40 via-slate-900 to-slate-950">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-600/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>India’s #1 Branded Android App Engine for Businesses</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              Get Your Own{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Branded Android Mobile App
              </span>{" "}
              For Your Business.
            </h1>

            {/* Highlighted Callout Box */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-slate-800/60 border-2 border-purple-500/40 shadow-xl shadow-purple-950/50 backdrop-blur-md">
              <p className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight flex items-center justify-center gap-2 flex-wrap">
                <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
                Now start with your own Android App just for ₹{minMonthlyPrice}/mo today!
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium max-w-2xl mx-auto leading-relaxed">
                Zero coding required. Get a production-ready, signed Android APK with your custom logo, colors, and catalog. Keep your brand on customers’ home screens, send unlimited free push notifications, and accept direct UPI payments with <strong>0% platform commission</strong>.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-base shadow-xl shadow-purple-600/30 transition-all hover:scale-105"
              >
                <Smartphone className="w-5 h-5" />
                <span>Get Your Own App Today — ₹{minMonthlyPrice}/mo</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/app/demoapp"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-bold text-base transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
                Test Live Demo App
              </Link>
            </div>

            {/* Key Value Proposition Badges */}
            <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Signed Android APK</p>
                  <p className="text-[11px] text-slate-400">Play Store Ready</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Push Notifications</p>
                  <p className="text-[11px] text-slate-400">85%+ Open Rates</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">AI 1-Click Importer</p>
                  <p className="text-[11px] text-slate-400">Flipkart / Amazon / Meesho</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">0% Platform Fee</p>
                  <p className="text-[11px] text-slate-400">Direct Bank Deposit</p>
                </div>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* ANDROID APP EXPERIENCE SHOWCASE (100% FOCUS ON ANDROID APP) */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div id="android-showcase" className="mt-16 max-w-5xl mx-auto bg-gradient-to-b from-slate-800/40 to-slate-900/60 border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
              {/* Phone Mockup - Showing Real Android App Experience */}
              <div className="w-full max-w-[290px] sm:max-w-[320px] bg-slate-950 rounded-[44px] p-3 border-4 border-slate-700 shadow-2xl shadow-purple-900/40 relative flex-shrink-0 mx-auto">
                {/* Speaker Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />
                
                {/* Inner Android Screen */}
                <div className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 p-4 space-y-3">
                  {/* Android Status Bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pb-1 border-b border-slate-800">
                    <span>09:41</span>
                    <span className="flex items-center gap-1">5G • 100%</span>
                  </div>

                  {/* Android Lock-Screen Style Push Notification Alert */}
                  <div className="bg-purple-950/90 border border-purple-500/50 rounded-xl p-2.5 shadow-md flex items-start gap-2.5 animate-pulse">
                    <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0 text-white">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-300">YOUR APP • PUSH ALERT</span>
                        <span className="text-[9px] text-slate-400">now</span>
                      </div>
                      <p className="text-[11px] text-white font-medium mt-0.5 leading-tight">
                        🔥 Flash Sale: 40% OFF all items! Tap to shop now.
                      </p>
                    </div>
                  </div>

                  {/* App Header Inside Phone */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px]">
                        Y
                      </div>
                      <span className="font-extrabold text-white">Your Brand App</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                      Android Native
                    </span>
                  </div>

                  {/* In-App Promo Banner */}
                  <div className="rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-3 text-white">
                    <span className="text-[9px] uppercase font-black bg-white/20 px-1.5 py-0.5 rounded">Mega Sale</span>
                    <p className="font-extrabold text-xs mt-1">Get 30% OFF On First App Order</p>
                  </div>

                  {/* Product Grid Mock Inside Phone */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                      <div className="w-full h-14 bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        👟 Products
                      </div>
                      <p className="text-[10px] font-bold text-white mt-1 truncate">Running Shoes</p>
                      <p className="text-xs font-black text-amber-300">₹499</p>
                    </div>

                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                      <div className="w-full h-14 bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        🎧 Gadgets
                      </div>
                      <p className="text-[10px] font-bold text-white mt-1 truncate">Wireless Earbuds</p>
                      <p className="text-xs font-black text-amber-300">₹799</p>
                    </div>
                  </div>

                  {/* 1-Tap UPI In-App Button */}
                  <div className="pt-1">
                    <button className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      1-Tap In-App UPI & COD
                    </button>
                  </div>

                  {/* Android Bottom Navigation Bar */}
                  <div className="flex items-center justify-around pt-2 border-t border-slate-800 text-[9px] text-slate-400 font-semibold">
                    <span className="text-purple-400 font-bold">● Home</span>
                    <span>Categories</span>
                    <span>Orders</span>
                    <span>Account</span>
                  </div>
                </div>
              </div>

              {/* Beside Phone: 100% Focused on Why Merchants Need Their Own Android App */}
              <div className="flex-1 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold">
                  <Smartphone className="w-3.5 h-3.5" />
                  Your Own Android App • Permanent Customer Retention
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  Stop Relying on Browser Tabs. Put Your App on Every Customer’s Phone.
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Websites get forgotten in open tabs and search results. With your <strong>official Android App</strong>, your brand logo sits permanently on your customer’s phone home screen. One tap opens your catalog, and push notifications drive repeat purchases on demand.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      Free Lock-Screen Push
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      85%+ open rates! Send flash sales, new stock alerts, and coupon codes directly to customer lock screens for ₹0 ad spend.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Signed APK in 24 Hours
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      We compile and digitally sign your official Android APK. Ready for direct installation via WhatsApp or Google Play Store listing.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-400" />
                      1-Click AI Catalog
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Import all your products from Flipkart, Meesho, or Amazon into your Android app in 3 seconds. Zero manual entry.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      0% Commission UPI & COD
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Customers pay via Google Pay, PhonePe, Paytm, or COD. Payments go directly to your bank account with zero platform cut.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link
                    href="/app/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Get Your Own App Today</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/app/demoapp"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all"
                  >
                    <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
                    <span>Try Interactive App Demo</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. DYNAMIC PRICING SECTION (MONTHLY / YEARLY + SETUP FEE)     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
            <Flame className="w-4 h-4 text-amber-400" />
            Special Launch Plans • Everything Included
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Start With Your Own Android App for{" "}
            <span className="text-amber-300">Just ₹{minMonthlyPrice} Today</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-3">
            Choose monthly flexibility or unlock special savings with annual billing and customized setup fee options.
          </p>

          {/* Interactive Monthly / Yearly Billing Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Yearly Billing</span>
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Save with Annual Discount
              </span>
            </button>
          </div>

          {/* Dynamic Plans Responsive Grid (Mobile / Tablet / Desktop) */}
          <div
            className={`mt-12 grid gap-8 items-stretch ${
              plans.length === 1
                ? "max-w-xl mx-auto"
                : plans.length === 2
                ? "max-w-4xl mx-auto grid-cols-1 md:grid-cols-2"
                : "max-w-7xl mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {plans.map((p, idx) => {
              const saleSetup = p.setup_fee_sale_price_inr ?? 2000;
              const originalSetup = p.setup_fee_inr ?? 10000;
              const yearlyPrice = p.yearly_price_inr ?? p.monthly_price_inr * 10;
              const monthlyEquivalent = Math.round(yearlyPrice / 12);
              const fullYearMonthlySum = p.monthly_price_inr * 12;
              const annualSavings = Math.max(0, Math.round(fullYearMonthlySum - yearlyPrice));
              const discountPercent = fullYearMonthlySum > 0 ? Math.round((annualSavings / fullYearMonthlySum) * 100) : 0;
              const isPopular = p.slug === "starter-store" || idx === 0;

              return (
                <div
                  key={p.id || idx}
                  className="bg-gradient-to-b from-purple-950/80 via-slate-900 to-slate-950 border-2 border-purple-500/60 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-950/60 relative text-left flex flex-col justify-between hover:border-purple-400/80 transition-all"
                >
                  {/* Popular Corner Badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase px-4 py-1 rounded-full shadow-lg tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      Most Popular • Official Android App Plan
                    </div>
                  )}

                  <div>
                    {/* Plan Header */}
                    <div className="flex items-baseline justify-between flex-wrap gap-2 border-b border-slate-800 pb-5 mt-2">
                      <div>
                        <h3 className="text-2xl font-black text-white">{p.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Full production Android APK with your brand name, logo & catalog
                        </p>
                      </div>
                      <div className="text-right">
                        {billingCycle === "monthly" ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl sm:text-5xl font-black text-amber-300">
                                ₹{p.monthly_price_inr}
                              </span>
                              <span className="text-sm font-semibold text-slate-400">/ mo</span>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Cancel anytime
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl sm:text-5xl font-black text-emerald-400">
                                ₹{yearlyPrice}
                              </span>
                              <span className="text-sm font-semibold text-slate-400">/ yr</span>
                              {fullYearMonthlySum > yearlyPrice && (
                                <span className="text-xs text-slate-500 line-through ml-1">
                                  ₹{fullYearMonthlySum}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {annualSavings > 0
                                ? `Only ₹${monthlyEquivalent}/mo • ₹${annualSavings} Discount (${discountPercent}% OFF)`
                                : `Only ₹${monthlyEquivalent}/mo • Annual Billing`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* One-Time Setup Fee Highlight Box */}
                    <div className="mt-4">
                      {billingCycle === "monthly" ? (
                        <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-500/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-purple-400" />
                              One-Time Setup Fee:
                            </span>
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                              Active Price (80% OFF)
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-amber-300">₹{saleSetup}</span>
                            {originalSetup > saleSetup && (
                              <span className="text-xs text-slate-400 line-through">₹{originalSetup}</span>
                            )}
                            <span className="text-[11px] text-slate-300">
                              (One-time custom APK compilation & publishing)
                            </span>
                          </div>
                        </div>
                      ) : p.waive_setup_fee_yearly ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Gift className="w-4 h-4 text-emerald-400" />
                              One-Time Setup Fee:
                            </span>
                            <span className="text-[10px] font-black text-slate-950 bg-emerald-400 px-2 py-0.5 rounded uppercase">
                              100% Free / Waived
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-emerald-400">₹0 Free</span>
                            <span className="text-xs text-slate-400 line-through">₹{originalSetup}</span>
                            <span className="text-[11px] text-emerald-200 font-semibold">
                              🎉 Setup Fee 100% Waived with Annual Plan
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-500/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-purple-400" />
                              One-Time Setup Fee:
                            </span>
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                              Active Price (80% OFF)
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-amber-300">₹{saleSetup}</span>
                            {originalSetup > saleSetup && (
                              <span className="text-xs text-slate-400 line-through">₹{originalSetup}</span>
                            )}
                            <span className="text-[11px] text-slate-300">
                              (One-time custom APK compilation & publishing)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Plan Features Checklist */}
                    <div className="py-6 space-y-3.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        What’s Included in Your Plan:
                      </p>

                      <div className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Branded Android Mobile Application</strong> — Customized with your brand name, logo, colors, and signed production APK ready for customer installation & Play Store publishing.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Unlimited Lock-Screen Push Notifications</strong> — Broadcast flash sales, price cuts, and new arrivals directly to customer lock screens with 85%+ open rates.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>AI 1-Click Product Importer</strong> — Copy-paste links from Amazon, Flipkart, Meesho, or Shopify to auto-create listings in your app catalog in 3 seconds.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>0% Platform Commission</strong> — All payments (Razorpay UPI, GPay, PhonePe, Cards, Netbanking & COD) settle directly into your bank account.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>{formatStorageGb(p.storage_limit_mb)} High-Speed Cloud CDN Storage</strong> — Fast-loading image hosting and asset management included.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Unlimited Products Catalog</strong> — Add and showcase as many products as your cloud storage allows (zero product count limits).
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Automated Logistics & Hyperlocal Delivery</strong> — Integrated Shiprocket dispatch across 29,000+ Indian pincodes + local 45-minute delivery radius.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Live Vendor Management Portal</strong> — Easily manage catalog, banner sliders, inventory, and orders from your smartphone or computer.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <Link
                      href={`/app/register?plan=${p.slug}&billing=${billingCycle}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-base shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02]"
                    >
                      <Smartphone className="w-5 h-5" />
                      <span>Get Your Own App Today</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>

                    <p className="text-[11px] text-center text-slate-400 mt-3 font-medium">
                      🛡️ Secure online checkout via Razorpay • Signed Android APK ready in 24 hours
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. 6 CORE PILLARS & FEATURES GRID */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-slate-900 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Complete Android App Engine</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Everything Your Business Needs In An Android App
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Designed to solve the real challenges Indian store owners face every day: customer retention, catalog creation, high commission fees, and fast delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Your Branded Android Mobile App</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                We generate a customized, production-signed Android APK bundle with your logo, colors, and catalog. Publish on Google Play or share direct download links with customers via WhatsApp.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Lock-Screen Push Notifications</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Re-engage customers anytime without spending a single rupee on SMS or paid ads. Broadcast flash sale alerts, coupon codes, and restock notifications with 85%+ open rates.
              </p>
            </div>

            {/* Card 3 */}
            <div id="ai-importer" className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI 1-Click Product Importer</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Save dozens of hours typing listings. Paste any product link from Flipkart, Meesho, Amazon, or Shopify, and Gemini AI extracts photos, variants, sizes, colors, and prices into your app in seconds.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Direct Razorpay UPI & COD (0% Fee)</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connect your own Razorpay credentials so customer payments via Google Pay, PhonePe, Paytm, and COD go directly to your bank account. We take 0% cut on your revenue.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Shiprocket & Hyperlocal Delivery</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Automated courier generation across 29,000+ Indian pincodes. Deliver local groceries or daily essentials within a 10 km radius in 45 minutes using custom hyperlocal delivery fees.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Image Studio Photo Redesign</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Elevate raw product photos taken on phone cameras into commercial-grade catalog images with studio lighting, realistic reflections, and clean backgrounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. HOW IT WORKS IN 3 SIMPLE STEPS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Launch Timeline</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              From Zero to Live Android App in 3 Steps
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              You don’t need an engineering team or technical skills. We handle the compilation, code generation, and backend servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="text-4xl font-black text-purple-500/30 mb-3 font-mono">01</div>
              <h3 className="text-base font-bold text-white">Brand Your Android App</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Pick your app name, upload your brand logo, and customize your primary theme colors in 2 minutes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="text-4xl font-black text-indigo-500/30 mb-3 font-mono">02</div>
              <h3 className="text-base font-bold text-white">Add Products with 1-Click AI</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Paste existing links from Meesho, Flipkart, or Amazon to import all your photos, sizes, and variants instantly into your app.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="text-4xl font-black text-amber-500/30 mb-3 font-mono">03</div>
              <h3 className="text-base font-bold text-white">Get Your Signed APK & Start Selling</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Download your official signed Android APK within 24 hours, publish to the Google Play Store or share via WhatsApp, and collect orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 7. FAQ ACCORDION */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-slate-900 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Common Questions</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is the One-Time Setup Fee and how does it work?",
                a: `The standard one-time setup fee for compiling, digitally signing, and configuring your Android APK is ₹${minSaleSetup} (discounted from ₹${minOriginalSetup}). For select annual plans with the fee waiver enabled, the setup fee is 100% WAIVED (₹0 setup fee)!`,
              },
              {
                q: `Is the Branded Android App really included for just ₹${minMonthlyPrice}/month?`,
                a: `Yes! For just ₹${minMonthlyPrice}/month, you receive your own official, customized Android Mobile Application (signed APK bundle) with your brand name, logo, colors, and live product catalog, alongside a vendor companion dashboard.`,
              },
              {
                q: "Do I need coding or technical knowledge to manage my app?",
                a: "None whatsoever. Our intuitive Vendor Dashboard allows you to add products, change banners, view orders, and manage inventory with simple clicks—just like using social media.",
              },
              {
                q: "Can I publish my app to the Google Play Store?",
                a: "Absolutely! We provide the production-ready signed Android package. You can publish it under your own Google Play Developer Console, or request our team to guide and assist you with publishing.",
              },
              {
                q: "How do Push Notifications help my business?",
                a: "App push notifications appear directly on your customers' phone lock screens. With 85%+ open rates, they allow you to announce flash sales, discounts, and new arrivals instantly without paying for costly SMS campaigns or running paid ads.",
              },
              {
                q: "Do you take any commission on my app sales?",
                a: "0% Commission! Unlike marketplaces or aggregators that take 15%–30% cuts, you keep 100% of your earnings. Payments via UPI, Cards, and COD go straight to your bank account.",
              },
              {
                q: "How fast do I get my Android APK after registering?",
                a: "Your account is activated instantly upon registration, and your production-signed Android APK bundle is generated and delivered to your dashboard within 24 hours.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-purple-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      activeFaq === idx ? "rotate-90 text-purple-400" : ""
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 8. FINAL HIGH-CONVERSION CTA */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-slate-900 via-purple-950/60 to-slate-950 border-t border-slate-800 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 mx-auto flex items-center justify-center shadow-xl shadow-purple-600/30 mb-6">
            <Smartphone className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Put Your Brand App on Every Customer’s Phone Today.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mt-4 leading-relaxed">
            Stop losing customers to marketplaces and browser tabs. Build lasting brand loyalty with your own official Android application starting at just ₹{minMonthlyPrice}/mo today.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-base shadow-2xl shadow-purple-600/40 transition-all hover:scale-105"
            >
              <Smartphone className="w-5 h-5" />
              <span>Get Your Own App Today</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/app/demoapp"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base transition-all"
            >
              <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
              <span>Test Live App Demo</span>
            </Link>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            ✓ Instant Activation • ✓ Cancel Anytime • ✓ 24-Hour APK Delivery • ✓ 0% Commission
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 9. FOOTER */}
      {/* ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-sm">Digital Growth Studio</span>
            <span className="text-slate-500 ml-2">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-slate-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/app/login" className="hover:text-white transition-colors">Merchant Login</Link>
            <Link href="/app/register" className="hover:text-amber-300 font-bold transition-colors">Get Your Own App Today (from ₹{minMonthlyPrice}/mo)</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
