"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Award,
  Zap,
  Sliders,
  AlertTriangle,
  Building,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Megaphone,
  Palette,
  Layout,
  PlusCircle,
  Coins,
  Check,
  CheckSquare,
  Lock,
  MessageCircle,
  Loader2,
} from "lucide-react";

interface ServicePricing {
  services_pricing: {
    first_ad_offer: {
      service_name: string;
      regular_price: number;
      offer_price: number;
      currency: string;
      validity_days: number;
      active: boolean;
    };
    account_setup_service: {
      service_name: string;
      regular_price: number;
      offer_price: number;
      currency: string;
      active: boolean;
    };
    creative_design_service: {
      service_name: string;
      regular_price: number;
      offer_price: number;
      currency: string;
      active: boolean;
    };
  };
  ad_packs: Array<{
    id: string;
    pack_name: string;
    ad_quantity: number;
    price_per_ad: number;
    total_price: number;
    validity_days: number;
    regular_price: number;
    offer_price: number;
    active: boolean;
  }>;
  additional_services: Array<{
    id: string;
    name: string;
    regular_price: number;
    offer_price: number;
    instant: boolean;
    active: boolean;
  }>;
}

const STEPS = [
  "How It Works",
  "Business Details",
  "Industry",
  "Meta Account",
  "Campaign Details",
  "Number of Ads",
  "Creatives & Additional Services",
  "Quotation & Starter Trial",
];

const INDUSTRIES = [
  "Ecommerce",
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Healthcare",
  "Education",
  "Real Estate",
  "Food & Restaurants",
  "Travel & Hospitality",
  "Finance",
  "Professional Services",
  "Technology",
  "Local Business",
  "Fitness & Wellness",
  "Automotive",
  "B2B",
  "Other",
];

const BUSINESS_DESCRIPTIONS = [
  "Local retail shop or service provider serving our local community.",
  "E-commerce brand selling products online with nationwide/global delivery.",
  "Professional service agency, consultancy, or B2B firm.",
  "Educational center, coaching institute, or online training provider.",
  "Healthcare clinic, wellness center, or medical service provider.",
  "Real estate agency, property builder, or brokerage firm.",
  "Restaurant, cafe, food brand, or hospitality service provider.",
  "Other business model / custom operation",
];

const PRODUCT_OPTIONS_BY_INDUSTRY: Record<string, string[]> = {
  "Ecommerce": [
    "Electronics & Gadgets",
    "Home & Kitchen Appliances",
    "Gifts & Novelties",
    "Books & Stationery",
    "Other E-commerce Products",
  ],
  "Fashion & Apparel": [
    "Clothing & Garments",
    "Shoes & Footwear",
    "Jewelry & Accessories",
    "Bags & Purses",
    "Other Fashion Items",
  ],
  "Beauty & Personal Care": [
    "Skincare Products",
    "Haircare Products",
    "Cosmetics & Makeup",
    "Organic & Herbal Wellness",
    "Other Beauty Products",
  ],
  "Healthcare": [
    "Clinics & Consultation",
    "Medical Equipment",
    "Pharmacy & Medicines",
    "Wellness & Therapy Services",
    "Other Healthcare Services",
  ],
  "Education": [
    "Online Courses & e-Learning",
    "Coaching & Tuition Classes",
    "Schools & Colleges Admissions",
    "Professional Certifications",
    "Other Educational Services",
  ],
  "Real Estate": [
    "Residential Properties (Buy/Sell)",
    "Commercial Properties",
    "Rental & Leasing Services",
    "Property Management",
    "Other Real Estate Services",
  ],
  "Food & Restaurants": [
    "Restaurant Dine-in & Delivery",
    "Cafes & Bakeries",
    "Catering Services",
    "Packaged Food & Snacks",
    "Other Food Services",
  ],
  "Travel & Hospitality": [
    "Hotel & Resorts Booking",
    "Tour Packages & Tour Guides",
    "Car Rental & Transport Services",
    "Homestays & Villas",
    "Other Travel Services",
  ],
  "Finance": [
    "Insurance Policies",
    "Tax & Accounting Services",
    "Investment Planning & Advisory",
    "Loans & Mortgages",
    "Other Financial Services",
  ],
  "Professional Services": [
    "Legal & Compliance Consulting",
    "Marketing, SEO & Design Agencies",
    "HR Consulting & Recruitment",
    "Management & Business Consulting",
    "Other Professional Services",
  ],
  "Technology": [
    "SaaS / Software Products",
    "IT Support & Managed Services",
    "Web & App Development",
    "Cybersecurity Solutions",
    "Other Tech Products/Services",
  ],
  "Local Business": [
    "Salon, Spa & Hair Styling",
    "Gym & Fitness Center Memberships",
    "Home Cleaning, Plumbing & Repairs",
    "Local Retail Shop Promotion",
    "Other Local Shop Services",
  ],
  "Fitness & Wellness": [
    "Gym Memberships",
    "Personal Training Programs",
    "Yoga & Meditation Classes",
    "Diet & Nutrition Counseling",
    "Other Fitness/Wellness Programs",
  ],
  "Automotive": [
    "Car Sales & Dealerships",
    "Auto Repair, Detailing & Servicing",
    "Spare Parts & Accessories",
    "Car Rental & Leasing",
    "Other Automotive Services",
  ],
  "B2B": [
    "Wholesale Supplies & Distribution",
    "Corporate Gifting Solutions",
    "B2B Software & Platforms",
    "Manufacturing & Raw Materials",
    "Other B2B Services",
  ],
  "Other": [
    "General Products Sales",
    "General Services Promotion",
    "Event Promotion",
    "Community & Non-profit Advocacy",
    "Other Custom Product/Service",
  ],
};

