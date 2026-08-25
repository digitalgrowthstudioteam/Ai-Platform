"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { event as trackGAEvent } from "@/lib/analytics";
import {
  Sparkles,
  ArrowRight,
  Zap,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Globe,
  Star,
  Users,
  Percent,
  TrendingUp,
  Sliders,
  DollarSign,
  Palette,
  MessageCircle,
  Menu,
  X,
  ArrowUpRight,
  Target,
  BarChart3,
  FileText,
  Megaphone,
} from "lucide-react";

export default function MetaAdsLandingPage() {
  const router = useRouter();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const steps = [
    { number: 1, title: "Tell Us About Your Business", desc: "Briefly fill out our campaign questionnaire.", icon: FileText },
    { number: 2, title: "Connect Your Meta Ad Account", desc: "Securely link your account via secure OAuth.", icon: Globe },
    { number: 3, title: "Give Required Partner Access", desc: "Provide manager permissions safely without sharing passwords.", icon: ShieldCheck },
    { number: 4, title: "Our Team Sets Up Your Campaign", desc: "We build creatives, headlines, copy, and set up your tracking.", icon: Palette },
    { number: 5, title: "Your Ads Run From Your Account", desc: "Your budget goes directly to Meta. You retain full ownership.", icon: Megaphone },
  ];

  const faqs = [
    {
      q: "Is ₹333 the price for every ad?",
      a: "No. ₹333 is the limited-time introductory price for the first eligible ad. Additional ads use the applicable volume quantity pricing."
    },
    {
      q: "Is the Meta advertising budget included?",
      a: "No. Your advertising budget is paid separately to Meta. Ads are charged directly to your configured Meta payment method."
    },
    {
      q: "Do I need a Meta Ad Account?",
      a: "If you already have one, you can connect it. If you don't, Digital Growth Studio can help set it up for a ₹2,999 one-time service fee."
    },
    {
      q: "Will you run ads from your own account?",
      a: "No. Ads are run directly from the customer's own Meta Ad Account so you own all pixel data, custom audiences, and campaign history."
    },
    {
      q: "What access do you need?",
      a: "We request the required Partner Access to manage the advertising account. We never ask for your personal Facebook password."
    },
    {
      q: "Is the ₹333 offer available forever?",
      a: "No. It is a limited-time introductory offer and can be disabled or expired by Digital Growth Studio at any time."
    },
    {
      q: "Are purchased ads refundable?",
      a: "No. Purchased ads are non-refundable and expire automatically after their stated validity period."
    },
    {
      q: "What happens to unused ads?",
      a: "Unused ads expire after the stated validity period and cannot be carried forward, transferred, or exchanged."
    },
    {
      q: "Do I need a subscription?",
      a: "Yes. Meta Ads management requires an active Starter Plan subscription on Digital Growth Studio."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden antialiased">
      {/* 1. ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-sm">
        <span className="inline-flex items-center gap-1.5 bg-white/20 text-white px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
          🔥 Limited Offer
        </span>
        <span className="text-blue-50 font-medium">
          First Meta Ad setup at just <span className="font-bold text-white">₹333</span>.
        </span>
        <Link
          href="/get-ads"
          className="ml-1 underline underline-offset-4 decoration-blue-200/60 hover:decoration-white font-bold transition flex items-center gap-1 group"
        >
          Get Started <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
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
                Meta Ads Service
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-950 transition">How It Works</a>

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
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Free Campaign Planner</div>
                    <div className="text-[11px] text-slate-500 font-normal">Design campaign outlines for free</div>
                  </div>
                </Link>
              </div>
            </div>

            <a href="#pricing" className="hover:text-slate-950 transition">Pricing</a>
            <a href="#faq" className="hover:text-slate-950 transition">FAQ</a>
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
              href="/get-ads"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 active:scale-95"
            >
              Get Ads at ₹333 <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl border-l border-slate-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover shadow-xs" />
                  <span className="font-extrabold text-sm text-slate-900">Digital Growth Studio</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-slate-500 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3 font-semibold text-slate-700 text-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation</div>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">How It Works</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">Pricing</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600">FAQ</a>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-4">Services</div>
                <Link href="/get-meta-ads" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" /> Get Meta Ads at ₹333
                </Link>
                <Link href="/get-meta-ads/free-plan" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 flex items-center gap-1.5">
                  Free Campaign Planner
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
                href="/get-ads"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
              >
                Get Ads at ₹333
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. HERO SECTION */}
      <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto text-center z-10 overflow-hidden">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-400/15 via-indigo-300/15 to-purple-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Feature Chip Pill */}
        <div className="inline-flex items-center gap-2 bg-blue-50/90 border border-blue-200/70 rounded-full px-4 py-1.5 mb-6 text-xs font-bold text-blue-700 shadow-xs">
          <Zap size={14} className="text-blue-600 animate-pulse" />
          <span>Professional Meta Ads Service • From Your Own Account</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 max-w-5xl mx-auto leading-[1.12]">
          Get Your First <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">Meta Ad</span> at ₹333 🚀
        </h1>

        {/* Subtitle Copy */}
        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          Launch your first Meta Ad with our limited-time introductory offer. Our team will help you set up, launch and manage your ads directly from your own Meta Ad Account.
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          <Link
            href="/get-ads"
            id="btn-get-campaign-333-hero"
            onClick={() => trackGAEvent("cta_click_get_campaign_333_hero")}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 group"
          >
            Get a Campaign at ₹333 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/get-meta-ads/free-plan"
            id="btn-get-free-campaign-plan-hero"
            onClick={() => trackGAEvent("cta_click_free_campaign_plan_hero")}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-center gap-2"
          >
            Get a Free Campaign Plan →
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-600" /> First ad only ₹333</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-600" /> Starter Plan required</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-600" /> 7-day free trial</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-600" /> Ad budget separate</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-600" /> WhatsApp onboarding support</span>
        </div>
      </section>

      {/* 4. FREE CAMPAIGN PLAN PROMO SECTION */}
      <section className="py-20 border-t border-slate-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Not sure how to run your Meta Ads?
            </h2>
            <p className="mt-4 text-slate-500">
              Get a personalized campaign strategy report built for your business in 5 minutes.
            </p>
          </div>

          <div className="mt-12 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white border border-blue-200/60 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-300/20 rounded-full blur-2xl"></div>
            
            <div className="max-w-xl relative z-10">
              <h3 className="text-2xl font-bold text-slate-900">🎁 Get Your Free Meta Ads Campaign Plan</h3>
              <p className="mt-4 text-slate-600 leading-relaxed text-sm sm:text-base">
                Answer a few questions about your business, budget and goals. We'll create a personalized campaign plan showing how you can structure your Meta Ads, what audience to target, how much to budget and what creatives to test.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-500">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> No Meta Ad Account connection required</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> No payments required</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> Personalized campaign outline in PDF format</li>
              </ul>
            </div>

            <div className="relative z-10">
              <Link
                href="/get-meta-ads/free-plan"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition inline-flex items-center gap-2 group whitespace-nowrap"
              >
                Get My Free Campaign Plan <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-200/50 rounded-full px-3.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-4">
              Simple Process
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              How Our Meta Ads Service Works
            </h2>
            <p className="mt-4 text-slate-500">
              A simple, secure approach to professional campaign execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200/80 p-6 rounded-2xl relative group hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Icon size={20} />
                  </div>
                  <div className="absolute top-4 right-4 text-[10px] font-extrabold text-slate-300 group-hover:text-blue-400 transition">
                    0{step.number}
                  </div>
                  <h4 className="mt-4 font-bold text-slate-900 text-base leading-tight">{step.title}</h4>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-5 bg-blue-50 border border-blue-200/60 rounded-2xl text-center max-w-3xl mx-auto">
            <p className="text-sm text-blue-800">
              💡 <b>Important:</b> Your ads are run directly from your own Meta Ad Account. We do not run your advertising campaigns from our own account, ensuring you own all parameters and results.
            </p>
          </div>
        </div>
      </section>

      {/* 6. ONBOARDING DISCLOSURES */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-950">What happens after you submit?</h2>
          
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl hover:shadow-md transition group">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                  <MessageCircle size={18} />
                </div>
                1. WhatsApp Confirmation
              </h4>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Once you complete the form, our team will review your campaign details and connect with you on WhatsApp to align on targets and copy variations.
              </p>
            </div>
            
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl hover:shadow-md transition group">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                  <ShieldCheck size={18} />
                </div>
                2. Partner Access Request
              </h4>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                We will request required Partner Access to your Meta Business Suite. You remain the absolute owner of your account and assets.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl hover:shadow-md transition group">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                  <Zap size={18} />
                </div>
                3. Campaign Buildout
              </h4>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Our specialists will configure the ad sets, target location parameters, interest filters, upload creatives, and map pixel event tracking.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl hover:shadow-md transition group">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                  <DollarSign size={18} />
                </div>
                4. Direct Meta Billing
              </h4>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Your advertising budget is charged directly to your card by Meta. Our introductory service fee is only ₹333 for setup and monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-200/50 rounded-full px-3.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-4">
              Transparent Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Simple & Transparent Pricing
            </h2>
            <p className="mt-4 text-slate-500">
              Introductory pricing to get you started, plus flexible quantity options as you scale.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Promo Card */}
            <div className="bg-white border-2 border-blue-500 p-8 rounded-3xl relative flex flex-col justify-between shadow-xl shadow-blue-500/10">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-md">
                🔥 Promo Offer
              </div>
              <div>
                <h4 className="text-lg font-bold text-blue-700">First Ad Run</h4>
                <p className="mt-2 text-xs text-slate-500">Limited-time introductory price for new users.</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-sm line-through text-slate-400">₹1,499</span>
                  <span className="text-4xl font-extrabold text-slate-950">₹333</span>
                </div>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">Save ₹1,166</span>

                <ul className="mt-8 space-y-3.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> First eligible ad setup</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> Target mapping configuration</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> Pixel event tracking link</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> Starter Plan subscription required</li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/get-ads"
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition text-center block text-sm shadow-md shadow-blue-500/20 hover:shadow-lg active:scale-[0.98]"
                >
                  Get Started for ₹333
                </Link>
                <span className="text-[10px] text-slate-400 mt-2 text-center block">Available for the first eligible ad only.</span>
              </div>
            </div>

            {/* Account Setup Card */}
            <div className="bg-white border border-slate-200 p-8 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Don't Have a Meta Ad Account?</h4>
                <p className="mt-2 text-xs text-slate-500">We set up everything from scratch for you.</p>
                
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-sm line-through text-slate-400">₹4,999</span>
                  <span className="text-3xl font-extrabold text-slate-950">₹2,999</span>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold">One-Time Setup Service</span>

                <ul className="mt-8 space-y-3.5 text-sm text-slate-500">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> Meta Business Suite creation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> Meta Ad Account provisioning</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> Pixel and domain verification</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> Payment gateway linking guidance</li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/get-ads?setup=true"
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 text-center block text-sm transition"
                >
                  Get Setup Service
                </Link>
                <span className="text-[10px] text-slate-400 mt-2 text-center block">One-time service fee. Separate from ad budgets.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-200/50 rounded-full px-3.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-4">
              Got Questions?
            </div>
            <h2 className="text-3xl font-extrabold text-slate-950">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex justify-between items-center text-left px-6 py-4 font-semibold text-slate-900 hover:text-blue-700 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform flex-shrink-0 ml-4 ${activeFaq === idx ? "rotate-180 text-blue-600" : ""}`}
                  />
                </button>
                {activeFaq === idx && (
                  <p className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM CTA */}
      <section className="relative py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHYtNHptMC0xMGg0djRoLTR2LTR6bTEwIDBoNHY0aC00di00em0wIDEwaDR2NGgtNHYtNHptLTIwIDBWMzRoNHY0aC00em0wLTEwaDR2NGgtNHYtNHptLTEwIDBoNHY0aC00di00em0wIDEwaDR2NGgtNHYtNHptMzAtMjBWNGg0djRoLTR6bTAgMTBoNHY0aC00di00em0tMTAtMTBWNGg0djRoLTR6bTAgMTBoNHY0aC00di00em0tMTAtMTBWNGg0djRoLTR6bTAgMTBoNHY0aC00di00em0tMTAtMTBWNGg0djRoLTR6bTAgMTBoNHY0aC00di00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Ready to Start Your Meta Ads?</h2>
          <p className="mt-4 text-blue-100 text-sm sm:text-base max-w-xl mx-auto font-normal">Start with your first ad for ₹333, or draft a campaign plan for free.</p>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              href="/get-ads"
              id="btn-get-campaign-333-bottom"
              onClick={() => trackGAEvent("cta_click_get_campaign_333_bottom")}
              className="w-full sm:w-auto inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm px-9 py-4 rounded-xl transition shadow-2xl hover:scale-105 active:scale-95"
            >
              Get a Campaign at ₹333 <ArrowRight size={16} />
            </Link>
            <Link
              href="/get-meta-ads/free-plan"
              id="btn-get-free-campaign-plan-bottom"
              onClick={() => trackGAEvent("cta_click_free_campaign_plan_bottom")}
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold rounded-xl border border-white/20 transition text-sm text-center"
            >
              Get My Free Campaign Plan →
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
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
              Professional Meta Ads management service. We set up, launch and manage your campaigns directly from your own Meta Ad Account.
            </p>
          </div>

          <div>
            <div className="font-bold text-slate-200 mb-3">Services</div>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/get-ads" className="hover:text-white transition">Get Ads at ₹333</Link></li>
              <li><Link href="/get-meta-ads/free-plan" className="hover:text-white transition">Free Campaign Plan</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">Campaign Analyzer</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">AI Recommendations</Link></li>
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
