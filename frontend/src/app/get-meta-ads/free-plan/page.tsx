"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { event as trackGAEvent } from "@/lib/analytics";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

export default function FreePlanQuestionnairePage() {
  const router = useRouter();
  const { user, loginWithGoogle, isAuthenticated } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [restricted, setRestricted] = useState(false);
  const [restrictedReason, setRestrictedReason] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("Ecommerce");
  const [industryOther, setIndustryOther] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("Leads");
  const [conversionLocation, setConversionLocation] = useState("Website");
  const [targetLocation, setTargetLocation] = useState("India");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [budget, setBudget] = useState("₹500–₹1,000/day");
  const [duration, setDuration] = useState("30 Days");
  const [creativeAvailability, setCreativeAvailability] = useState("I need static creatives");
  const [website, setWebsite] = useState("");
  const [offer, setOffer] = useState("");
  const [previousAdsExperience, setPreviousAdsExperience] = useState("None");
  const [mainChallenge, setMainChallenge] = useState("");

  // Post-auth User info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Check plan and status if logged in
  useEffect(() => {
    async function checkPlanAndStatus() {
      if (isAuthenticated && user) {
        try {
          const profile = await api.getMyProfile();
          if (profile && (profile.intro_offer_used || profile.intro_offer_eligible === false)) {
            setAlreadyJoined(true);
            return;
          }
          const plans = await api.getCampaignPlans();
          if (plans && plans.length > 0) {
            setHasPlan(true);
            setPlanId(plans[0].id || null);
          }
        } catch (e) {
          console.error("Failed to check plan eligibility status:", e);
        }
      }
    }
    checkPlanAndStatus();
  }, [user, isAuthenticated]);

  // Pre-fill user name if logged in
  useEffect(() => {
    if (user && user.email) {
      const parts = user.displayName ? user.displayName.split(" ") : [];
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  }, [user]);

  // Industry restriction check
  const checkRestricted = (ind: string, prod: string, chal: string) => {
    const text = `${ind} ${prod} ${chal}`.toLowerCase();
    const restrictedKeywords = [
      "gambling", "betting", "casino", "weapons", "gun", "ammunition", 
      "sexual", "erotic", "adult toy", "counterfeit", "fake brand", 
      "illegal drug", "recreational drug", "marijuana", "weed", "cocaine",
      "financial scheme", "ponzi", "pyramid scheme"
    ];
    for (const kw of restrictedKeywords) {
      if (text.includes(kw)) {
        setRestricted(true);
        setRestrictedReason(`Our services are not available for categories relating to: ${kw}.`);
        return true;
      }
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep === 0 && !businessName) {
      alert("Please enter your business/brand name.");
      return;
    }
    if (currentStep === 1) {
      if (checkRestricted(industry + " " + industryOther, productOrService, "")) {
        return;
      }
    }
    if (currentStep === 6 && checkRestricted(industry, productOrService, mainChallenge)) {
      return;
    }

    // Track step completion
    trackGAEvent("freeplan_step_next", {
      step: currentStep + 1,
      business_name: businessName,
      industry: industry === "Other" ? industryOther : industry
    });

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      trackGAEvent("freeplan_step_back", {
        step: currentStep + 1
      });
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleGenerate = async () => {
    if (!firstName || !lastName || !whatsapp) {
      alert("Please fill in all personal/contact details.");
      return;
    }

    // Track GA4 generation event
    trackGAEvent("freeplan_generate_click", {
      business_name: businessName,
      industry,
      campaign_objective: campaignObjective
    });

    try {
      setGenerating(true);
      const profile = {
        business_name: businessName,
        industry,
        industry_other: industryOther,
        product_or_service: productOrService,
        campaign_objective: campaignObjective,
        conversion_location: conversionLocation,
        target_location: targetLocation,
        target_customer: targetCustomer,
        budget,
        duration,
        creative_availability: creativeAvailability,
        website,
        offer,
        previous_ads_experience: previousAdsExperience,
        main_challenge: mainChallenge,
      };

      // 1. Generate plan from backend
      const planRes = await api.generateCampaignPlan(profile);

      // 2. Save the plan to user account
      const savePayload = {
        business_name: businessName,
        campaign_profile: profile,
        report_data: planRes,
        readiness_score: planRes.readiness_score || 70,
      };

      const saveRes = await api.saveCampaignPlan(savePayload);

      // 3. Update WhatsApp on backend if needed
      try {
        await api.updateProfile({
          name: `${firstName} ${lastName}`,
          whatsapp_number: whatsapp,
        });
      } catch (e) {
        console.error("Failed to update profile info:", e);
      }

      // Redirect to reports detail page
      router.push(`/dashboard/campaign-plans/${saveRes.plan_id}?download=true`);
    } catch (e: any) {
      alert(e.message || "Failed to generate campaign plan. Please check your inputs.");
    } finally {
      setGenerating(false);
    }
  };

  // Rendering Steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Let's get started. What's your business or brand name?</h3>
            <input
              type="text"
              id="input-freeplan-business-name"
              placeholder="e.g. Acme Cosmetics"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 transition text-lg"
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What industry is your business in?</label>
              <select
                id="select-freeplan-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Ecommerce">Ecommerce</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
                <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Food & Restaurants">Food & Restaurants</option>
                <option value="Travel & Hospitality">Travel & Hospitality</option>
                <option value="Finance">Finance</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Technology">Technology</option>
                <option value="Local Business">Local Business</option>
                <option value="Fitness & Wellness">Fitness & Wellness</option>
                <option value="Automotive">Automotive</option>
                <option value="B2B">B2B</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {industry === "Other" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Please specify industry</label>
                <input
                  type="text"
                  id="input-freeplan-industry-other"
                  placeholder="Your industry details"
                  value={industryOther}
                  onChange={(e) => setIndustryOther(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What specific product or service do you sell?</label>
              <input
                type="text"
                id="input-freeplan-product-service"
                placeholder="e.g. Organic anti-aging skin serum"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What is your primary marketing goal?</label>
              <select
                id="select-freeplan-campaign-objective"
                value={campaignObjective}
                onChange={(e) => setCampaignObjective(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Leads">Generate Leads / Signups</option>
                <option value="WhatsApp Enquiries">WhatsApp Enquiries</option>
                <option value="Website Sales">Website Sales</option>
                <option value="Calls">Inbound Phone Calls</option>
                <option value="Website Traffic">Increase Website Traffic</option>
                <option value="Brand Awareness">Brand Awareness</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Where do customers convert or buy?</label>
              <select
                id="select-freeplan-conversion-location"
                value={conversionLocation}
                onChange={(e) => setConversionLocation(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Website">My website / landing page</option>
                <option value="WhatsApp">Directly on WhatsApp</option>
                <option value="Facebook/Instagram DM">Meta Messenger / Instagram DMs</option>
                <option value="On-platform lead form">Facebook native lead generation forms</option>
                <option value="Phone Call">Direct phone call</option>
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Where is your target audience located?</label>
              <input
                type="text"
                id="input-freeplan-target-location"
                placeholder="e.g. India, USA, or Maharashtra/Mumbai"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Describe your ideal customer (optional)</label>
              <textarea
                id="textarea-freeplan-target-customer"
                placeholder="e.g. Women aged 25-45 interested in organic wellness and skincare"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 h-24 resize-none"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What is your planned daily/monthly budget?</label>
              <select
                id="select-freeplan-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="₹300–₹500/day">₹300 – ₹500 / day</option>
                <option value="₹500–₹1,000/day">₹500 – ₹1,000 / day</option>
                <option value="₹1,000–₹3,000/day">₹1,000 – ₹3,000 / day</option>
                <option value="₹3,000–₹10,000/day">₹3,000 – ₹10,000 / day</option>
                <option value="₹10,000+/day">₹10,000+ / day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">How long do you plan to run the campaign?</label>
              <select
                id="select-freeplan-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="7 Days">7 Days (Testing Phase)</option>
                <option value="14 Days">14 Days</option>
                <option value="30 Days">30 Days (Recommended)</option>
                <option value="Ongoing">Ongoing / Continuous</option>
              </select>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What is your website or landing page URL? (optional)</label>
              <input
                type="url"
                id="input-freeplan-website"
                placeholder="e.g. https://mybusiness.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What is the main offer, discount, or deal?</label>
              <input
                type="text"
                id="input-freeplan-offer"
                placeholder="e.g. Get 20% off your first order + free shipping"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What is your experience running Meta Ads?</label>
              <select
                id="select-freeplan-previous-ads-experience"
                value={previousAdsExperience}
                onChange={(e) => setPreviousAdsExperience(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="None">None (Total Beginner)</option>
                <option value="Basic">Basic (Boosted posts, tried a few ads)</option>
                <option value="Intermediate">Intermediate (Managed account in Ads Manager, set up pixels)</option>
                <option value="Advanced">Advanced (Managed high budget campaigns, scaling custom audiences)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What is your main challenge with Meta Ads?</label>
              <textarea
                id="textarea-freeplan-main-challenge"
                placeholder="e.g. Getting clicks but no conversions, high CPA, not sure how to structure my campaigns..."
                value={mainChallenge}
                onChange={(e) => setMainChallenge(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 h-24 resize-none"
              />
            </div>
          </div>
        );
      case 7:
        // Login Gate
        if (!isAuthenticated) {
          return (
            <div className="space-y-6 text-center">
              <h3 className="text-2xl font-extrabold text-slate-900">Your Free Campaign Plan Is Ready 🎉</h3>
              <p className="text-slate-500">We've generated your custom targeting parameters and strategic recommendations. Secure your copy by logging in.</p>
              
              <div className="py-8">
                <button
                  id="btn-freeplan-login-google"
                  onClick={loginWithGoogle}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 mx-auto"
                >
                  Continue with Google <ArrowRight size={18} />
                </button>
              </div>
              <span className="text-xs text-slate-400 flex items-center justify-center gap-1"><Lock size={12} /> Secure login powered by Firebase Authentication</span>
            </div>
          );
        }

        // Collecting User contact information after login
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Almost there! Complete your profile to download your PDF plan:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                <input
                  type="text"
                  id="input-freeplan-first-name"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                <input
                  type="text"
                  id="input-freeplan-last-name"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">WhatsApp Number</label>
              <input
                type="text"
                id="input-freeplan-whatsapp"
                placeholder="e.g. +91 9876543210"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (alreadyJoined) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Welcome Back!</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You are already an active client of Digital Growth Studio! Let's get your ads running—start with our introductory <strong>Meta Ads ₹333 Plan</strong> or access your dashboard.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/get-ads")}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition"
            >
              Get Meta Ads at ₹333 🚀
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 transition"
            >
              Access Client Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasPlan) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Welcome Back!</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You have already generated your free Meta Ads Campaign Plan! Let's bring your plan to life—launch your first high-converting campaign with our introductory <strong>Meta Ads ₹333 Plan</strong> today.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/get-ads")}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition"
            >
              Get Meta Ads at ₹333 🚀
            </button>
            <button
              onClick={() => router.push(planId ? `/dashboard/campaign-plans/${planId}` : "/dashboard/campaign-plans")}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 transition"
            >
              View My Campaign Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (restricted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-xl">
          <AlertTriangle size={48} className="text-red-500 mx-auto animate-bounce" />
          <h2 className="text-2xl font-extrabold text-slate-900">We're unable to provide this service</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{restrictedReason}</p>
          <button
            onClick={() => router.push("/get-meta-ads")}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 transition"
          >
            Back to Landing Page
          </button>
        </div>
      </div>
    );
  }

  const stepsLength = 8;
  const progressPercent = Math.round((currentStep / (stepsLength - 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-12 px-6">
      {/* Mini Brand Logo Header */}
      <div className="max-w-xl w-full mx-auto mb-6 flex items-center justify-between">
        <Link href="/get-meta-ads" className="flex items-center gap-2 group">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
          <span className="font-extrabold text-sm text-slate-900 leading-none">Digital Growth Studio</span>
        </Link>
        <Link href="/get-meta-ads" className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition">
          Exit Questionnaire <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="max-w-xl w-full mx-auto bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xl space-y-8 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Heading */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Free Campaign Plan</span>
          <span className="text-xs font-semibold text-slate-400">Step {currentStep + 1} of {stepsLength}</span>
        </div>

        {/* Content */}
        <div className="min-h-[220px] flex flex-col justify-center">
          {renderStepContent()}
        </div>

        {/* Buttons */}
        {(currentStep < 7 || isAuthenticated) && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {currentStep > 0 && currentStep < 7 ? (
              <button
                id="btn-freeplan-back"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 7 ? (
              <button
                id="btn-freeplan-continue"
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition flex items-center gap-1.5 ml-auto"
                style={{
                  background: "linear-gradient(to right, #2563eb, #1d4ed8)",
                }}
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                id="btn-freeplan-generate"
                onClick={handleGenerate}
                disabled={generating}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition flex items-center gap-2 ml-auto"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Generating Plan...
                  </>
                ) : (
                  <>
                    Generate My Campaign Plan <Sparkles size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 mt-8">
        Digital Growth Studio © {new Date().getFullYear()} • Safe & Secure Onboarding
      </div>
    </div>
  );
}
