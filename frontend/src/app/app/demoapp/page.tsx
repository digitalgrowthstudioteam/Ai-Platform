"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  Download,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Store,
  Zap,
  Truck,
  MapPin,
  CreditCard,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  PackageCheck,
  Building2,
  Clock,
  Layers,
  HeartHandshake,
  QrCode,
  Shield,
  Apple,
} from "lucide-react";

interface DemoAppItem {
  id: string;
  name: string;
  tagline: string;
  category: string;
  colorTheme: {
    primary: string;
    bgGradient: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    glow: string;
    accentBtn: string;
  };
  iconPath: string;
  apkPath: string;
  apkFilename: string;
  apkSize: string;
  version: string;
  storeSlug: string;
  webStoreUrl: string;
  badges: string[];
  keyHighlights: string[];
  description: string;
  industry: string;
  bestFor: string;
}

const DEMO_APPS: DemoAppItem[] = [
  {
    id: "fresh-n-fast",
    name: "Fresh N Fast",
    tagline: "Quick-Commerce Veggies, Fruits & Grocery App",
    category: "Hyperlocal Quick-Commerce",
    colorTheme: {
      primary: "emerald",
      bgGradient: "from-emerald-500/10 via-emerald-50/40 to-transparent",
      badgeBg: "bg-emerald-100",
      badgeText: "text-emerald-800 border-emerald-200",
      border: "border-emerald-200 hover:border-emerald-400",
      glow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
      accentBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25",
    },
    iconPath: "/downloads/icons/fresh-n-fast.png",
    apkPath: "https://github.com/digitalgrowthstudioteam/Ai-Platform/releases/download/v1.0.0-demo-apps/FreshNFast-release.apk",
    apkFilename: "FreshNFast-release.apk",
    apkSize: "52.8 MB",
    version: "v1.0.2",
    storeSlug: "fresh-n-fast",
    webStoreUrl: "/app/store/fresh-n-fast",
    badges: ["15-25 Min Delivery", "Live GPS Geofence", "Produce Cart Stepper"],
    keyHighlights: [
      "15–25 minute hyperlocal delivery with dynamic radius restriction (1-50 km)",
      "Bigbasket & Zepto style produce quantity steppers (kg, grams, pieces)",
      "Zero-friction guest shopping: browse immediately, sign in only when checking out",
      "Live order dispatch notification with direct merchant WhatsApp connectivity",
      "Pale sage (#EDF4EE) visual theme with instant category filtering",
    ],
    description:
      "A lightning-fast quick-commerce application crafted for local grocery stores, organic vegetable & fruit vendors, and dairy merchants. Features real-time distance calculation, live GPS coordinate validation, and customizable minimum order values.",
    industry: "Grocery, Produce & Daily Essentials",
    bestFor: "Local Kiranas, Farm-Fresh Produce, Quick Marts & Cloud Kitchens",
  },
  {
    id: "ashtekar-collection",
    name: "Ashtekar Collection",
    tagline: "Premium Men's Wear & Ethnic Fashion App",
    category: "Apparel & Ethnic Couture",
    colorTheme: {
      primary: "amber",
      bgGradient: "from-amber-500/10 via-amber-50/40 to-transparent",
      badgeBg: "bg-amber-100",
      badgeText: "text-amber-800 border-amber-200",
      border: "border-amber-200 hover:border-amber-400",
      glow: "shadow-amber-500/10 hover:shadow-amber-500/20",
      accentBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25",
    },
    iconPath: "/downloads/icons/ashtekar-collection.png",
    apkPath: "https://github.com/digitalgrowthstudioteam/Ai-Platform/releases/download/v1.0.0-demo-apps/AshtekarCollection-release.apk",
    apkFilename: "AshtekarCollection-release.apk",
    apkSize: "52.9 MB",
    version: "v1.0.1",
    storeSlug: "ashtekar",
    webStoreUrl: "/app/store/ashtekar",
    badges: ["Size Selectors", "Pan-India Shipping", "Curated Lookbook"],
    keyHighlights: [
      "Garment size matrix (38, 40, 42, 44) with precise body measurements",
      "High-resolution lookbook galleries with multi-angle photography zoom",
      "Pan-India courier shipping powered by Shiprocket, Bluedart & Delhivery",
      "Instant checkout via Razorpay: UPI, Google Pay, PhonePe, Cards & Netbanking",
      "Regal navy & champagne gold theme customized for traditional couture",
    ],
    description:
      "A sophisticated fashion boutique app designed for designer kurtas, wedding sherwanis, blazers, and menswear. Packed with rich visual lookbooks, variant size selection, order tracking, and seamless courier delivery across India.",
    industry: "Men's Fashion & Ethnic Wear",
    bestFor: "Fashion Designers, Boutiques, Tailoring Brands & Apparel Stores",
  },
  {
    id: "glam-stree-nails",
    name: "Glam Stree Nails",
    tagline: "Handcrafted Luxury Press-On Nails & Beauty App",
    category: "Beauty & Cosmetics",
    colorTheme: {
      primary: "rose",
      bgGradient: "from-rose-500/10 via-rose-50/40 to-transparent",
      badgeBg: "bg-rose-100",
      badgeText: "text-rose-800 border-rose-200",
      border: "border-rose-200 hover:border-rose-400",
      glow: "shadow-rose-500/10 hover:shadow-rose-500/20",
      accentBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25",
    },
    iconPath: "/downloads/icons/glam-stree-nails.png",
    apkPath: "https://github.com/digitalgrowthstudioteam/Ai-Platform/releases/download/v1.0.0-demo-apps/GlamStreeNails-release.apk",
    apkFilename: "GlamStreeNails-release.apk",
    apkSize: "52.0 MB",
    version: "v1.0.1",
    storeSlug: "glam-stree",
    webStoreUrl: "/app/store/glam-stree",
    badges: ["Nail Shape Selector", "Custom Sizing Kit", "COD & Prepaid"],
    keyHighlights: [
      "Interactive nail shape picker: Almond, Coffin, Stiletto, Square & Oval",
      "Comprehensive nail sizing guide (XS, S, M, L) with custom millimeter entry",
      "Nail prep kit add-ons (adhesive tabs, liquid glue, cuticle pusher)",
      "Instagram-style aesthetic cards with customer review galleries",
      "Rose-gold luxury palette with fluid product transitions",
    ],
    description:
      "A high-converting beauty studio mobile app designed for handcrafted press-on nails, cosmetic accessories, and bespoke self-care kits. Delivers a boutique salon shopping experience with visual shape guides and custom nail measurements.",
    industry: "Beauty, Cosmetics & Salon Accessories",
    bestFor: "Nail Artists, Beauty Salons, Handcrafted Cosmetics & Accessories",
  },
];

