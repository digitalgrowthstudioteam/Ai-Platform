"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { StoreSettings, VendorProfile } from "@/lib/app-platform/types";
import {
  Store,
  Palette,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  ExternalLink,
  Check,
  AlertCircle,
  Lock,
  Tag,
  CreditCard,
  Truck,
  MessageSquare,
  ShieldCheck,
  Building2,
  Globe,
  Copy,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Zap,
  Send,
  Server,
  Eye,
  EyeOff,
} from "lucide-react";

export default function VendorStoreSettingsPage() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Domain State
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [purchasingAddon, setPurchasingAddon] = useState(false);
  const [copiedDns, setCopiedDns] = useState(false);
  const [domainMessage, setDomainMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email Notifications & SMTP State
  const [emailSettings, setEmailSettings] = useState<any>(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [storeData, profileData, customDomainData, emailData] = await Promise.all([
          platformApi.getVendorStore(),
          platformApi.getVendorProfile().catch(() => null),
          platformApi.getVendorCustomDomainInfo().catch(() => null),
          platformApi.getVendorEmailSettings().catch(() => null),
        ]);
        setStore(storeData);
        setProfile(profileData);
        if (customDomainData) {
          setDomainInfo(customDomainData);
          if (customDomainData.custom_domain) {
            setCustomDomainInput(customDomainData.custom_domain);
          }
        }
        if (emailData) {
          setEmailSettings(emailData);
          setTestEmailAddress(emailData.default_reply_to || "");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchaseCustomDomainAddon = async () => {
    if (!domainInfo?.addon_id) {
      setDomainMessage({ type: "error", text: "Custom domain add-on not found in catalog." });
      return;
    }
    setPurchasingAddon(true);
    setDomainMessage(null);
    try {
      const orderRes = await platformApi.createAddonOrder(domainInfo.addon_id);

      if (orderRes.is_mock) {
        // Fallback only if backend has no payment gateway credentials configured
        await platformApi.verifyAddonPayment({
          addon_id: domainInfo.addon_id,
          razorpay_order_id: orderRes.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: `mock_sig_${Date.now()}`,
        });
        const refreshed = await platformApi.getVendorCustomDomainInfo();
        setDomainInfo(refreshed);
        setDomainMessage({
          type: "success",
          text: "🎉 Custom Domain add-on successfully activated! You can now enter your personal domain below.",
        });
        setPurchasingAddon(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setDomainMessage({
          type: "error",
          text: "Failed to load Razorpay Checkout SDK. Please check your internet connection.",
        });
        setPurchasingAddon(false);
        return;
      }

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "Digital Growth Studio",
        description: `Add-on: ${orderRes.addon_name || "Custom Domain Connection"}`,
        order_id: orderRes.order_id,
        theme: {
          color: "#4F46E5",
        },
        handler: async (response: any) => {
          try {
            await platformApi.verifyAddonPayment({
              addon_id: domainInfo.addon_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const refreshed = await platformApi.getVendorCustomDomainInfo();
            setDomainInfo(refreshed);
            setDomainMessage({
              type: "success",
              text: "🎉 Custom Domain add-on successfully activated via Razorpay! You can now enter your personal domain below.",
            });
          } catch (err: any) {
            setDomainMessage({
              type: "error",
              text: err.message || "Payment verification failed. Please contact support.",
            });
          } finally {
            setPurchasingAddon(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPurchasingAddon(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setDomainMessage({
          type: "error",
          text: resp?.error?.description || "Payment failed or was cancelled.",
        });
        setPurchasingAddon(false);
      });
      rzp.open();
    } catch (err: any) {
      setDomainMessage({ type: "error", text: err.message || "Failed to initiate Razorpay checkout." });
      setPurchasingAddon(false);
    }
  };

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customDomainInput.trim().toLowerCase().replace("https://", "").replace("http://", "").split("/")[0];
    setSavingDomain(true);
    setDomainMessage(null);
    try {
      await platformApi.updateVendorStore({ custom_domain: clean || null } as any);
      const refreshed = await platformApi.getVendorCustomDomainInfo();
      setDomainInfo(refreshed);
      setDomainMessage({
        type: "success",
        text: clean
          ? `Domain "${clean}" saved! Follow the 3-step DNS setup below.`
          : "Custom domain removed successfully.",
      });
    } catch (err: any) {
      setDomainMessage({ type: "error", text: err.message || "Failed to save custom domain" });
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDns = async () => {
    setVerifyingDns(true);
    setDomainMessage(null);
    try {
      const res = await platformApi.verifyVendorCustomDomain();
      const refreshed = await platformApi.getVendorCustomDomainInfo();
      setDomainInfo(refreshed);
      setDomainMessage({
        type: "success",
        text: res.message || "Custom domain verified! SSL certificate is active.",
      });
    } catch (err: any) {
      setDomainMessage({ type: "error", text: err.message || "Failed to verify DNS" });
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleCopyDns = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDns(true);
    setTimeout(() => setCopiedDns(false), 2000);
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSettings) return;
    setSavingEmailSettings(true);
    setEmailStatusMsg(null);
    try {
      const updated = await platformApi.updateVendorEmailSettings({
        email_notifications_enabled: emailSettings.email_notifications_enabled,
        email_provider: emailSettings.email_provider,
        smtp_host: emailSettings.smtp_host,
        smtp_port: Number(emailSettings.smtp_port) || 587,
        smtp_user: emailSettings.smtp_user,
        smtp_password: emailSettings.smtp_password || undefined,
        smtp_from_email: emailSettings.smtp_from_email,
        smtp_from_name: emailSettings.smtp_from_name,
      });
      setEmailSettings(updated);
      setEmailStatusMsg({
        type: "success",
        text: "Transactional email notification settings saved successfully!",
      });
      setTimeout(() => setEmailStatusMsg(null), 4000);
    } catch (err: any) {
      setEmailStatusMsg({
        type: "error",
        text: err.message || "Failed to update email settings.",
      });
    } finally {
      setSavingEmailSettings(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setEmailStatusMsg({ type: "error", text: "Please enter a valid destination email address for the test." });
      return;
    }
    setSendingTestEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await platformApi.sendVendorTestEmail(testEmailAddress);
      setEmailStatusMsg({
        type: "success",
        text: res.message || `Test email dispatched successfully to ${testEmailAddress}!`,
      });
    } catch (err: any) {
      setEmailStatusMsg({
        type: "error",
        text: err.message || "Failed to deliver test email. Please check your SMTP configuration.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setStore((prev) => {
      if (!prev) return null;
      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        return { ...prev, [name]: checked };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updatedStore = await platformApi.updateVendorStore(store);
      setStore(updatedStore);

      if (profile) {
        const updatedProfile = await platformApi.updateVendorProfile({
          business_name: profile.business_name,
          owner_name: profile.owner_name,
          category: profile.category,
          whatsapp_number: profile.whatsapp_number,
          whatsapp_business_name: profile.whatsapp_business_name,
          business_phone: profile.business_phone,
          address: profile.address,
          description: profile.description,
        });
        setProfile(updatedProfile);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update store settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Profile & Settings</h1>
          <p className="text-sm text-slate-500">
            Configure your business details, branding, contacts, and storefront appearance
          </p>
        </div>
        {store?.store_slug && (
          <Link
            href={`/app/store/${store.store_slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-xs self-start sm:self-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview Online Store
          </Link>
        )}
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          Store profile & business details updated successfully!
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {error}
        </div>
      )}

      {/* Brand Name Permanent Lock Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Permanent Brand Name (Locked)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Verified
              </span>
            </div>
            <p className="text-lg font-black text-amber-900 font-mono mt-0.5">
              {profile?.brand_name || store?.store_name}
            </p>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Brand name was established during registration and cannot be modified once selected to protect your Android App package and certificates.
            </p>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* CUSTOM DOMAIN SETUP & CLOUDFLARE FOR SAAS (₹999 ADD-ON) */}
      {/* ────────────────────────────────────────────────────────── */}
      {domainInfo && !domainInfo.custom_domain_enabled ? (
        /* LOCKED STATE: ADD-ON REQUIRED (₹999 ONE-TIME) */
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border border-indigo-500/30 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Connect Your Own Custom Domain
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    ₹999 One-Time Add-on
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Replace <span className="font-mono text-indigo-300 font-semibold">{store?.subdomain}</span> with your personal brand domain like <span className="font-mono text-amber-300 font-semibold">kcaariwork.com</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePurchaseCustomDomainAddon}
              disabled={purchasingAddon}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
            >
              {purchasingAddon ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Custom Domain (₹999)</span>
                </>
              )}
            </button>
          </div>

          {/* Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Free Lifetime SSL (HTTPS)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                100% Free automated Let's Encrypt / Google Trust certificates with auto-renewal.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Zap className="w-4 h-4" />
                <span>Cloudflare Edge Caching</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Lightning fast store load speeds and enterprise DDoS protection across India.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Building2 className="w-4 h-4" />
                <span>100% White-Label Identity</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Customers only see your domain in the URL bar, checkout, and order receipts.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            💡 <em>Have a VIP plan or paid offline? Contact Super Admin / Support to activate your custom domain access directly.</em>
          </p>
        </div>
      ) : domainInfo ? (
        /* UNLOCKED STATE: DOMAIN CONFIGURATION & DNS INSTRUCTIONS */
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Custom Domain Connection
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Unlocked
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Point your personal domain (GoDaddy, Hostinger, Namecheap) to your store.
                </p>
              </div>
            </div>

            {/* Status Pill */}
            {domainInfo.custom_domain && (
              <div>
                {domainInfo.custom_domain_status === "ACTIVE" ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Active & Verified (SSL Live)
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Pending DNS Verification
                  </span>
                )}
              </div>
            )}
          </div>

          {domainMessage && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                domainMessage.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {domainMessage.type === "success" ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{domainMessage.text}</span>
            </div>
          )}

          {/* Domain Input Form */}
          <form onSubmit={handleSaveCustomDomain} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Custom Domain Name
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="e.g. kcaariwork.com or shop.mybrand.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingDomain}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {savingDomain ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Domain</span>
                </button>
                {domainInfo.custom_domain && (
                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={verifyingDns}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${verifyingDns ? "animate-spin" : ""}`} />
                    <span>{verifyingDns ? "Checking..." : "Verify DNS Status"}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your apex domain (e.g. <strong className="font-mono text-slate-600">kcaariwork.com</strong>) or subdomain (e.g. <strong className="font-mono text-slate-600">shop.kcaariwork.com</strong>).
              </p>
            </div>
          </form>

          {/* Step-by-Step DNS Instructions */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3.5 text-xs text-slate-600">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                i
              </span>
              How to point your domain (3 Simple Steps):
            </h4>

            <ol className="space-y-3 list-decimal list-inside text-slate-700">
              <li className="leading-relaxed">
                Log in to your domain registrar (where you bought your domain, e.g. <strong>GoDaddy, Hostinger, Namecheap, BigRock</strong>).
              </li>
              <li className="leading-relaxed">
                Go to <strong>DNS Management</strong> and add this <strong>CNAME Record</strong>:
                <div className="mt-2 bg-white rounded-xl border border-slate-200 p-3 font-mono text-xs overflow-x-auto space-y-2">
                  <div className="grid grid-cols-3 gap-2 pb-1 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold">
                    <span>Type</span>
                    <span>Name / Host</span>
                    <span>Target / Destination</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-center text-slate-800 font-bold">
                    <span className="text-blue-600">CNAME</span>
                    <span>www (or @)</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-emerald-700 truncate">{domainInfo.custom_domain_dns_target || "cname.digitalgrowthstudio.in"}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyDns(domainInfo.custom_domain_dns_target || "cname.digitalgrowthstudio.in")}
                        className="p-1 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Copy Target"
                      >
                        {copiedDns ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
              <li className="leading-relaxed">
                Click <strong>&quot;Verify DNS Status&quot;</strong> above. Cloudflare automatically issues and activates your <strong>Free SSL (HTTPS) certificate</strong> within 5–15 minutes!
              </li>
            </ol>

            {domainInfo.custom_domain && domainInfo.custom_domain_status === "ACTIVE" && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Your store is live on {domainInfo.custom_domain}
                </span>
                <a
                  href={`https://${domainInfo.custom_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  <span>Open Custom Domain</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ────────────────────────────────────────────────────────── */}
      {/* EMAIL & TRANSACTIONAL NOTIFICATIONS (BREVO / CUSTOM SMTP) */}
      {/* ────────────────────────────────────────────────────────── */}
      {emailSettings && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Transactional Emails & Store Notifications
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-blue-600" />
                    Automated
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sends Account Welcome, Forgot Password OTPs, Order Invoices, and Dispatch Tracking alerts.
                </p>
              </div>
            </div>

            {/* Enable/Disable Master Toggle */}
            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={emailSettings.email_notifications_enabled}
                onChange={(e) =>
                  setEmailSettings({ ...emailSettings, email_notifications_enabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">Notifications Active</span>
            </label>
          </div>

          {emailStatusMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                emailStatusMsg.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {emailStatusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{emailStatusMsg.text}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Email Dispatch Engine
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: Platform Relay */}
              <div
                onClick={() => setEmailSettings({ ...emailSettings, email_provider: "PLATFORM" })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  emailSettings.email_provider === "PLATFORM"
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Platform Managed Engine</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Zero Setup
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="email_provider"
                    checked={emailSettings.email_provider === "PLATFORM"}
                    onChange={() => setEmailSettings({ ...emailSettings, email_provider: "PLATFORM" })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fast, guaranteed inbox delivery powered by platform servers. Sender shows as{" "}
                  <strong className="text-slate-800">{store?.store_name || "Your Store"}</strong> and customer replies go directly to{" "}
                  <strong className="text-slate-800">{emailSettings.default_reply_to || "your contact email"}</strong>.
                </p>
              </div>

              {/* Option 2: Custom SMTP */}
              <div
                onClick={() => setEmailSettings({ ...emailSettings, email_provider: "CUSTOM_SMTP" })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  emailSettings.email_provider === "CUSTOM_SMTP"
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Custom Business SMTP</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      Your Domain
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="email_provider"
                    checked={emailSettings.email_provider === "CUSTOM_SMTP"}
                    onChange={() => setEmailSettings({ ...emailSettings, email_provider: "CUSTOM_SMTP" })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Send emails directly from your Google Workspace, Zoho Mail, or custom business domain webmail server (e.g. orders@{store?.store_slug || "brand"}.com).
                </p>
              </div>
            </div>
          </div>

          {/* Custom SMTP Configuration Fields */}
          {emailSettings.email_provider === "CUSTOM_SMTP" && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Server className="w-4 h-4 text-blue-600" />
                <span>Custom SMTP Connection Credentials</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SMTP Host / Server *
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_host || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="e.g. smtp.gmail.com or smtp.zoho.in"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={emailSettings.smtp_port || 587}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, smtp_port: Number(e.target.value) || 587 })
                    }
                    placeholder="587"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SMTP Username / Login Email *
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_user || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                    placeholder="orders@yourdomain.com"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SMTP Password / App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      value={emailSettings.smtp_password || ""}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                      placeholder={emailSettings.has_custom_password ? "•••••••• (Password configured - leave blank to keep)" : "Enter SMTP Password or App Password"}
                      className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Sender From Email
                  </label>
                  <input
                    type="email"
                    value={emailSettings.smtp_from_email || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_from_email: e.target.value })}
                    placeholder={emailSettings.smtp_user || "orders@yourdomain.com"}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Sender From Name
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_from_name || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_from_name: e.target.value })}
                    placeholder={store?.store_name || "Your Store Name"}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test & Save Actions */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
            {/* Live Test Email */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="Enter test destination email"
                className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {sendingTestEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveEmailSettings}
              disabled={savingEmailSettings}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {savingEmailSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Email Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        {/* Core Store & Business Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business / Store Display Name
            </label>
            <input
              type="text"
              name="store_name"
              value={store?.store_name || ""}
              onChange={handleStoreChange}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Subdomain (Assigned)
            </label>
            <input
              type="text"
              disabled
              value={store?.subdomain || ""}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Category & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Category
            </label>
            <select
              name="category"
              value={profile?.category || "Clothing & Apparel"}
              onChange={handleProfileChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Clothing & Apparel">Clothing & Apparel</option>
              <option value="Footwear & Shoes">Footwear & Shoes</option>
              <option value="Health, Beauty & Cosmetics">Health, Beauty & Cosmetics</option>
              <option value="Electronics & Mobile Accessories">Electronics & Mobile Accessories</option>
              <option value="Grocery, Gourmet & Food">Grocery, Gourmet & Food</option>
              <option value="Home, Living & Kitchen">Home, Living & Kitchen</option>
              <option value="Jewelry & Watches">Jewelry & Watches</option>
              <option value="General Retail">General Retail</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business WhatsApp Profile Name
            </label>
            <input
              type="text"
              name="whatsapp_business_name"
              value={profile?.whatsapp_business_name || ""}
              onChange={handleProfileChange}
              placeholder="e.g. ABC Fashion Support"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Store Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={store?.description || ""}
            onChange={handleStoreChange}
            placeholder="Tell customers about your brand and specialty..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Phone Numbers & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Number (Website)
            </label>
            <input
              type="text"
              name="contact_phone"
              value={store?.contact_phone || ""}
              onChange={handleStoreChange}
              placeholder="Shown on website header"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              WhatsApp Alert Number
            </label>
            <input
              type="text"
              name="whatsapp_number"
              value={profile?.whatsapp_number || store?.contact_phone || ""}
              onChange={handleProfileChange}
              placeholder="+91 9876543210"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Support Email
            </label>
            <input
              type="email"
              name="contact_email"
              value={store?.contact_email || ""}
              onChange={handleStoreChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Business Address & Opening Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Business Address
            </label>
            <textarea
              rows={2}
              name="business_address"
              value={store?.business_address || profile?.address || ""}
              onChange={(e) => {
                handleStoreChange(e);
                handleProfileChange(e);
              }}
              placeholder="Shop/Unit No, Street, City, State, PIN"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Hours
            </label>
            <input
              type="text"
              name="opening_hours"
              value={store?.opening_hours || ""}
              onChange={handleStoreChange}
              placeholder="e.g. Mon - Sat: 9:00 AM - 9:00 PM"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Logistics & Payment Setup Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">Payment Gateway Status: </span>
                <span className="font-semibold text-blue-700">
                  {profile?.has_payment_gateway === "Yes" ? "Configured / Active" : "Assisted (COD Default)"}
                </span>
              </div>
            </div>
            <Link
              href="/app/dashboard/payments"
              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              Configure Razorpay &rarr;
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Delivery Partner Assistance: </span>
              <span className="font-semibold text-blue-700">
                {profile?.needs_delivery_help === "Yes" ? "Assistance Requested" : "Self-Managed Delivery"}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Primary Brand Accent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="primary_color"
                value={store?.primary_color || "#2563EB"}
                onChange={handleStoreChange}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                name="primary_color"
                value={store?.primary_color || "#2563EB"}
                onChange={handleStoreChange}
                className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Secondary Brand Accent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="secondary_color"
                value={store?.secondary_color || "#1E293B"}
                onChange={handleStoreChange}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                name="secondary_color"
                value={store?.secondary_color || "#1E293B"}
                onChange={handleStoreChange}
                className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Store Profile & Settings
          </button>
        </div>
      </form>
    </div>
  );
}
