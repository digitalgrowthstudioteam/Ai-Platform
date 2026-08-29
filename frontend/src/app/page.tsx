"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { event as trackGAEvent } from "@/lib/analytics";
import {
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  ShoppingCart,
  Target,
  Eye,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  HelpCircle,
  Shield,
  Layers,
  FileText,
  Image as ImageIcon,
  Users,
  MapPin,
  BarChart3,
  Bot,
  LayoutDashboard,
  Megaphone,
  Check,
  Lock,
  Activity,
  ChevronRight,
  Gauge,
  Sliders,
  CheckCircle,
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Interactive mock dashboard state
  const [mockDatePreset, setMockDatePreset] = useState<"7d" | "30d">("30d");

  const [starterAvailable, setStarterAvailable] = useState(true);

  useEffect(() => {
    async function checkAvailability() {
      try {
        const res = await api.getPlansAvailability();
        setStarterAvailable(res.starter_available);
      } catch (e) {
        console.error("Failed to check plan availability:", e);
      }
    }
    checkAvailability();
  }, []);

  const faqs = [
    {
      q: "Is Digital Growth Studio an agency?",
      a: "No. Digital Growth Studio is an automated SaaS platform that connects directly to your Meta Ads account to provide instant performance analysis, creative breakdowns, and data-driven recommendations.",
    },
    {
      q: "Does it automatically edit or pause my live campaigns?",
      a: "The current version provides safe read-only analysis and clear optimization suggestions so you stay in total control. Automated execution options will be available in future releases.",
    },
    {
      q: "Do I need to share my Meta login password?",
      a: "Never. You authenticate safely using Meta's official secure OAuth flow. We only request read-only access to campaign performance data.",
    },
    {
      q: "Can it pinpoint which ad copy or creative variation performs best?",
      a: "Yes! Our system compares ad formats (Reels, Feed, Carousel), copy angles, and creative visual types to highlight top-performing components.",
    },
    {
      q: "How does the AI generate recommendations?",
      a: "Our algorithm cross-analyzes ROAS, CPA, CTR, frequency, and conversion velocity against historical account baselines to flag fatigue, budget scaling opportunities, and waste.",
    },
    {
      q: "What is the Early Access pricing?",
      a: "Our Early Access plan is currently locked in at just ₹99/month, including a free 7-day trial and all core features.",
    },
    {
      q: "Can I cancel my subscription anytime?",
      a: "Yes, absolutely. You can manage or cancel your plan directly from your account settings with a single click.",
    },
    {
      q: "Is my advertising data secure?",
      a: "Yes. All data is encrypted in transit and at rest. We use strict tenant isolation and enterprise-grade security standards.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden antialiased">
      {/* FAQ Schema for SEO / Search Engine and LLM discoverability */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map((faq) => ({
              "@type": "Question",
              "name": faq.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a,
              },
            })),
          }),
        }}
      />
      {/* 1. ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-sm">
        <span className="inline-flex items-center gap-1.5 bg-white/20 text-white px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
          🔥 Early Access
        </span>
        <span className="text-blue-50 font-medium">
          Get complete Meta Ads intelligence for just <span className="font-bold text-white">₹99/month</span>.
        </span>
        <Link
          href="/signup"
          className="ml-1 underline underline-offset-4 decoration-blue-200/60 hover:decoration-white font-bold transition flex items-center gap-1 group"
        >
          Claim Early Access <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 2. NAVIGATION HEADER */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.jpg" alt="Digital Growth Studio Logo" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                Digital Growth Studio
              </span>
              <span className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase mt-0.5">
                AI Meta Ads Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            {/* Product Dropdown */}
            <div className="relative group">
              <button className="hover:text-slate-950 transition flex items-center gap-1.5 py-2">
                Product <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute top-full -left-4 mt-1 w-64 bg-white border border-slate-200/90 rounded-xl p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 space-y-1">
                <Link
                  href="/signup"
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition group/item"
                >
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md group-hover/item:bg-blue-600 group-hover/item:text-white transition">
                    <LayoutDashboard size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Campaign Analyzer</div>
                    <div className="text-[11px] text-slate-500 font-normal">Full account performance audit</div>
                  </div>
                </Link>
                <Link
                  href="/signup"
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition group/item"
                >
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-md group-hover/item:bg-purple-600 group-hover/item:text-white transition">
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Creative Intelligence</div>
                    <div className="text-[11px] text-slate-500 font-normal">Reels vs Image vs Carousel insights</div>
                  </div>
                </Link>
                <Link
                  href="/signup"
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition group/item"
                >
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md group-hover/item:bg-emerald-600 group-hover/item:text-white transition">
                    <Lightbulb size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">AI Recommendations</div>
                    <div className="text-[11px] text-slate-500 font-normal">Actionable budget scaling tips</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Services Dropdown */}
            <div className="relative group">
              <button className="hover:text-slate-950 transition flex items-center gap-1.5 py-2">
                Services <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute top-full -left-4 mt-1 w-64 bg-white border border-slate-200/90 rounded-xl p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 space-y-1">
                <Link
                  href="/get-meta-ads"
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition group/item"
                >
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md group-hover/item:bg-blue-600 group-hover/item:text-white transition">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Get Meta Ads at ₹333</div>
                    <div className="text-[11px] text-slate-500 font-normal">Introductory ad setup runs</div>
                  </div>
                </Link>
                <Link
                  href="/get-meta-ads/free-plan"
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition group/item"
                >
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-md group-hover/item:bg-purple-600 group-hover/item:text-white transition">
                    <Layers size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Free Campaign Planner</div>
                    <div className="text-[11px] text-slate-500 font-normal">Design campaign outlines for free</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Resources Dropdown */}
            <div className="relative group">
              <button className="hover:text-slate-950 transition flex items-center gap-1.5 py-2">
                Resources <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute top-full -left-4 mt-1 w-52 bg-white border border-slate-200/90 rounded-xl p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 space-y-1">
                <a
                  href="#how-it-works"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  How It Works
                </a>
                <a
                  href="#features"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  Platform Features
                </a>
                <a
                  href="#faq"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  Frequently Asked Questions
                </a>
              </div>
            </div>

            <a href="#pricing" className="hover:text-slate-950 transition">
              Pricing
            </a>
          </nav>

          {/* Desktop Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 transition px-4 py-2.5 rounded-lg hover:bg-slate-100/80"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 active:scale-95"
            >
              Start Free Trial <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Drawer Trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER NAVIGATION */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl border-l border-slate-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover shadow-xs" />
                  <span className="font-extrabold text-sm text-slate-900">Digital Growth Studio</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3 font-semibold text-slate-700 text-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation</div>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">
                  How It Works
                </a>
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">
                  Features
                </a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">
                  Pricing Plans
                </a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">
                  FAQ
                </a>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-4">Services</div>
                <Link href="/get-meta-ads" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" /> Get Meta Ads at ₹333
                </Link>
                <Link href="/get-meta-ads/free-plan" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-600" /> Free Campaign Planner
                </Link>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. HERO SECTION */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto text-center z-10 overflow-hidden">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-400/15 via-indigo-300/15 to-purple-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Feature Chip Pill */}
        <div className="inline-flex items-center gap-2 bg-blue-50/90 border border-blue-200/70 rounded-full px-4 py-1.5 mb-6 text-xs font-bold text-blue-700 shadow-xs">
          <Zap size={14} className="text-blue-600 animate-pulse" />
          <span>Meta Ad Sync • AI Campaign Analyzer • ROAS Optimizer</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 max-w-5xl mx-auto leading-[1.12]">
          Stop Guessing Which <span className="text-gradient-blue">Meta Ads</span> Are Actually Working.
        </h1>

        {/* Subtitle Copy */}
        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          Connect your Meta Ads account in 60 seconds. Digital Growth Studio continuously analyzes your campaigns, ad creatives, copy angles, target audiences, and placements — delivering clear data-driven recommendations on what to scale and what to stop.
        </p>

        {/* Hero Trial Badge & Call to Action Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full text-left">
            {/* Card 1: Free Ads Health Check */}
            <div className="bg-white border border-slate-200 hover:border-blue-500/80 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
              <div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl w-fit mb-4">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Get Free Ads Health Check</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Connect your Meta Ads account securely via OAuth. We will run a real-time audit of your campaigns, CPC, CPL, CTR, and output a premium PDF report with a customized health score.
                </p>
              </div>
              <Link
                href="/health-check"
                id="btn-run-free-health-audit"
                onClick={() => trackGAEvent("cta_click_health_audit")}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs py-3.5 px-5 rounded-xl transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Run Free Health Audit</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Card 2: Strategy Recommendations */}
            <div className="bg-white border border-slate-200 hover:border-indigo-500/80 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
              <div>
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl w-fit mb-4">
                  <Sliders size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Get Campaign Recommendation</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Answer a slide-by-slide 10-question Strategy checklist. Calculate your Strategy Readiness Score (0-100) and identify your top advertising implementation priorities.
                </p>
              </div>
              <Link
                href="/recommendation"
                id="btn-get-campaign-strategy"
                onClick={() => trackGAEvent("cta_click_campaign_strategy")}
                className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs py-3.5 px-5 rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Get Campaign Strategy</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-700">
            <ShieldCheck size={15} className="text-blue-600" /> Safe Read-Only Access
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <Zap size={15} className="text-amber-500" /> 60-Second Setup
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <Lock size={15} className="text-emerald-600" /> Meta OAuth Encrypted
          </span>
        </div>

        {/* 4. DYNAMIC INTERACTIVE DASHBOARD MOCKUP */}
        <div className="mt-14 max-w-6xl mx-auto">
          <div className="bg-slate-900 p-2.5 rounded-2xl shadow-2xl border border-slate-800 text-left">
            {/* Mock Window Title bar */}
            <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                </div>
                <span className="text-xs font-mono font-medium text-slate-400 pl-2 border-l border-slate-800">
                  digital-growth-studio // interactive_demo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Timeframe:</span>
                <button
                  onClick={() => setMockDatePreset("7d")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    mockDatePreset === "7d"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setMockDatePreset("30d")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    mockDatePreset === "30d"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Dashboard Inner Screen (Light Interface) */}
            <div className="bg-white rounded-xl mt-2.5 p-6 border border-slate-200 space-y-6 text-slate-900">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Account Health <Gauge size={13} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 flex items-baseline gap-1">
                    <span className="text-emerald-600">84</span>
                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                    ↑ Healthy account
                  </div>
                </div>

                <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Total Spend <DollarSign size={13} className="text-slate-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {mockDatePreset === "30d" ? "₹54,210" : "₹14,800"}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    {mockDatePreset === "30d" ? "Across 4 campaigns" : "Across 2 campaigns"}
                  </div>
                </div>

                <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Purchases <ShoppingCart size={13} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {mockDatePreset === "30d" ? "589" : "154"}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600">
                    {mockDatePreset === "30d" ? "+18.4% vs last mo" : "+12.1% vs last wk"}
                  </div>
                </div>

                <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Cost / Purchase <Target size={13} className="text-slate-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {mockDatePreset === "30d" ? "₹92" : "₹96"}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600">
                    ↓ 14% below target
                  </div>
                </div>

                <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 space-y-1 col-span-2 lg:col-span-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Blended ROAS <TrendingUp size={13} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-600">
                    {mockDatePreset === "30d" ? "2.64x" : "2.42x"}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Target: 2.0x
                  </div>
                </div>
              </div>

              {/* AI Insights & Creative Comparison Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* AI Recommendations Panel */}
                <div className="bg-blue-50/40 border border-blue-200/70 p-5 rounded-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={15} className="text-blue-600 fill-blue-600/20" /> Active AI Recommendations
                    </div>
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">2 New</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-start gap-3">
                      <div className="p-1.5 bg-rose-100 text-rose-600 rounded-md shrink-0 mt-0.5">
                        <AlertTriangle size={15} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900">
                          Pause underperforming ad: <span className="font-semibold text-rose-700">Summer Sale — Image #2</span>
                        </div>
                        <div className="text-[11px] text-slate-600 leading-normal">
                          ROAS dropped to 0.82x (35% below target). CPA increased by ₹54. Shift budget to top Reels ad.
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-start gap-3">
                      <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md shrink-0 mt-0.5">
                        <Lightbulb size={15} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900">
                          Scale budget: <span className="font-semibold text-emerald-700">Prospecting Conversions — Reels</span>
                        </div>
                        <div className="text-[11px] text-slate-600 leading-normal">
                          Delivering 3.12x ROAS with low frequency (1.4). Safely increase daily budget by +20%.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Creative Performance Comparison */}
                <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-3.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Creative Format Breakdown</span>
                    <span className="text-[10px] font-semibold text-slate-400">Top vs Bottom</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-medium">
                    {/* Top Creative */}
                    <div className="bg-white p-3 rounded-lg border border-emerald-200/90 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Top Performer</div>
                          <div className="font-bold text-slate-900">Video Ad #7 (Instagram Reels)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-600 text-sm">3.12x ROAS</div>
                        <div className="text-[10px] text-slate-400 font-semibold">CPA: ₹69</div>
                      </div>
                    </div>

                    {/* Bottom Creative */}
                    <div className="bg-white p-3 rounded-lg border border-rose-200/90 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <div>
                          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Needs Attention</div>
                          <div className="font-bold text-slate-900">Image Ad #3 (Facebook Feed)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-rose-600 text-sm">0.82x ROAS</div>
                        <div className="text-[10px] text-slate-400 font-semibold">CPA: ₹184</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PROBLEM VS SOLUTION SECTION */}
      <section className="py-20 px-6 bg-white border-y border-slate-200 relative">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Meta Ads Gives You Numbers. <br />
              <span className="text-gradient-blue">Data Alone Doesn't Tell You What To Do Next.</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-normal">
              Most advertisers have access to Spend, Clicks, CTR, and Purchases inside Ads Manager. But turning those raw figures into confident optimization decisions takes hours of manual spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Hard Questions */}
            <div className="bg-slate-50 p-7 rounded-2xl border border-slate-200 space-y-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> The Daily Struggle
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Questions advertisers ask every morning:</h3>
              </div>

              <div className="space-y-3 text-xs font-semibold text-slate-700">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Which ad creative is actually driving high-intent buyers?</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Which campaign is silently bleeding my daily ad budget?</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Is my audience targeting overlapping and driving up CPMs?</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Has creative fatigue set in on my top-performing ad copy?</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>What new variation should I launch next to scale safely?</span>
                </div>
              </div>
            </div>

            {/* The Solution */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4">
                <div className="p-3 bg-white/10 text-white rounded-xl w-fit backdrop-blur-md">
                  <Sparkles size={26} className="text-blue-300 fill-blue-300/20" />
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  Digital Growth Studio eliminates the guesswork.
                </h3>
                <p className="text-sm text-blue-100 leading-relaxed font-normal">
                  Our intelligence engine compiles your performance metrics, creative format parameters, and copy components into clear, step-by-step optimization recommendations.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 gap-4 text-xs font-medium text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Automated ROAS Audit
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Creative Format Compare
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Headline & Copy Analyzer
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Clear Budget Scaling
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. THREE STEP PROCESS PIPELINE */}
      <section id="how-it-works" className="py-20 px-6 max-w-6xl mx-auto scroll-mt-12">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Simple 3-Step Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            From Raw Data to Growth Decisions
          </h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto font-normal">
            No complex developer integration required. Connect your ad account in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4 relative">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-extrabold text-lg">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-900">Connect Meta Account</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Authenticate safely using Meta's official OAuth. Grant read-only access to campaign analytics in just 2 clicks.
            </p>
            <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
              <Lock size={12} /> 100% Encrypted & Safe
            </div>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4 relative">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-extrabold text-lg">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-900">Automated Analysis</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Our system audits campaigns, ad sets, individual ads, copy variations, creative formats, and placements.
            </p>
            <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
              <Zap size={12} /> Instant Account Audit
            </div>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4 relative">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-extrabold text-lg">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-900">Optimize & Scale</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Receive prioritized action items telling you exactly which ads to pause, which budgets to scale, and what to test next.
            </p>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp size={12} /> Higher ROAS & Profit
            </div>
          </div>
        </div>
      </section>

      {/* 7. PLATFORM FEATURES GRID */}
      <section id="features" className="py-20 px-6 bg-slate-900 text-white scroll-mt-12">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950 border border-blue-800 px-3 py-1 rounded-full">
              Complete Feature Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Everything You Need to Scale Meta Ads
            </h2>
            <p className="text-slate-400 text-sm font-normal">
              Built specifically for e-commerce brands, agencies, and performance marketers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition space-y-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg w-fit">
                <Megaphone size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Campaign Analyzer</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Identify top-performing campaigns and detect budget burn early across Advantage+ and manual setups.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition space-y-3">
              <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-lg w-fit">
                <ImageIcon size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Creative Intelligence</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Compare video vs image vs carousel formats with ROAS and cost-per-lead breakdowns.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition space-y-3">
              <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-lg w-fit">
                <FileText size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Ad Copy & Headline Insights</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                See which copy frameworks and headlines generate the highest click-through and purchase conversion rates.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition space-y-3">
              <div className="p-2.5 bg-amber-600/20 text-amber-400 rounded-lg w-fit">
                <Users size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Audience & Placement Audit</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Evaluate Instagram Reels vs Feed vs Audience Network performance to cut non-converting impressions.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition space-y-3">
              <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-lg w-fit">
                <Bot size={20} />
              </div>
              <h3 className="text-base font-bold text-white">AI Recommendation Engine</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Get clear instructions on when to increase budget, when to pause, and when to refresh creative assets.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition space-y-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-lg w-fit">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Performance Analytics</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Track historical trends, blended ROAS, CPA thresholds, and account health scores over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING SECTION */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto scroll-mt-12">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            Find the Right Plan for Your Scale
          </h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto font-normal">
            Choose the right intelligence level for your Meta advertising scale. Start with our 7-day free trial.{" "}
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/80 inline-block mt-1">
              Plan starts from ₹99/- Per Month.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Starter */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starter Tier</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Starter</h3>
                <p className="text-xs text-slate-500 mt-1">Low-cost entry for advertisers</p>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>1 Meta Ad Account</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-emerald-600">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>1 AI Optimization Campaign</span>
                </li>

                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>30 Days historical data</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Every 48 Hours data sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Full Ad & Creative Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Headline & Copy Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Account Health Score</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>PDF/CSV Export</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs"
            >
              Start 7-Day Free Trial
            </Link>
          </div>

          {/* Card 2: Growth */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 shadow-md flex flex-col justify-between relative hover:scale-102 transition-all">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-xs">
              ⭐ Recommended
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Growth Tier</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Growth</h3>
                <p className="text-xs text-slate-500 mt-1">For active scaling advertisers</p>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2 font-bold text-blue-700">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>3 Meta Ad Accounts</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-emerald-600">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>3 AI Optimization Campaigns</span>
                </li>

                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>90 Days historical data</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-blue-700">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Every 12 Hours data sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Advanced Creative Intelligence</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Demographic & Placement Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Campaign & Creative Comparison</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Fatigue & Anomaly Detection</span>
                </li>

              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-md"
            >
              Start 7-Day Free Trial
            </Link>
          </div>

          {/* Card 3: Pro */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professional Tier</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Pro</h3>
                <p className="text-xs text-slate-500 mt-1">For marketing teams & brands</p>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2 font-bold text-indigo-700">
                  <Check size={14} className="text-indigo-600 shrink-0" />
                  <span>10 Meta Ad Accounts</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-emerald-600">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>5 AI Optimization Campaigns</span>
                </li>

                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-600 shrink-0" />
                  <span>180 Days historical data</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-indigo-700">
                  <Check size={14} className="text-indigo-600 shrink-0" />
                  <span>Every 6 Hours data sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-600 shrink-0" />
                  <span>Cross-Account Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-600 shrink-0" />
                  <span>Performance Forecasting</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-600 shrink-0" />
                  <span>Industry Benchmarking</span>
                </li>

              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs"
            >
              Start 7-Day Free Trial
            </Link>
          </div>

          {/* Card 4: Agency */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Tier</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Agency</h3>
                <p className="text-xs text-slate-500 mt-1">For agencies & portfolios</p>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2 font-bold text-purple-700">
                  <Check size={14} className="text-purple-600 shrink-0" />
                  <span>25 Meta Ad Accounts</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-emerald-600">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>10 AI Optimization Campaigns</span>
                </li>

                <li className="flex items-center gap-2">
                  <Check size={14} className="text-purple-600 shrink-0" />
                  <span>365 Days historical data</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-purple-700">
                  <Check size={14} className="text-purple-600 shrink-0" />
                  <span>Every 6 Hours data sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-purple-600 shrink-0" />
                  <span>White-Label Client Reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-purple-600 shrink-0" />
                  <span>Cross-Client Portfolio Analytics</span>
                </li>

              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs"
            >
              Start 7-Day Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-20 px-6 bg-slate-100/70 border-t border-slate-200 scroll-mt-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Questions & Answers</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs transition"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full p-5 text-left font-bold text-sm text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      activeFaq === index ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed font-normal border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FINAL CALL TO ACTION */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to Take Control of Your Meta Ads?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto font-normal">
            Join savvy advertisers optimizing their campaigns with automated data insights.
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm px-9 py-4 rounded-xl transition shadow-2xl hover:scale-105 active:scale-95"
            >
              Start Free 7-Day Trial <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white font-extrabold text-sm">
              <img src="/logo.jpg" alt="Digital Growth Studio Logo" className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex flex-col">
                <span className="leading-none">Digital Growth Studio</span>
                <span className="text-[9px] font-semibold text-blue-500 tracking-wider uppercase mt-0.5">
                  AI Meta Ads Intelligence
                </span>
              </div>
            </div>
            <p className="text-slate-500 leading-relaxed">
              AI-powered Meta Ads intelligence platform. Analyze campaigns, creatives, copy, and audiences with automated optimization tips.
            </p>
          </div>

          <div>
            <div className="font-bold text-slate-200 mb-3">Product</div>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/signup" className="hover:text-white transition">Campaign Analyzer</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">Creative Intelligence</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">AI Recommendations</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">Performance Reports</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-slate-200 mb-3">Resources</div>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
              <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              <li><Link href="/help" className="hover:text-white transition">Help Center</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-slate-200 mb-3">Legal & Security</div>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link href="/security" className="hover:text-white transition">Security Info</Link></li>
              <li><Link href="/meta-integration" className="hover:text-white transition">Meta Integration</Link></li>
              <li><Link href="/data-deletion" className="hover:text-white transition">Data Deletion Instructions</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>© {new Date().getFullYear()} Digital Growth Studio. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Meta Ads™ is a trademark of Meta Platforms, Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