const FAQS = [
  {
    q: "How do I install these demo apps on my Android phone?",
    a: "Click 'Download Android APK' on any demo card. Once downloaded, tap the file in your notification bar or Downloads folder. If your phone asks for permission to install from your browser, toggle 'Allow from this source'. The app installs in seconds and connects directly to live platform data.",
  },
  {
    q: "Are these apps fully functional with real orders?",
    a: "Yes! Each demo app is a genuine production build generated by the Digital Growth Studio build engine. You can browse categories, add items to cart, test size selectors or quantity steppers, and view checkout. They are connected to live demo stores.",
  },
  {
    q: "Can I get an app with my own business name, logo, and colors?",
    a: "Absolutely! When you register as a vendor, you choose your brand name, store logo, color scheme, and fulfillment method. Our automated platform compiles a 100% white-labeled Flutter Android APK dedicated to your business.",
  },
  {
    q: "How do customer payments work in my custom app?",
    a: "All payments go 100% directly into your merchant bank account. You can enable instant UPI (Google Pay, PhonePe, Paytm, BHIM) and Razorpay gateway. Digital Growth Studio takes 0% commission on your sales.",
  },
  {
    q: "Can I use Hyperlocal 20-min delivery AND courier shipping?",
    a: "You have complete control! In your vendor dashboard, you can activate Hyperlocal Quick-Commerce for instant radius-based delivery (1–50 km with GPS coordinates), or standard Pan-India courier shipping with automated tracking.",
  },
  {
    q: "Do I need technical skills or coding knowledge to launch my app?",
    a: "Zero coding required! You simply add your products through our intuitive web dashboard, upload images and prices, and click 'Request App Build'. We provide your APK and help publish to Google Play Store.",
  },
];

