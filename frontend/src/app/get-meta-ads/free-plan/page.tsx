"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function FreePlanQuestionnairePage() {
  const router = useRouter();
  const { user, loginWithGoogle, isAuthenticated } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [restricted, setRestricted] = useState(false);
  const [restrictedReason, setRestrictedReason] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);

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

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleGenerate = async () => {
    if (!firstName || !lastName || !whatsapp) {
      alert("Please fill in all personal/contact details.");
      return;
    }

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
            <h3 className="text-xl font-bold text-white">Let's get started. What's your business or brand name?</h3>
            <input
              type="text"
              placeholder="e.g. Acme Cosmetics"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition text-lg"
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">What industry is your business in?</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
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
                <label className="block text-sm font-semibold text-slate-300 mb-2">Please specify industry</label>
                <input
                  type="text"
                  placeholder="Your industry details"
                  value={industryOther}
                  onChange={(e) => setIndustryOther(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">What specific product or service do you sell?</label>
              <input
                type="text"
                placeholder="e.g. Organic anti-aging skin serum"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">What is your primary marketing goal?</label>
              <select
                value={campaignObjective}
                onChange={(e) => setCampaignObjective(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
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
              <label className="block text-sm font-semibold text-slate-300 mb-2">Where do customers convert or buy?</label>
              <select
                value={conversionLocation}
                onChange={(e) => setConversionLocation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
              >
                <option value="Website">On My Website / Landing Page</option>
                <option value="WhatsApp">Chat directly on WhatsApp</option>
                <option value="Lead Form">Native Facebook Lead Form</option>
                <option value="Phone Call">Direct Phone Call</option>
                <option value="App">Mobile App Store</option>
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Where is your target location?</label>
              <input
                type="text"
                placeholder="e.g. India, Mumbai, United States"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Describe your ideal customer profile</label>
              <textarea
                placeholder="e.g. Working women aged 25-45 interested in clean beauty and vegan lifestyles."
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 h-24"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">What is your expected daily Meta Ads budget?</label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
              >
                <option value="₹300–₹500/day">₹300–₹500/day</option>
                <option value="₹500–₹1,000/day">₹500–₹1,000/day</option>
                <option value="₹1,000–₹2,500/day">₹1,000–₹2,500/day</option>
                <option value="₹2,500–₹5,000/day">₹2,500–₹5,000/day</option>
                <option value="₹5,000+/day">₹5,000+/day</option>
                <option value="Not sure">Not sure / Help me decide</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">How long do you plan to run the campaign?</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
              >
                <option value="7 Days">7 Days (Short Test)</option>
                <option value="14 Days">14 Days (Standard Test)</option>
                <option value="30 Days">30 Days (Recommended)</option>
                <option value="Ongoing">Ongoing Monthly Optimization</option>
              </select>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Website or Landing Page URL (Optional)</label>
              <input
                type="text"
                placeholder="https://yourwebsite.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">What is your current promotional offer? (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Buy 1 Get 1 Free, 20% off first order"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Ad Creative Availability</label>
              <select
                value={creativeAvailability}
                onChange={(e) => setCreativeAvailability(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
              >
                <option value="I have finished creatives ready">I have finished creatives ready</option>
                <option value="I need static creatives">I need static banner/image creatives</option>
                <option value="I need video creatives">I need video reels/shorts editing</option>
                <option value="I have assets but need them structured">I have product photos but need ad layouts</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Prior Meta Ads Platform Experience</label>
              <select
                value={previousAdsExperience}
                onChange={(e) => setPreviousAdsExperience(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
              >
                <option value="None">None (First time advertiser)</option>
                <option value="Beginner">Beginner (Spent under ₹10,000 total)</option>
                <option value="Intermediate">Intermediate (Manage monthly campaigns)</option>
                <option value="Expert">Expert (Advanced scaling & conversion tracking)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">What is your biggest Meta Ads challenge?</label>
              <input
                type="text"
                placeholder="e.g. High Cost Per Lead, Ad fatigue, mapping Pixel tracking"
                value={mainChallenge}
                onChange={(e) => setMainChallenge(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 7:
        // Login Gate
        if (!isAuthenticated) {
          return (
            <div className="space-y-6 text-center">
              <h3 className="text-2xl font-extrabold text-white">Your Free Campaign Plan Is Ready 🎉</h3>
              <p className="text-slate-400">We've generated your custom targeting parameters and strategic recommendations. Secure your copy by logging in.</p>
              
              <div className="py-8">
                <button
                  onClick={loginWithGoogle}
                  className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 mx-auto"
                >
                  Continue with Google <ArrowRight size={18} />
                </button>
              </div>
              <span className="text-xs text-slate-500 flex items-center justify-center gap-1"><Lock size={12} /> Secure login powered by Firebase Authentication</span>
            </div>
          );
        }

        // Collecting User contact information after login
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Almost there! Complete your profile to download your PDF plan:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">First Name</label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Last Name</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">WhatsApp Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (restricted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800/80 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <AlertTriangle size={48} className="text-red-500 mx-auto" />
          <h2 className="text-2xl font-extrabold text-white">We're unable to provide this service</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{restrictedReason}</p>
          <button
            onClick={() => router.push("/get-meta-ads")}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-6">
      <div className="max-w-xl w-full mx-auto bg-slate-900/50 border border-slate-850 p-8 rounded-3xl shadow-2xl space-y-8 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-850">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Heading */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Free Meta Ads Campaign Plan</span>
          <span className="text-xs font-semibold text-slate-500">Step {currentStep + 1} of {stepsLength}</span>
        </div>

        {/* Content */}
        <div>
          {renderStepContent()}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
          {currentStep > 0 && currentStep < 7 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 7 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 ml-auto"
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl transition flex items-center gap-2 ml-auto"
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
      </div>

      <div className="text-center text-xs text-slate-600 mt-8">
        Digital Growth Studio © {new Date().getFullYear()} • Safe & Secure Onboarding
      </div>
    </div>
  );
}
