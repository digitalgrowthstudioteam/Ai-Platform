"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import PixelInjector from "@/components/app-platform/store/PixelInjector";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShoppingCart,
  Search,
  Menu,
  X,
  Home,
  LayoutGrid,
  Send,
  AlertCircle,
  Truck,
  DollarSign,
  PackageCheck,
  MessageCircle,
} from "lucide-react";

export default function SellOnStoreClient() {
  const params = useParams();
  const router = useRouter();

  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    reference_id: string;
    message: string;
  } | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [brandTradeName, setBrandTradeName] = useState("");
  const [businessType, setBusinessType] = useState("Manufacturer");
  const [category, setCategory] = useState("Beverages & Drinks");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [fssaiLicense, setFssaiLicense] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Karnataka");
  const [pincode, setPincode] = useState("");
  const [monthlyCapacity, setMonthlyCapacity] = useState("₹5 Lakhs - ₹25 Lakhs");
  const [productDetails, setProductDetails] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Cart count & customer session
  const { itemCount: cartCount } = useVendorCart(slug);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    async function loadConfig() {
      try {
        const cfg = await platformApi.getPublicStoreConfig(resolvedSlug);
        setConfig(cfg);
      } catch (err: any) {
        console.error("Failed to load store config:", err);
      } finally {
        setLoading(false);
      }
    }
    if (resolvedSlug) {
      loadConfig();
    }
  }, [params]);

  useEffect(() => {
    const updateCustomer = () => {
      try {
        const sess = localStorage.getItem(`dgs_customer_session_${slug}`);
        if (sess) {
          const parsed = JSON.parse(sess);
          if (parsed?.name && parsed?.isLoggedIn) {
            setCustomerName(parsed.name.trim().split(" ")[0]);
            return;
          }
        }
        setCustomerName(null);
      } catch (e) {
        setCustomerName(null);
      }
    };
    updateCustomer();
    window.addEventListener("storage", updateCustomer);
    window.addEventListener("dgs_customer_auth_changed", updateCustomer);
    return () => {
      window.removeEventListener("storage", updateCustomer);
      window.removeEventListener("dgs_customer_auth_changed", updateCustomer);
    };
  }, [slug]);

  const primaryColor = config?.primary_color || "#ff7300";
  const brandName = config?.store_name || "My Shop Partner";
  const brandPhone = config?.contact_phone || "+91 8332023338";
  const brandEmail = config?.contact_email || "support@myshoppartner.in";
  const brandAddress =
    config?.business_address ||
    "#102, Brigade IRV Center, Nallurahalli, Whitefield, Bengaluru, Karnataka 560066";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim() || businessName.trim().length < 2) {
      setError("Please enter your registered business or company name.");
      return;
    }
    if (!contactPerson.trim() || contactPerson.trim().length < 2) {
      setError("Please enter the contact person's full name.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid business email address.");
      return;
    }

    if (!city.trim() || !stateName.trim()) {
      setError("Please specify your warehouse / business city and state.");
      return;
    }

    if (!termsAgreed) {
      setError("Please confirm compliance with standard merchant supply terms.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        contact_person: contactPerson.trim(),
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        whatsapp_number: whatsappNumber.trim() ? whatsappNumber.replace(/[^0-9]/g, "") : cleanPhone,
        business_type: businessType,
        category: category,
        gstin: gstin.trim().toUpperCase() || undefined,
        fssai_license: fssaiLicense.trim() || undefined,
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim() || undefined,
        monthly_capacity: monthlyCapacity,
        product_details: productDetails.trim() || undefined,
      };

      const res = await platformApi.submitSupplierInquiry(slug, payload);
      setSuccessResult({
        reference_id: res.reference_id || `MSP-SUP-${Math.floor(100000 + Math.random() * 900000)}`,
        message: res.message || `Application submitted successfully! Our merchant onboarding manager will contact you within 24 hours.`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to submit supplier application. Please check details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi NCR",
    "Other Union Territory",
  ];

  const categoryOptions = [
    "Assorted Chocolates & Confectionery",
    "Beverages & Drinks",
    "Biscuits and Cookies",
    "Cleaning Products & Detergents",
    "Dairy Products",
    "Dry Fruits & Nuts",
    "Flours & Grains",
    "Instant Food & Noodles",
    "Masalas & Spices",
    "Oil and Ghee",
    "Personal Care & Hygiene",
    "Pickles & Chutneys",
    "Pulses & Dals",
    "Rice and Rice Products",
    "Sauces, Condiments & Dips",
    "Snacks & Namkeen",
    "Sugar, Jaggery & Salt",
    "Sweets & Traditional Mithai",
    "General FMCG / Other",
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16 sm:pb-0">
      <PixelInjector config={config} pageTitle={`Sell on ${brandName} - Supplier Application`} />

      {/* 1. Header (Vibrant Orange matching theme) */}
      <header
        style={{ backgroundColor: primaryColor }}
        className="text-white sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href={getStoreHref(slug, "/")}
            className="flex items-center gap-2 group select-none shrink-0"
          >
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt={brandName}
                className="h-9 sm:h-11 max-w-[170px] object-contain brightness-0 invert"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="bg-white text-[#ff7300] font-black text-xs sm:text-sm px-2 py-0.5 rounded shadow-xs uppercase tracking-tight">
                  My Shop
                </div>
                <span className="text-white font-extrabold text-lg sm:text-xl tracking-tight">
                  PARTNER
                </span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href={getStoreHref(slug, "/cart")}
              className="relative p-2 text-white hover:bg-black/10 rounded-full transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#ff7300] font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              href={getStoreHref(slug, "/account")}
              className="bg-white text-[#ff7300] font-bold text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-xs hover:bg-orange-50 transition-colors uppercase tracking-wide flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>{customerName ? customerName : "LOGIN"}</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-black/10 rounded-full transition-colors sm:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Link href={getStoreHref(slug, "/")} className="hover:text-[#ff7300] transition-colors">
            HOME
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-800">SELL ON {brandName.toUpperCase()}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Success View */}
        {successResult ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-lg animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <span className="inline-block bg-orange-100 text-[#ff7300] text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              Application Received
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Welcome to the {brandName} Merchant Network!
            </h1>

            <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
              {successResult.message}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-sm mx-auto mb-8 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Your Reference Number
              </span>
              <span className="text-xl font-mono font-black text-slate-900 tracking-wider">
                {successResult.reference_id}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://wa.me/${brandPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hi ${brandName} Onboarding Team! I just submitted my supplier application (Ref: ${successResult.reference_id}) for ${businessName}. Looking forward to discussing catalog listing.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-full shadow-md transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Chat with Onboarding Manager on WhatsApp
              </a>

              <Link
                href={getStoreHref(slug, "/")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-sm px-6 py-3 rounded-full transition-all"
              >
                Back to Storefront
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Header / Hero Intro */}
            <div className="text-center mb-8">
              <span className="inline-block bg-orange-100 text-[#ff7300] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                Merchant & Supplier Onboarding
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Sell on {brandName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mt-2 leading-relaxed">
                Connect your factory, wholesale inventory, or FMCG brand directly to thousands of Kirana stores, retail partners, and wholesale buyers across India.
              </p>

              {/* 3 Value Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-left">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff7300] flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Zero Listing Fees</h4>
                    <p className="text-[11px] text-slate-500">Free catalog onboarding</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Prompt Settlements</h4>
                    <p className="text-[11px] text-slate-500">Transparent GST invoicing</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Doorstep Logistics</h4>
                    <p className="text-[11px] text-slate-500">Pan-India express dispatch</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Form Card */}
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg space-y-8"
            >
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3 animate-in shake">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Business Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building2 className="w-5 h-5 text-[#ff7300]" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                    1. Business & Category Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Registered Business / Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Shree Balaji Agro Foods Pvt Ltd"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Brand / Trade Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={brandTradeName}
                      onChange={(e) => setBrandTradeName(e.target.value)}
                      placeholder="e.g. Balaji Fresh"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Business Classification <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    >
                      <option value="Manufacturer">Direct FMCG Manufacturer</option>
                      <option value="Master Distributor">Authorized Master Distributor / Stockist</option>
                      <option value="Direct Importer">Direct Importer</option>
                      <option value="Brand Owner">D2C / Packaged Brand Owner</option>
                      <option value="Mill / Farm Producer">Rice Mill / Grain Processor / Farm Producer</option>
                      <option value="Wholesaler">Regional Wholesaler</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Primary Product Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <User className="w-5 h-5 text-[#ff7300]" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                    2. Primary Contact Person
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Contact Person Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      10-Digit Mobile Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="9876543210"
                        className="w-full text-xs sm:text-sm pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Business Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. sales@balajifoods.in"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      WhatsApp Dispatch Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Leave blank to use mobile number"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Regulatory & Tax Compliance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-5 h-5 text-[#ff7300]" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                    3. Regulatory & Tax Compliance
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      GSTIN (15-Digit GST Number) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 29AAOCB6773A1ZF"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      FSSAI Food License No. <span className="text-slate-400 font-normal">(For Food/FMCG)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={fssaiLicense}
                      onChange={(e) => setFssaiLicense(e.target.value)}
                      placeholder="14-digit FSSAI number"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Warehouse & Supply Scale */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="w-5 h-5 text-[#ff7300]" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                    4. Warehouse Location & Supply Capacity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      City / Warehouse Hub <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru, Pune"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                    >
                      {indianStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Pincode <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="560066"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Estimated Monthly Supply Volume
                  </label>
                  <select
                    value={monthlyCapacity}
                    onChange={(e) => setMonthlyCapacity(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50"
                  >
                    <option value="Under ₹5 Lakhs">Under ₹5 Lakhs / month (Small Producer)</option>
                    <option value="₹5 Lakhs - ₹25 Lakhs">₹5 Lakhs – ₹25 Lakhs / month (Growing Merchant)</option>
                    <option value="₹25 Lakhs - ₹1 Crore">₹25 Lakhs – ₹1 Crore / month (Established Wholesaler)</option>
                    <option value="₹1 Crore+">₹1 Crore+ / month (Large Enterprise Manufacturer)</option>
                  </select>
                </div>
              </div>

              {/* Section 5: Catalog & Product Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <PackageCheck className="w-5 h-5 text-[#ff7300]" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                    5. Product Range & Catalog Pitch
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Brief Product Description / Catalog Link / SKUs
                  </label>
                  <textarea
                    rows={3}
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    placeholder="List the key products or brands you supply, pack sizes (e.g. 500g, 1kg, 25kg bulk bags), or paste a link to your product catalog."
                    className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:border-[#ff7300] focus:ring-2 focus:ring-[#ff7300]/20 outline-hidden transition-all bg-slate-50/50 leading-relaxed"
                  />
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#ff7300] focus:ring-[#ff7300]"
                  />
                  <span className="text-xs text-slate-600 leading-normal">
                    I confirm that the details provided are accurate and our supplied products meet standard manufacturing, packaging, and regulatory safety guidelines.
                  </span>
                </label>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  Our merchant manager reviews applications within <span className="font-bold text-slate-700">24 business hours</span>.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#ff7300] hover:bg-orange-600 text-white font-black text-xs sm:text-sm rounded-full shadow-lg transition-transform active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Supplier Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Dark Footer */}
      <footer className="bg-[#0A0F1D] text-slate-400 text-xs mt-16 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-slate-800">
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              COMPANY
            </span>
            <h4 className="text-base font-extrabold text-white">{brandName}</h4>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs">
              {brandAddress}
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              GSTIN: {config?.gst_number || "29AAOCB6773A1ZF"}
            </p>
            <div className="space-y-1.5 pt-1">
              <a
                href={`tel:${brandPhone}`}
                className="flex items-center gap-2 text-slate-300 hover:text-[#ff7300] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#ff7300]" />
                <span>{brandPhone}</span>
              </a>
              <a
                href={`mailto:${brandEmail}`}
                className="flex items-center gap-2 text-slate-300 hover:text-[#ff7300] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#ff7300]" />
                <span>{brandEmail}</span>
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              KNOW MORE
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <li>
                <Link
                  href={getStoreHref(slug, "/")}
                  className="hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/categories")}
                  className="hover:text-white transition-colors"
                >
                  Browse Catalogue
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/sell")}
                  className="text-[#ff7300] font-bold transition-colors"
                >
                  Sell on {brandName}
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/privacy")}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/terms")}
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/refund")}
                  className="hover:text-white transition-colors"
                >
                  Cancellation & Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getStoreHref(slug, "/policies/shipping")}
                  className="hover:text-white transition-colors"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${brandPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Customer Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 text-center text-slate-600 text-[11px]">
          Copyright © {new Date().getFullYear()} {brandName}. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