export default function DemoAppLandingPage() {
  const [downloadModalApp, setDownloadModalApp] = useState<DemoAppItem | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleDownloadClick = (app: DemoAppItem) => {
    setDownloadModalApp(app);
    // Programmatically trigger download
    const link = document.createElement("a");
    link.href = app.apkPath;
    link.download = app.apkFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Top Promotional Bar */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white text-xs font-semibold py-2.5 px-4 text-center border-b border-purple-500/30">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black tracking-wider uppercase">
            LIVE DEMOS READY
          </span>
          <span>Download and test our 3 production Android apps right now on your phone!</span>
          <a
            href="#demo-apps"
            className="underline font-bold hover:text-purple-200 transition-colors inline-flex items-center gap-1"
          >
            Jump to Downloads <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Navbar */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">
                  Digital Growth Studio
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  App Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 font-medium">
                White-Labeled Mobile App Builder
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#demo-apps" className="hover:text-purple-400 transition-colors">
              Featured Apps
            </a>
            <a href="#how-it-works" className="hover:text-purple-400 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-purple-400 transition-colors">
              Platform Features
            </a>
            <a href="#faqs" className="hover:text-purple-400 transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app/login"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
            >
              Vendor Login
            </Link>
            <Link
              href="/app/register"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] transition-all"
            >
              <span>Build My App Today</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Hero Section */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-purple-600/25 via-indigo-600/20 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-10 w-[350px] h-[350px] bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-rose-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-purple-300 text-xs font-bold mb-6 shadow-xl">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Interactive Android Demo Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-slate-400 font-normal">Real Production Builds</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Download Our Live Android Apps & See What{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
              Your Business App
            </span>{" "}
            Can Look Like
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed">
            Test 15-minute quick-commerce delivery, designer fashion lookbooks, and custom beauty shape selectors on your own Android phone. Ready to launch? Turn your store into a white-labeled mobile app today.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <a
              href="#demo-apps"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Demo APKs</span>
            </a>
            <Link
              href="/app/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-sm transition-all"
            >
              <Store className="w-4 h-4 text-purple-400" />
              <span>Register as a Vendor</span>
            </Link>
          </div>

          {/* Trust stats pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto mt-12 pt-10 border-t border-slate-800/80 text-left">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-purple-400">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Speed</span>
              </div>
              <p className="text-lg font-black text-white mt-1">60 FPS Native</p>
              <p className="text-[11px] text-slate-400">Fluid Flutter UI engine</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Commission</span>
              </div>
              <p className="text-lg font-black text-white mt-1">0% On Sales</p>
              <p className="text-[11px] text-slate-400">Direct UPI & Razorpay</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fulfillment</span>
              </div>
              <p className="text-lg font-black text-white mt-1">Hyperlocal + Pan-India</p>
              <p className="text-[11px] text-slate-400">Radius GPS or couriers</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security</span>
              </div>
              <p className="text-lg font-black text-white mt-1">White-Labeled</p>
              <p className="text-[11px] text-slate-400">Your brand, logo & domain</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Featured Demo Apps Section */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="demo-apps" className="py-16 sm:py-24 bg-slate-900/60 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black tracking-widest text-purple-400 uppercase">
              FEATURED CLIENT PROFILES
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Select an Industry App to Download & Test
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3">
              Each demo is a tailored Android APK with distinct color palettes, category trees, cart workflows, and checkout logic suited to that specific business model.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {DEMO_APPS.map((app) => {
              const isGreen = app.colorTheme.primary === "emerald";
              const isAmber = app.colorTheme.primary === "amber";
              const isRose = app.colorTheme.primary === "rose";

              return (
                <div
                  key={app.id}
                  className={`flex flex-col justify-between rounded-3xl bg-slate-950/90 border ${app.colorTheme.border} p-6 sm:p-7 shadow-2xl ${app.colorTheme.glow} transition-all duration-300 relative overflow-hidden group`}
                >
                  {/* Subtle corner gradient */}
                  <div
                    className={`absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
                      isGreen ? "bg-emerald-500/20" : isAmber ? "bg-amber-500/20" : "bg-rose-500/20"
                    }`}
                  />

                  {/* Top Header */}
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      {/* App Icon */}
                      <div className="relative">
                        <div
                          className={`w-20 h-20 rounded-2xl p-1.5 bg-slate-900 border border-slate-700/80 shadow-xl overflow-hidden flex items-center justify-center shrink-0 ${
                            isGreen ? "group-hover:border-emerald-500" : isAmber ? "group-hover:border-amber-500" : "group-hover:border-rose-500"
                          } transition-colors`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={app.iconPath}
                            alt={`${app.name} App Icon`}
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-900 border border-slate-700 text-slate-300">
                          {app.version}
                        </span>
                      </div>

                      {/* App Category Badge */}
                      <div className="flex flex-col items-end">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isGreen
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : isAmber
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {app.category}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 font-mono">
                          {app.apkSize} • Android 8.0+
                        </span>
                      </div>
                    </div>

                    {/* App Title & Tagline */}
                    <div className="mt-5">
                      <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        {app.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{app.tagline}</p>
                    </div>

                    {/* Industry & Target */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs">
                      <div className="flex items-center gap-2 text-slate-300 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Best for:</span>
                        <span className="text-slate-400 font-medium">{app.bestFor}</span>
                      </div>
                    </div>

                    {/* Feature Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {app.badges.map((b, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800"
                        >
                          ✓ {b}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                      {app.description}
                    </p>

                    {/* Key Highlights Checklist */}
                    <div className="mt-5 space-y-2 border-t border-slate-900 pt-4">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Included App Capabilities:
                      </span>
                      {app.keyHighlights.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isGreen ? "text-emerald-400" : isAmber ? "text-amber-400" : "text-rose-400"
                            }`}
                          />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Area */}
                  <div className="mt-8 pt-5 border-t border-slate-800/80 space-y-2.5">
                    {/* Primary APK Download Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadClick(app)}
                      className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all hover:scale-[1.02] cursor-pointer ${app.colorTheme.accentBtn}`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Android APK</span>
                      <span className="text-[10px] opacity-80 font-mono">({app.apkSize})</span>
                    </button>

                    {/* Live Web Store Link */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={app.webStoreUrl}
                        target="_blank"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Live Web Store Preview</span>
                      </Link>
                    </div>

                    <p className="text-[10px] text-center text-slate-500 pt-1">
                      Direct download • SHA-256 Verified • No Google Play login required
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Installation Instructions & Android Safety Note */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="py-14 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/40 border border-slate-800 p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-purple-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
                Android Quick-Install Guide (Takes 30 Seconds)
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                How to Install the APK on Your Android Device
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Android displays a standard security prompt for apps downloaded outside Google Play. Our APKs are digitally signed with verified platform release keys.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="font-bold text-purple-300 block mb-0.5">1. Tap Download</span>
                  <span className="text-slate-400">Save the APK file to your phone's storage.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="font-bold text-purple-300 block mb-0.5">2. Allow Source</span>
                  <span className="text-slate-400">Toggle 'Allow from this source' if Chrome asks.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="font-bold text-purple-300 block mb-0.5">3. Tap Install</span>
                  <span className="text-slate-400">Launch and experience the native app immediately!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* How It Works for Vendors */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black tracking-widest text-purple-400 uppercase">
              SEAMLESS 3-STEP ONBOARDING
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Launch Your Own Brand App Like These in 3 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              No developer hiring. No server configurations. We provide the full SaaS ecommerce suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 relative hover:border-purple-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-black text-lg mb-5">
                01
              </div>
              <h3 className="text-lg font-bold text-white">Create Vendor Account</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Register your business at{" "}
                <Link href="/app/register" className="text-purple-400 underline font-semibold">
                  /app/register
                </Link>
                . Pick your brand name, color palette, custom logo, and your personal subdomain (e.g. yourbrand.digitalgrowthstudio.in).
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                <Clock className="w-3.5 h-3.5" /> Takes only 60 seconds
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 relative hover:border-purple-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-lg mb-5">
                02
              </div>
              <h3 className="text-lg font-bold text-white">Add Products & Fulfillment</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Upload your product catalog with images, variants, and pricing. Choose Hyperlocal 20-min delivery with GPS radius or Pan-India courier shipping.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
                <Layers className="w-3.5 h-3.5" /> Unlimited products & categories
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 relative hover:border-purple-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-lg mb-5">
                03
              </div>
              <h3 className="text-lg font-bold text-white">Receive Your Brand APK</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Our automated builder compiles your branded Android APK. Share direct download links with customers, put QR codes in your shop, or publish on Play Store.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                <QrCode className="w-3.5 h-3.5" /> Ready for customer orders
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Platform Features Grid */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black tracking-widest text-purple-400 uppercase">
              EVERYTHING INCLUDED
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Why Businesses Choose Digital Growth Studio
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Enterprise-grade mobile commerce capabilities built specifically for Indian local businesses and direct-to-consumer brands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">100% White-Labeled</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Your customers only see your store brand, logo, and colors. No Digital Growth Studio branding on your mobile app or receipts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Direct UPI & Razorpay Settlements</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Money doesn't pass through intermediaries. Customer UPI payments flow straight into your merchant bank account immediately.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Hyperlocal Radius Delivery</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Define your delivery radius (1 to 50 km) from your shop. Mobile app validates customer GPS automatically and calculates distance fees.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Pan-India Courier Shipping</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Shipping nationwide? Connect Shiprocket, generate courier shipping labels, and send automated AWB tracking links via SMS & WhatsApp.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Real-Time Cloud Inventory Sync</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Change a price, toggle an out-of-stock badge, or add a banner on your admin dashboard — it reflects on the mobile app in under 1 second.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center mb-4">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Dedicated WhatsApp Support</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Our engineering team assists you with store setup, custom APK compilation, banner designs, and Google Play Store submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FAQ Accordion */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="faqs" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-black tracking-widest text-purple-400 uppercase">
            COMMON QUESTIONS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm text-white flex items-center justify-between gap-4 cursor-pointer hover:text-purple-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Bottom Mega Call to Action (Register As A Vendor) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 border-t border-purple-900/40 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Your Store In 10 Minutes</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Ready to Give Your Brand Its Own Android App Today?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mt-5 leading-relaxed">
            Stop paying 20-30% aggregator commissions. Give your customers their own branded app icon on their phone's home screen with 1-click orders and instant UPI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/app/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-2xl shadow-purple-600/50 hover:scale-105 transition-all"
            >
              <Store className="w-5 h-5" />
              <span>Create Your Free Vendor Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/app/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition-all"
            >
              <span>Existing Vendor Sign In</span>
            </Link>
          </div>

          {/* Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Free 14-day trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Ready Android APK generated
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> 0% sales commission
            </span>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Footer */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Digital Growth Studio</span>
            <span>• Multi-Vendor SaaS App Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/app/register" className="hover:text-purple-400 transition-colors">
              Vendor Register
            </Link>
            <Link href="/app/login" className="hover:text-purple-400 transition-colors">
              Vendor Login
            </Link>
            <Link href="/app/store/fresh-n-fast" className="hover:text-purple-400 transition-colors">
              Fresh N Fast Web
            </Link>
            <Link href="/app/store/ashtekar" className="hover:text-purple-400 transition-colors">
              Ashtekar Web
            </Link>
            <Link href="/app/store/glam-stree" className="hover:text-purple-400 transition-colors">
              Glam Stree Web
            </Link>
          </div>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Download Alert Toast/Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {downloadModalApp && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl shadow-purple-600/20 text-white animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-xs">Downloading {downloadModalApp.name} APK</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                File: <span className="font-mono text-purple-300">{downloadModalApp.apkFilename}</span> ({downloadModalApp.apkSize})
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Tap the downloaded file in your Android notifications to install.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDownloadModalApp(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

