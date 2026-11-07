"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  Smartphone,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Star,
  Play,
  CreditCard,
  Truck,
  Bell,
  ShoppingBag,
  Store,
  Globe,
  HelpCircle,
  Layers,
  ArrowUpRight,
  Check,
  Flame,
  Award,
  Package,
  Clock,
  Send,
  Sliders,
  DollarSign,
  HeartHandshake,
} from "lucide-react";

export default function PlatformHomePage() {
  const { user } = usePlatformAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white text-xs sm:text-sm font-medium py-2.5 px-4 text-center sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-amber-200">
            <Flame className="w-3 h-3 text-amber-300 animate-pulse" />
            Limited Offer
          </span>
          <span>
            Now start with your own official <strong>Branded Android App & Online Store</strong> just for{" "}
            <span className="underline decoration-amber-300 decoration-2 font-bold text-amber-200">
              ₹499 today!
            </span>
          </span>
          <Link
            href="/app/register"
            className="inline-flex items-center gap-1 font-bold underline underline-offset-4 hover:text-amber-200 transition-colors ml-1"
          >
            Claim ₹499 Offer <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. MODERN GLASS NAVIGATION */}
      {/* ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-[41px] z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/app" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  Digital Growth Studio
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  App Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Branded Android Apps & E-Commerce Stores</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#android-app" className="hover:text-white transition-colors flex items-center gap-1">
              Android App
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">New</span>
            </a>
            <a href="#ai-importer" className="hover:text-white transition-colors">AI Importer</a>
            <Link href="/app/demoapp" className="hover:text-purple-300 transition-colors flex items-center gap-1">
              Live Demo
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </Link>
            <a href="#pricing" className="hover:text-amber-300 transition-colors">Pricing (₹499)</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
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
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/app/register"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02]"
                >
                  Start for ₹499
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. HERO SECTION */}
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
              <span>India’s #1 Branded Android App Engine for Merchants</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              Turn Your Business Into A{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Branded Android Mobile App
              </span>{" "}
              & Online Store.
            </h1>

            {/* Highlighted Callout Box */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-slate-800/60 border-2 border-purple-500/40 shadow-xl shadow-purple-950/50 backdrop-blur-md">
              <p className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight flex items-center justify-center gap-2 flex-wrap">
                <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
                Now start with your own Android App just for ₹499 today!
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium max-w-2xl mx-auto leading-relaxed">
                Zero coding required. Keep your brand on customers’ home screens, send unlimited free push notifications, and accept direct UPI payments with <strong>0% platform commission</strong>.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-base shadow-xl shadow-purple-600/30 transition-all hover:scale-105"
              >
                Get Started for ₹499 Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/app/demoapp"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-bold text-base transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
                Try Live Interactive App Demo
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
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">0% Platform Fee</p>
                  <p className="text-[11px] text-slate-400">Direct Bank Deposit</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">AI 1-Click Importer</p>
                  <p className="text-[11px] text-slate-400">Amazon / Flipkart / Meesho</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">29,000+ Pincodes</p>
                  <p className="text-[11px] text-slate-400">Shiprocket & Hyperlocal</p>
                </div>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* VISUAL PHONE & DESKTOP DUAL SHOWCASE */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="mt-16 max-w-5xl mx-auto bg-gradient-to-b from-slate-800/40 to-slate-900/60 border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
              {/* Phone Mockup */}
              <div className="w-full max-w-[280px] sm:max-w-[320px] bg-slate-950 rounded-[44px] p-3 border-4 border-slate-700 shadow-2xl shadow-purple-900/40 relative">
                {/* Speaker Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />
                {/* Inner Phone Screen */}
                <div className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">YOUR BRAND APP</span>
                    <span className="text-emerald-400 font-mono">Live</span>
                  </div>

                  {/* Banner */}
                  <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white">
                    <span className="text-[10px] uppercase font-bold bg-white/20 px-1.5 py-0.5 rounded">Mega Sale</span>
                    <p className="font-extrabold text-sm mt-1">Get 30% OFF On First Order</p>
                  </div>

                  {/* Product Grid Mock */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                      <div className="w-full h-16 bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        👟 Photo
                      </div>
                      <p className="text-[11px] font-bold text-white mt-1 truncate">Running Shoes</p>
                      <p className="text-xs font-black text-amber-300">₹499</p>
                    </div>

                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                      <div className="w-full h-16 bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        🎧 Photo
                      </div>
                      <p className="text-[11px] font-bold text-white mt-1 truncate">Wireless Earbuds</p>
                      <p className="text-xs font-black text-amber-300">₹799</p>
                    </div>
                  </div>

                  {/* Push notification banner */}
                  <div className="bg-purple-950/80 border border-purple-600/40 rounded-xl p-2.5 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <p className="text-[10px] text-purple-200 leading-tight">
                      <strong>Push Alert:</strong> Flash sale started! Tap to buy now.
                    </p>
                  </div>

                  {/* CTA button inside phone */}
                  <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md">
                    1-Click Checkout (Razorpay & COD)
                  </button>
                </div>
              </div>

              {/* Beside Phone: Desktop Storefront & Dashboard Preview */}
              <div className="flex-1 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
                  <Globe className="w-3.5 h-3.5" />
                  Dual Engine: Android App + High-Speed Web Storefront
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  One Unified Dashboard. Two Channels Generating Sales 24/7.
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Every product, category, or banner you add in your dashboard automatically synchronizes across your <strong>Android Mobile App</strong> and your <strong>Web Storefront</strong> in real-time. No double entry.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      Branded Mobile App
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Customers install your app once and purchase with 1 tap. Push notifications drive repeat orders without ad spend.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Store className="w-4 h-4 text-blue-400" />
                      Web Storefront
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Works on mobile browsers and desktops. Connect your custom domain like <em>yourbrand.com</em> with free SSL.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-4">
                  <Link
                    href="/app/demoapp"
                    className="inline-flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Open Live Interactive Demo <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. MAIN HIGHLIGHT PLAN (PRICING SECTION) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-950 border-t border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
            <Flame className="w-4 h-4 text-amber-400" />
            Special Launch Plan • Everything Included
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Start With Your Own Android App for{" "}
            <span className="text-amber-300">Just ₹499 Today</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-3">
            No developer salaries. No 30% commission cuts. One simple, transparent plan that empowers any Indian store to sell like a multi-crore D2C brand.
          </p>

          {/* Pricing Highlight Card */}
          <div className="mt-12 max-w-xl mx-auto bg-gradient-to-b from-purple-950/80 via-slate-900 to-slate-950 border-2 border-purple-500/60 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-950/60 relative text-left">
            {/* Corner Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase px-4 py-1 rounded-full shadow-lg tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              Most Popular • Starter Store Plan
            </div>

            <div className="flex items-baseline justify-between flex-wrap gap-2 border-b border-slate-800 pb-6 mt-2">
              <div>
                <h3 className="text-2xl font-black text-white">Starter Store & Android App</h3>
                <p className="text-xs text-slate-400 mt-1">Everything you need to launch, sell, and scale online</p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-amber-300">₹499</span>
                  <span className="text-sm font-semibold text-slate-400">/ month</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Cancel anytime
                </span>
              </div>
            </div>

            {/* Feature List */}
            <div className="py-6 space-y-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300">What’s Included in Your ₹499 Plan:</p>

              <div className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Branded Android Mobile Application</strong> — Customized with your logo, colors, and signed APK bundle ready for customer installation & Play Store publishing.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>High-Speed Web Storefront</strong> — Responsive online shop with your custom subdomain (e.g. <em>yourbrand.digitalgrowthstudio.in</em>) or your own custom domain.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>AI 1-Click Product Importer</strong> — Copy-paste links from Amazon, Flipkart, Meesho, or Shopify to auto-create listings in 3 seconds.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>AI Image Studio Photo Redesign</strong> — Convert phone photos into professional catalog photos with AI lighting.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>0% Platform Commission</strong> — All payments (Razorpay UPI, Debit/Credit, Netbanking & COD) settle directly into your bank account.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Automated Logistics & Hyperlocal</strong> — Integrated Shiprocket dispatch across 29,000+ Indian pincodes + local 45-minute radius delivery.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Automated WhatsApp & SMS Updates</strong> — Automated order confirmation, live courier tracking, and dispatch alerts.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>1,024 MB High-Speed Cloud CDN Storage</strong> — Fast-loading image hosting and asset management included free.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Live Vendor Management Dashboard</strong> — Track sales, inventory, variants, customer records, and order fulfillment.
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/app/register"
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-base shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02]"
            >
              Start for ₹499 Today — Instant Activation
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="text-[11px] text-center text-slate-400 mt-3 font-medium">
              🛡️ Secure online checkout via Razorpay • Setup ready in 24 hours
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. 6 CORE PILLARS & FEATURES GRID */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-slate-900 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Complete Merchant Toolkit</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Everything Built Specifically for Indian Sellers
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Designed to solve the real challenges Indian store owners face every day: customer retention, catalog creation, COD fraud, and logistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div id="android-app" className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Your Branded Android Mobile App</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                We generate a customized, production-signed Android APK bundle with your logo, colors, and catalog. Publish on Google Play or share direct download links with customers.
              </p>
            </div>

            {/* Card 2 */}
            <div id="ai-importer" className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI 1-Click Product Importer</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Save dozens of hours typing listings. Paste any product link from Flipkart, Meesho, Amazon, or Shopify, and Gemini AI extracts photos, variants, sizes, colors, and prices in seconds.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Direct Razorpay UPI & COD (0% Fee)</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connect your own Razorpay credentials so payments go directly to your bank account with zero intermediate delays. We take 0% cut on your revenue.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Shiprocket & Hyperlocal Delivery</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Automated courier generation across 29,000+ Indian pincodes. Deliver groceries or local essentials within a 10 km radius in 45 minutes using custom hyperlocal fee slabs.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Automated SMS & WhatsApp Alerts</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Build customer trust with instant order confirmations and dispatched tracking links sent via Fast2SMS and WhatsApp without manual typing.
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
              You don’t need an engineering team or technical skills. We handle the compilation, servers, and database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="text-4xl font-black text-purple-500/30 mb-3 font-mono">01</div>
              <h3 className="text-base font-bold text-white">Register & Brand Your App</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Choose your brand name, upload your store logo, and customize your primary app colors in 2 minutes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="text-4xl font-black text-indigo-500/30 mb-3 font-mono">02</div>
              <h3 className="text-base font-bold text-white">Add Products with 1-Click AI</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Paste existing links from Meesho, Flipkart, or Amazon to import all your photos, sizes, and variants instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="text-4xl font-black text-amber-500/30 mb-3 font-mono">03</div>
              <h3 className="text-base font-bold text-white">Get Your APK & Start Selling</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Download your official signed Android APK within 24 hours, publish to the Google Play Store, and collect orders.
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
                q: "Is the Branded Android App really included for just ₹499/month?",
                a: "Yes! For just ₹499/month, you receive your own official, customized Android Mobile Application (signed APK bundle) with your brand name, logo, colors, and live product catalog, alongside your web storefront.",
              },
              {
                q: "Do I need coding or technical knowledge to manage my app?",
                a: "None whatsoever. Our intuitive Vendor Dashboard allows you to add products, change banners, view orders, and manage inventory with simple clicks—just like using social media.",
              },
              {
                q: "Can I publish my app to the Google Play Store?",
                a: "Absolutely! We provide the production-ready Android package. You can publish it under your own Google Play Developer Console, or request our team to publish and maintain it for you.",
              },
              {
                q: "Do you take any commission on my sales?",
                a: "0% Commission! Unlike food delivery apps or big marketplaces that take 15%–30% cuts, you keep 100% of your earnings. Payments via UPI, Cards, and COD go straight to your bank account.",
              },
              {
                q: "Can I use my own custom domain (e.g. mystore.com)?",
                a: "Yes! You can connect any existing custom domain with 1-click automatic SSL certificate configuration in your dashboard.",
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
            Put Your Brand on Your Customers’ Phones Today.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mt-4 leading-relaxed">
            Stop losing customers to marketplaces. Build real brand equity with your own official Android application and online store.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-base shadow-2xl shadow-purple-600/40 transition-all hover:scale-105"
            >
              Start With Your Android App for ₹499
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/app/demoapp"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base transition-all"
            >
              Test Live App Demo
            </Link>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            ✓ Instant Activation • ✓ Cancel Anytime • ✓ 24-Hour Delivery
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
            <Link href="/app/register" className="hover:text-amber-300 font-bold transition-colors">Get Started (₹499)</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