export default function GetAdsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const { user, loginWithGoogle, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ServicePricing | null>(null);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [eligibleState, setEligibleState] = useState<any>({ eligible: true, reason: null });

  // Connected accounts details from backend Meta OAuth (if any)
  const [connectedMetaAccount, setConnectedMetaAccount] = useState<any>(null);
  const [metaAdAccounts, setMetaAdAccounts] = useState<any[]>([]);

  // Wizard state variables
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("Ecommerce");
  const [industryOther, setIndustryOther] = useState("");
  const [description, setDescription] = useState(BUSINESS_DESCRIPTIONS[0]);
  const [descriptionOther, setDescriptionOther] = useState("");
  const [advertisedProduct, setAdvertisedProduct] = useState("");
  const [advertisedProductOther, setAdvertisedProductOther] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("Generate Leads");
  const [expectedBudget, setExpectedBudget] = useState("₹500–₹1,000/day");

  // Auto-update advertised product option when industry changes
  useEffect(() => {
    const options = PRODUCT_OPTIONS_BY_INDUSTRY[industry] || PRODUCT_OPTIONS_BY_INDUSTRY["Other"];
    if (options && options.length > 0) {
      if (!options.includes(advertisedProduct) && advertisedProduct !== "Other Custom Product/Service") {
        setAdvertisedProduct(options[0]);
      }
    }
  }, [industry]);
  
  const [adQuantity, setAdQuantity] = useState(1);
  const [creativeRequired, setCreativeRequired] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  
  const [metaAccountExists, setMetaAccountExists] = useState(true);
  const [selectedMetaAdAccountId, setSelectedMetaAdAccountId] = useState("");

  const getAdPricingDetails = (qty: number) => {
    const servicesPricing = config?.services_pricing;
    const firstAdOffer = servicesPricing?.first_ad_offer;

    let unitPrice = 999;
    let validity = 30;
    let matchedPackId = "";

    // 1. If qty is 1 and intro offer is active & eligible
    if (qty === 1 && eligibleState?.intro_offer_eligible && firstAdOffer?.active) {
      unitPrice = firstAdOffer.offer_price || 333;
      validity = firstAdOffer.validity_days || 30;
      return {
        unitPrice,
        totalPrice: unitPrice,
        validity,
        matchedPackId: "first_ad_offer",
      };
    }

    // 2. Lookup standard dynamic packs
    const packs = config?.ad_packs || [];
    const sortedPacks = [...packs].sort((a: any, b: any) => a.ad_quantity - b.ad_quantity);
    const matchedPack = sortedPacks.find((p: any) => p.active && qty <= p.ad_quantity);

    if (matchedPack) {
      unitPrice = matchedPack.price_per_ad || matchedPack.offer_price || 999;
      validity = matchedPack.validity_days || 30;
      matchedPackId = matchedPack.id;
    } else {
      const highestPack = sortedPacks.filter((p: any) => p.active).pop();
      if (highestPack) {
        unitPrice = highestPack.price_per_ad || highestPack.offer_price || 999;
        validity = highestPack.validity_days || 90;
        matchedPackId = highestPack.id;
      } else {
        unitPrice = 999;
        validity = 30;
        matchedPackId = "pack_1";
      }
    }

    return {
      unitPrice,
      totalPrice: unitPrice * qty,
      validity,
      matchedPackId,
    };
  };

  const { unitPrice: adPerUnitPrice, totalPrice: adTotalOfferPrice, validity: adValidityDays, matchedPackId } = getAdPricingDetails(adQuantity);

  const [notification, setNotification] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load initial configs & latest requests
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load Pricing Config
        const cfg = await api.getAdsServiceConfig();
        setConfig(cfg);

        // Load connected meta account from backend
        try {
          const accounts = await api.getMetaAccounts();
          if (accounts && accounts.length > 0) {
            setMetaAdAccounts(accounts);
            // Default to first account
            setConnectedMetaAccount(accounts[0]);
            setSelectedMetaAdAccountId(accounts[0].id);
            setMetaAccountExists(true);
          } else {
            setMetaAccountExists(false);
          }
        } catch (e) {
          setMetaAccountExists(false);
        }

        // Load latest requests
        if (isAuthenticated) {
          const latest = await api.getLatestAdsServiceRequest();
          setEligibleState(latest.user_eligibility || { eligible: true });
          
          if (latest.request) {
            if (!isNew && latest.request.status !== "draft") {
              router.push("/dashboard/services");
              return;
            }
            if (isNew && latest.request.status !== "draft") {
              setCurrentStep(5);
            }
            setActiveRequest(latest.request);
            setQuotation(latest.quotation);

            // Populate form if draft/submitted
            setFullName(latest.request.full_name || "");
            setBusinessName(latest.request.business_name || "");
            setEmail(latest.request.email || "");
            setWhatsapp(latest.request.whatsapp_number || "");
            setWebsite(latest.request.website || "");
            setLocation(latest.request.business_location || "");
            setIndustry(latest.request.industry || "Ecommerce");
            setIndustryOther(latest.request.industry_other || "");

            // For Description MCQ mapping
            const reqDesc = latest.request.business_description || "";
            if (BUSINESS_DESCRIPTIONS.includes(reqDesc)) {
              setDescription(reqDesc);
              setDescriptionOther("");
            } else if (reqDesc) {
              setDescription("Other business model / custom operation");
              setDescriptionOther(reqDesc);
            } else {
              setDescription(BUSINESS_DESCRIPTIONS[0]);
              setDescriptionOther("");
            }

            // For Advertised Product MCQ mapping
            const reqProd = latest.request.advertised_product || "";
            const indOptions = PRODUCT_OPTIONS_BY_INDUSTRY[latest.request.industry || "Ecommerce"] || PRODUCT_OPTIONS_BY_INDUSTRY["Other"];
            if (indOptions.includes(reqProd)) {
              setAdvertisedProduct(reqProd);
              setAdvertisedProductOther("");
            } else if (reqProd) {
              setAdvertisedProduct("Other Custom Product/Service");
              setAdvertisedProductOther(reqProd);
            } else {
              setAdvertisedProduct(indOptions[0] || "");
              setAdvertisedProductOther("");
            }

            setCampaignObjective(latest.request.campaign_objective || "Generate Leads");
            setExpectedBudget(latest.request.daily_budget || "₹500–₹1,000/day");
            setAdQuantity(latest.request.number_of_ads || 1);
            setCreativeRequired(latest.request.creative_required || false);
            setSelectedServices(latest.request.additional_services || []);
            setMetaAccountExists(latest.request.meta_account_exists);
            setSelectedMetaAdAccountId(latest.request.meta_ad_account_id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAuthenticated]);

  // Load Razorpay Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleNextStep = async () => {
    // Basic step validation
    if (currentStep === 1) {
      if (!fullName || !businessName || !email || !whatsapp || !location) {
        setNotification({ type: "warning", message: "Please fill in all required fields." });
        return;
      }
      // Simple whatsapp verification
      const digits = whatsapp.replace(/\D/g, "");
      if (digits.length < 10) {
        setNotification({ type: "warning", message: "Please enter a valid WhatsApp phone number." });
        return;
      }
    }

    if (currentStep === 2) {
      const actualDescription = description === "Other business model / custom operation"
        ? descriptionOther
        : description;
      
      const actualAdvertisedProduct = advertisedProduct === "Other Custom Product/Service"
        ? advertisedProductOther
        : advertisedProduct;

      if (industry === "Other" && !industryOther) {
        setNotification({ type: "warning", message: "Please specify your industry description." });
        return;
      }
      if (!actualAdvertisedProduct) {
        setNotification({ type: "warning", message: "Please describe what product/service you want to advertise." });
        return;
      }

      // Check restricted eligibility instantly
      try {
        setSubmitting(true);
        const checkPayload = {
          full_name: fullName,
          business_name: businessName,
          email,
          whatsapp_number: whatsapp,
          website,
          business_location: location,
          industry,
          industry_other: industryOther,
          business_description: actualDescription,
          advertised_product: actualAdvertisedProduct,
          campaign_objective: campaignObjective,
          daily_budget: expectedBudget,
          number_of_ads: adQuantity,
          creative_required: creativeRequired,
          additional_services: selectedServices,
          meta_account_exists: metaAccountExists,
          meta_ad_account_id: selectedMetaAdAccountId,
        };

        const res = await api.submitAdsServiceRequest(checkPayload);
        if (res.status === "restricted") {
          setEligibleState({ eligible: false, reason: "Restricted category detected." });
          return;
        }
      } catch (err: any) {
        setNotification({ type: "error", message: err.message || "Failed to check eligibility." });
        setEligibleState({ eligible: false, reason: err.message });
        return;
      } finally {
        setSubmitting(false);
      }
    }

    if (currentStep === 3) {
      if (!metaAccountExists && !setupConfirmed) {
        setNotification({ type: "warning", message: "Please confirm understanding of the setup service charge." });
        return;
      }
    }

    if (currentStep === 6) {
      try {
        setSubmitting(true);
        const actualDescription = description === "Other business model / custom operation"
          ? descriptionOther
          : description;
        
        const actualAdvertisedProduct = advertisedProduct === "Other Custom Product/Service"
          ? advertisedProductOther
          : advertisedProduct;

        const payload = {
          full_name: fullName,
          business_name: businessName,
          email,
          whatsapp_number: whatsapp,
          website,
          business_location: location,
          industry,
          industry_other: industryOther,
          business_description: actualDescription,
          advertised_product: actualAdvertisedProduct,
          campaign_objective: campaignObjective,
          daily_budget: expectedBudget,
          number_of_ads: adQuantity,
          creative_required: creativeRequired,
          additional_services: selectedServices,
          meta_account_exists: metaAccountExists,
          meta_ad_account_id: selectedMetaAdAccountId,
        };

        await api.submitAdsServiceRequest(payload);
        
        // Reload quote
        const latest = await api.getLatestAdsServiceRequest();
        setActiveRequest(latest.request);
        setQuotation(latest.quotation);
      } catch (err: any) {
        setNotification({ type: "error", message: err.message || "Failed to update quotation." });
        return;
      } finally {
        setSubmitting(false);
      }
    }

    if (currentStep === STEPS.length - 1) {
      // Last step -> Quote and Payment
      return;
    }

    setCurrentStep(currentStep + 1);
    setNotification(null);
  };

  const handlePrevStep = () => {
    const isRestrictedBack = isNew && activeRequest && activeRequest.status !== "draft" && currentStep <= 5;
    if (currentStep > 0 && !isRestrictedBack) {
      setCurrentStep(currentStep - 1);
      setNotification(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!isAuthenticated) {
      setNotification({ type: "warning", message: "Please authenticate with Google to register your request." });
      return;
    }

    const actualDescription = description === "Other business model / custom operation"
      ? descriptionOther
      : description;
    
    const actualAdvertisedProduct = advertisedProduct === "Other Custom Product/Service"
      ? advertisedProductOther
      : advertisedProduct;

    try {
      setSubmitting(true);
      const payload = {
        full_name: fullName,
        business_name: businessName,
        email,
        whatsapp_number: whatsapp,
        website,
        business_location: location,
        industry,
        industry_other: industryOther,
        business_description: actualDescription,
        advertised_product: actualAdvertisedProduct,
        campaign_objective: campaignObjective,
        daily_budget: expectedBudget,
        number_of_ads: adQuantity,
        creative_required: creativeRequired,
        additional_services: selectedServices,
        meta_account_exists: metaAccountExists,
        meta_ad_account_id: selectedMetaAdAccountId,
      };

      const res = await api.submitAdsServiceRequest(payload);
      setNotification({ type: "success", message: "Ads service request saved successfully!" });
      
      // Reload quote
      const latest = await api.getLatestAdsServiceRequest();
      setActiveRequest(latest.request);
      setQuotation(latest.quotation);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to save request." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!termsAccepted) {
      setNotification({ type: "warning", message: "Please accept the non-refundable terms policy to checkout." });
      return;
    }

    const actualDescription = description === "Other business model / custom operation"
      ? descriptionOther
      : description;
    
    const actualAdvertisedProduct = advertisedProduct === "Other Custom Product/Service"
      ? advertisedProductOther
      : advertisedProduct;

    setSubmitting(true);
    try {
      // 1. Double check and save final request
      const payload = {
        full_name: fullName,
        business_name: businessName,
        email,
        whatsapp_number: whatsapp,
        website,
        business_location: location,
        industry,
        industry_other: industryOther,
        business_description: actualDescription,
        advertised_product: actualAdvertisedProduct,
        campaign_objective: campaignObjective,
        daily_budget: expectedBudget,
        number_of_ads: adQuantity,
        creative_required: creativeRequired,
        additional_services: selectedServices,
        meta_account_exists: metaAccountExists,
        meta_ad_account_id: selectedMetaAdAccountId,
      };
      const savedRes = await api.submitAdsServiceRequest(payload);
      const reqId = savedRes.request_id;

      // 2. Trigger Starter trial activation
      await api.activateAdsServiceTrial(reqId);

      // 3. Purchase pack checkout creation
      const order = await api.purchaseAdsServicePack(reqId);

      // If mock checkout, verify instantly
      if (order.is_mock) {
        await api.verifyAdsServicePayment(reqId, order.order_id, "pay_mock_12345", "signature_mock_12345");
        setNotification({ type: "success", message: "Simulated payment verified. Service is registered!" });
        const latest = await api.getLatestAdsServiceRequest();
        setActiveRequest(latest.request);
        setQuotation(latest.quotation);
        setSubmitting(false);
        router.push("/dashboard/services");
        return;
      }

      // Live Razorpay payment flow
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setNotification({ type: "error", message: "Failed to load Razorpay Checkout script." });
        setSubmitting(false);
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Digital Growth Studio",
        description: `Meta Ads Service Setup`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            setSubmitting(true);
            await api.verifyAdsServicePayment(
              reqId,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            setNotification({ type: "success", message: "Payment verified successfully. Onboarding activated!" });
            const latest = await api.getLatestAdsServiceRequest();
            setActiveRequest(latest.request);
            setQuotation(latest.quotation);
            router.push("/dashboard/services");
          } catch (err: any) {
            setNotification({ type: "error", message: "Payment verification failed. Please contact WhatsApp support." });
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          email,
          name: fullName,
          contact: whatsapp,
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to initialize checkout." });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleServiceSelection = (svcId: string) => {
    if (selectedServices.includes(svcId)) {
      setSelectedServices(selectedServices.filter((s) => s !== svcId));
    } else {
      setSelectedServices([...selectedServices, svcId]);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amt / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (eligibleState.eligible === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-full border border-red-100 mb-4">
          <AlertTriangle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">We're unable to provide this service</h2>
        <p className="text-slate-500 text-sm max-w-md mt-2">
          Unfortunately, our Meta Ads management service is currently not available for this business category: <br />
          <b className="text-red-700">{eligibleState.reason || "Prohibited category."}</b>
        </p>
        <Link href="/dashboard" className="mt-6 bg-slate-900 hover:bg-slate-950 text-white font-bold px-6 py-3 rounded-xl text-xs transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col justify-between">
      {/* WIZARD CONTAINER */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        
        {activeRequest && ["whatsapp_pending", "whatsapp_connected", "partner_access_requested", "partner_access_granted", "campaign_setup", "campaign_live"].includes(activeRequest.status) ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-3">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full w-fit mx-auto border border-emerald-100">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">You're all set! 🎉</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                Our team will review your campaign requirements and connect with you on WhatsApp shortly.
              </p>
            </div>

            {/* Next Steps List */}
            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 space-y-4 max-w-lg mx-auto">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">What happens next?</h3>
              <ol className="space-y-3.5 text-xs text-slate-600 font-semibold">
                <li className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Our team reviews your advertising requirements and copy instructions.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>We message you on WhatsApp at <b className="text-slate-800">{activeRequest.whatsapp_number}</b>.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>We help complete the required Meta Ad Account setup if requested.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5">4</span>
                  <span>We request <b>Partner Access</b> to launch campaigns directly from your Meta Ad Account.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5">5</span>
                  <span>Once access is granted, we design visual creatives, configure targeting parameters, and launch the ads live.</span>
                </li>
              </ol>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-400 font-semibold">
                Service Request Status: <b className="text-blue-600 uppercase font-bold">{activeRequest.status.replace("_", " ")}</b>
              </span>
              <Link href="/dashboard" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs px-6 py-3.5 rounded-xl text-center transition">
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* MULTI STEP WIZARD FLOW */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-8 animate-in fade-in duration-200">
            {/* PROGRESS BAR */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>STEP {currentStep + 1} OF {STEPS.length}</span>
                <span>{STEPS[currentStep].toUpperCase()}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Notification message */}
            {notification && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                notification.type === "error" ? "bg-red-50 text-red-700 border-red-100" :
                notification.type === "warning" ? "bg-amber-50 text-amber-700 border-amber-100" :
                "bg-emerald-50 text-emerald-700 border-emerald-100"
              }`}>
                <AlertTriangle size={14} className="shrink-0" />
                <span>{notification.message}</span>
              </div>
            )}

            <div className="min-h-[300px] py-2">
              {/* STEP 0: HOW THE SERVICE WORKS */}
              {currentStep === 0 && (
                <div className="space-y-6 text-left animate-fade-in">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 font-sans flex items-center gap-2">
                      <Sparkles className="text-blue-600 animate-pulse" size={24} /> How The Service Works
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Please review these details carefully before proceeding to submit your requirements.</p>
                  </div>

                  <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider text-blue-600 font-sans">
                        What happens after you submit?
                      </h3>
                      <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                        Once you complete this form, our team will review your requirements and connect with you on WhatsApp.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-1">
                        <span className="text-xs font-bold text-slate-800 block font-sans">Own Meta Ad Account</span>
                        <span className="text-[11px] text-slate-600 font-medium block leading-relaxed font-semibold">
                          Your ads will be created and run directly from your own Meta Ad Account. We do not run your ads from our own advertising account.
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-1">
                        <span className="text-xs font-bold text-slate-800 block font-sans">Partner Access Control</span>
                        <span className="text-[11px] text-slate-600 font-medium block leading-relaxed font-semibold">
                          Our team will help you set up your Meta advertising assets and request the required Partner Access to your Meta Business/Ad Account.
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-1">
                        <span className="text-xs font-bold text-slate-800 block font-sans">Ad Management</span>
                        <span className="text-[11px] text-slate-600 font-medium block leading-relaxed font-semibold">
                          Once access is provided, our team will set up, launch and manage your Meta Ads directly from your account.
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-1">
                        <span className="text-xs font-bold text-slate-800 block font-sans">Direct Billing to Meta</span>
                        <span className="text-[11px] text-slate-600 font-medium block leading-relaxed font-semibold">
                          Your Meta advertising budget is paid directly to Meta and is separate from our service charges.
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-2xl">
                      <span className="text-xs font-black text-blue-700 block uppercase tracking-wider font-sans">
                        Business Protection Guarantee
                      </span>
                      <p className="text-xs text-slate-700 font-semibold mt-1 leading-normal">
                        Your Meta Business ownership remains with you.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: BUSINESS DETAILS */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <Building className="text-blue-600" size={24} /> Business Profile
                    </h2>
                    <p className="text-xs text-slate-500">Provide basic details to kickstart your advertising setup.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Full Name *</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Vikram Singh"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Business Name *</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Digital Growth Studio"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Business Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. hello@dgstudio.com"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp Phone Number *</label>
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[9px] text-slate-400 block font-semibold">Our team will contact you on WhatsApp after submission.</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Website / Landing Page URL</label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="e.g. https://dgstudio.com"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Business Location *</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Mumbai, India"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: INDUSTRY & ELIGIBILITY */}
              {currentStep === 2 && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900">Industry & Product Offering</h2>
                    <p className="text-xs text-slate-500">Choose your segment. Prohibited categories will not be accepted.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">What industry is your business in? *</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        {INDUSTRIES.map((ind, i) => (
                          <option key={i} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>

                    {industry === "Other" && (
                      <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Please specify your industry *</label>
                        <input
                          type="text"
                          value={industryOther}
                          onChange={(e) => setIndustryOther(e.target.value)}
                          placeholder="e.g. Custom Crafts Manufacturing"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Brief Business Description *</label>
                      <select
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        {BUSINESS_DESCRIPTIONS.map((desc, i) => (
                          <option key={i} value={desc}>{desc}</option>
                        ))}
                      </select>
                    </div>

                    {description === "Other business model / custom operation" && (
                      <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Please specify business description *</label>
                        <textarea
                          value={descriptionOther}
                          onChange={(e) => setDescriptionOther(e.target.value)}
                          placeholder="e.g. We manufacture organic herbal cosmetics locally..."
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">What specific product/service do you want to advertise? *</label>
                      <select
                        value={advertisedProduct}
                        onChange={(e) => setAdvertisedProduct(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        {(PRODUCT_OPTIONS_BY_INDUSTRY[industry] || PRODUCT_OPTIONS_BY_INDUSTRY["Other"]).map((prod, i) => (
                          <option key={i} value={prod}>{prod}</option>
                        ))}
                        <option value="Other Custom Product/Service">Other Custom Product/Service</option>
                      </select>
                    </div>

                    {advertisedProduct === "Other Custom Product/Service" && (
                      <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Please specify product/service *</label>
                        <input
                          type="text"
                          value={advertisedProductOther}
                          onChange={(e) => setAdvertisedProductOther(e.target.value)}
                          placeholder="e.g. Ayurvedic Acne Face Serum"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: META ACCOUNT CHECK */}
              {currentStep === 3 && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900">Meta Ad Account Connection</h2>
                    <p className="text-xs text-slate-500">Link your active Meta account to run ads directly.</p>
                  </div>

                  {connectedMetaAccount ? (
                    <div className="border border-blue-100 bg-blue-50/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase">
                        <CheckCircle size={16} /> Your Meta Ad Account is already connected 🎉
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Connected Account Name</span>
                          {connectedMetaAccount.name}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Meta Ad Account ID</span>
                          {connectedMetaAccount.id}
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target Ad Account</label>
                        <select
                          value={selectedMetaAdAccountId}
                          onChange={(e) => setSelectedMetaAdAccountId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white"
                        >
                          {metaAdAccounts.map((acc, i) => (
                            <option key={i} value={acc.id}>{acc.name} ({acc.id})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => setMetaAccountExists(true)}
                          className={`border p-5 rounded-2xl text-left transition ${
                            metaAccountExists ? "border-blue-600 bg-blue-50/20" : "border-slate-200 hover:border-blue-600"
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-800 block">Yes, I have a Meta Ad Account</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">Connect your current Meta asset securely via OAuth.</span>
                        </button>
                        <button
                          onClick={() => setMetaAccountExists(false)}
                          className={`border p-5 rounded-2xl text-left transition ${
                            !metaAccountExists ? "border-blue-600 bg-blue-50/20" : "border-slate-200 hover:border-blue-600"
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-800 block">No, I don't have a Meta Ad Account</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">Requires our one-time Meta asset setup service.</span>
                        </button>
                      </div>

                      {metaAccountExists ? (
                        <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-4">
                          <p className="text-xs font-semibold text-slate-500">Click the button below to link your Meta Marketing integration.</p>
                          <Link
                            href="/meta-integration"
                            className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/10"
                          >
                            Connect Meta Integration
                          </Link>
                        </div>
                      ) : (
                        <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-6 space-y-4">
                          <div className="flex justify-between items-baseline">
                            <h3 className="text-base font-extrabold text-slate-900">Meta Ad Account Setup Service</h3>
                            <div className="text-right">
                              <span className="text-xs text-slate-400 line-through">₹4,999</span>
                              <span className="text-lg font-black text-blue-600 block">₹2,999</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            Don't have a Meta Business Manager or Ad Account? Our team will help you configure and set up your Meta advertising assets.
                          </p>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/70 p-2.5 rounded border border-blue-100">
                            ⓘ Note: ₹2,999 is our service setup fee. This is NOT charged by Meta.
                          </div>
                          <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={setupConfirmed}
                              onChange={(e) => setSetupConfirmed(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className="text-[11px] font-bold text-slate-700">
                              I understand that Meta Ads Account Setup is a one-time service charge of ₹2,999.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: CAMPAIGN OBJECTIVE */}
              {currentStep === 4 && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900">Campaign Objectives</h2>
                    <p className="text-xs text-slate-500">Configure your target goals and daily budget pacing guidelines.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">What's your main advertising goal? *</label>
                      <select
                        value={campaignObjective}
                        onChange={(e) => setCampaignObjective(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="Generate Leads">Generate Leads</option>
                        <option value="WhatsApp Enquiries">WhatsApp Enquiries</option>
                        <option value="Website Sales">Website Sales</option>
                        <option value="Product Sales">Product Sales</option>
                        <option value="Phone Calls">Phone Calls</option>
                        <option value="Website Traffic">Website Traffic</option>
                        <option value="App Installs">App Installs</option>
                        <option value="Brand Awareness">Brand Awareness</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">What's your expected Meta Ads budget? *</label>
                      <select
                        value={expectedBudget}
                        onChange={(e) => setExpectedBudget(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="₹300–₹500/day">₹300–₹500/day</option>
                        <option value="₹500–₹1,000/day">₹500–₹1,000/day</option>
                        <option value="₹1,000–₹2,500/day">₹1,000–₹2,500/day</option>
                        <option value="₹2,500–₹5,000/day">₹2,500–₹5,000/day</option>
                        <option value="₹5,000+/day">₹5,000+/day</option>
                        <option value="I'm not sure">I'm not sure</option>
                      </select>
                      <span className="text-[10px] text-slate-400 block font-semibold pt-1">
                        ⓘ Your Meta advertising budget is separate from our service charges and is paid directly to Meta.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: NUMBER OF ADS */}
              {currentStep === 5 && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900">Select Number of Ads</h2>
                    <p className="text-xs text-slate-500">Choose the exact quantity of ads you want us to manage. More ads grant higher wholesale discounts.</p>
                  </div>

                  {/* Slider Control */}
                  <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">Choose Quantity</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Drag the slider to select your required quantity of ads.</p>
                      </div>
                      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm border border-blue-500">
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={adQuantity || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setAdQuantity(0);
                            } else {
                              const val = parseInt(raw, 10);
                              if (!isNaN(val) && val >= 0) {
                                setAdQuantity(Math.min(val, 200));
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!adQuantity || adQuantity < 1) {
                              setAdQuantity(1);
                            }
                          }}
                          className="w-10 bg-transparent text-white text-base font-black text-center focus:outline-none border-b border-blue-350 focus:border-white transition font-sans"
                        />
                        <span className="text-xs font-bold uppercase font-sans pr-1">{adQuantity === 1 ? "Ad" : "Ads"}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Range Input with custom styles */}
                      <input
                        type="range"
                        min="1"
                        max={Math.max(50, adQuantity)}
                        value={adQuantity || 1}
                        onChange={(e) => setAdQuantity(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                      />
                      
                      <div className="flex justify-between text-[9px] font-bold text-slate-450 uppercase px-1 font-sans">
                        <span>1 Ad</span>
                        <span>10 Ads</span>
                        <span>20 Ads</span>
                        <span>30 Ads</span>
                        <span>40 Ads</span>
                        <span>{Math.max(50, adQuantity)}+ Ads</span>
                      </div>
                    </div>

                    {/* Calculated Prices for selected quantity */}
                    <div className="border-t border-slate-200/60 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Per-Ad Pricing Details</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900 font-sans">₹{adPerUnitPrice}</span>
                          <span className="text-[10px] font-bold text-slate-500 font-sans">/ ad</span>
                          {/* Discount Chip */}
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                            {adQuantity === 1 && eligibleState?.intro_offer_eligible ? "Best Value" : `${Math.round(((1499 - adPerUnitPrice)/1499)*100)}% Off`}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-slate-500 block font-medium">
                          Validity Period: <span className="font-bold text-slate-700 font-sans">{adValidityDays} Days</span>
                        </span>
                      </div>

                      <div className="space-y-1 md:text-right md:border-l md:border-slate-200/60 md:pl-6">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Service Charges</span>
                        <div className="flex items-baseline md:justify-end gap-2 flex-wrap font-sans">
                          <span className="text-xs text-slate-400 line-through font-semibold">₹{(1499 * adQuantity).toLocaleString()}</span>
                          <span className="text-2xl font-black text-blue-600 font-sans">₹{adTotalOfferPrice.toLocaleString()}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold block font-sans">
                          You save ₹{(1499 * adQuantity - adTotalOfferPrice).toLocaleString()}!
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Tiers Table */}
                  <div className="bg-slate-50/50 border border-slate-150 rounded-3xl p-5 space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Volume Discount Tiers</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {(() => {
                        const packs = config?.ad_packs || [];
                        const sortedPacks = [...packs]
                          .filter((p: any) => p.active)
                          .sort((a: any, b: any) => a.ad_quantity - b.ad_quantity);

                        return sortedPacks.map((pack: any, idx) => {
                          let range = `${pack.ad_quantity} Ad${pack.ad_quantity > 1 ? "s" : ""}`;
                          let desc = "Standard";
                          if (pack.ad_quantity === 1) desc = "Standard";
                          else if (pack.ad_quantity === 5) desc = "Volume Save";
                          else if (pack.ad_quantity === 15) desc = "Pro Scaler";
                          else if (pack.ad_quantity === 30) desc = "Growth Pack";
                          else desc = "Wholesale";

                          if (idx > 0) {
                            const prevQty = sortedPacks[idx - 1].ad_quantity;
                            if (pack.ad_quantity === 9999) {
                              range = `${prevQty + 1}+ Ads`;
                            } else {
                              range = `${prevQty + 1} - ${pack.ad_quantity} Ads`;
                            }
                          }

                          const isCurrent = matchedPackId === pack.id;

                          return (
                            <div 
                              key={pack.id || idx} 
                              className={`p-2.5 rounded-2xl border text-center transition flex flex-col justify-between ${
                                isCurrent 
                                  ? "border-blue-600 bg-white shadow-sm ring-1 ring-blue-600/30" 
                                  : "border-slate-150 bg-white/40"
                              }`}
                            >
                              <span className={`text-[9px] font-black uppercase block ${isCurrent ? "text-blue-600" : "text-slate-400"}`}>
                                {range}
                              </span>
                              <span className="text-sm font-black text-slate-800 block mt-1 font-sans">
                                {pack.ad_quantity === 1 && eligibleState?.intro_offer_eligible ? "₹333" : `₹${pack.price_per_ad || pack.offer_price}`}
                              </span>
                              <span className="text-[8px] text-slate-400 font-semibold block mt-0.5 uppercase">
                                {pack.ad_quantity === 1 && eligibleState?.intro_offer_eligible ? "Intro Offer" : desc}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: CREATIVE & ADDITIONAL SERVICES */}
              {currentStep === 6 && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900">Creative & Additional Services</h2>
                    <p className="text-xs text-slate-500">Decide if you require ad creative design assets or tracking setups.</p>
                  </div>

                  <div className="space-y-6">
                    {/* Creative Choice */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Do you need us to design your ad creative? *</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => setCreativeRequired(false)}
                          className={`border p-4 rounded-2xl text-left transition ${
                            !creativeRequired ? "border-blue-600 bg-blue-50/20" : "border-slate-200 hover:border-blue-600"
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-800 block">I already have my creative</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">No extra visual creative service charges.</span>
                        </button>
                        <button
                          onClick={() => setCreativeRequired(true)}
                          className={`border p-4 rounded-2xl text-left transition ${
                            creativeRequired ? "border-blue-600 bg-blue-50/20" : "border-slate-200 hover:border-blue-600"
                          }`}
                        >
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-slate-800">I need creative design</span>
                            <span className="text-xs font-extrabold text-blue-600">₹{config?.services_pricing?.creative_design_service?.offer_price || 499} extra</span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">Includes banner design matching Meta guidelines.</span>
                        </button>
                      </div>
                    </div>

                    {/* Additional Services Checklist */}
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Additional services to include</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {config?.additional_services.filter((svc: any) => svc.active !== false).map((svc) => {
                          const isSelected = selectedServices.includes(svc.id);
                          return (
                            <button
                              key={svc.id}
                              onClick={() => toggleServiceSelection(svc.id)}
                              className={`flex justify-between items-center text-left border p-3.5 rounded-xl transition ${
                                isSelected ? "border-blue-600 bg-blue-50/10 text-blue-900" : "border-slate-100 hover:border-blue-600 text-slate-700 bg-slate-50/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <CheckSquare size={16} className={isSelected ? "text-blue-600" : "text-slate-300"} />
                                <span className="text-xs font-semibold">{svc.name}</span>
                              </div>
                              <span className="text-xs font-bold">
                                {svc.instant ? `₹${svc.offer_price}` : "Custom"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: QUOTATION & PAYMENT */}
              {currentStep === 7 && quotation && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="text-blue-600" size={24} /> Service Quotation
                    </h2>
                    <p className="text-xs text-slate-500">Review your dynamic quotation breakdown below before starting the checkout.</p>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs bg-slate-50/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Regular Value</th>
                          <th className="p-3 text-right">Final Price</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold text-slate-700">
                        {quotation.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="p-3">
                              {item.description}
                              {item.custom_quote_required && (
                                <span className="ml-1.5 inline-block bg-amber-50 text-amber-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                                  Custom Quote Req.
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right text-slate-400 line-through">{formatCurrency(item.regular_total)}</td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              {item.custom_quote_required ? "Manual Quote" : formatCurrency(item.offer_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Grand Totals */}
                    <div className="p-4 bg-blue-50/20 border-t border-slate-200 space-y-2 text-right">
                      <div className="text-xs text-slate-500">
                        Total Regular Value: <span className="line-through">{formatCurrency(quotation.regular_total)}</span>
                      </div>
                      <div className="text-xs text-emerald-600 font-bold">
                        You Save: {formatCurrency(quotation.discount_total)}
                      </div>
                      <div className="text-base font-black text-slate-900">
                        Payable Amount: {formatCurrency(quotation.final_total)}
                      </div>
                    </div>
                  </div>

                  {/* Starter Plan details */}
                  <div className="border border-blue-100 bg-blue-50/20 rounded-2xl p-5 space-y-3.5">
                    <h3 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1.5">
                      <Lock size={14} /> Starter Plan Required
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      This ads management service is active alongside our **Starter Plan** (₹99/month). 
                      Your 7-day Starter Plan trial will be activated automatically when you proceed with checkout.
                    </p>
                  </div>

                  {/* Checkout policies & terms */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-amber-50/50 p-3 rounded-lg border border-amber-200 text-amber-800 leading-normal">
                      ⚠ All Ad Pack purchases are non-refundable. Unused ads automatically expire after their stated validity period (e.g. 30/60/90 days) and cannot be carried forward.
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5"
                      />
                      <span className="text-[11px] font-bold text-slate-700">
                        I accept the non-refundable terms policy and agree to automatically expire unused ad credits.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* BUTTON NAVIGATION BAR */}
            <div className="pt-6 border-t border-slate-100 flex justify-between items-center flex-wrap gap-4">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0 || (isNew && activeRequest && activeRequest.status !== "draft" && currentStep <= 5)}
                className="inline-flex items-center gap-1 hover:text-slate-600 transition disabled:opacity-30 font-bold text-xs"
              >
                <ArrowLeft size={13} /> Back
              </button>
              
              <div className="flex gap-3">
                {currentStep > 0 && currentStep < STEPS.length - 1 && (
                  <button
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="border border-slate-200 hover:border-slate-400 text-slate-700 font-bold text-xs px-5 py-3 rounded-xl transition"
                  >
                    Save Draft
                  </button>
                )}

                {currentStep === STEPS.length - 1 ? (
                  <button
                    onClick={handleCheckout}
                    disabled={submitting || !termsAccepted}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Checking out...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Checkout & Start Trial
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <>Continue <ArrowRight size={14} /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t border-slate-200 bg-white text-center text-xs font-semibold text-slate-400">
        Digital Growth Studio • AI Meta Ads Strategy Auditor • © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
