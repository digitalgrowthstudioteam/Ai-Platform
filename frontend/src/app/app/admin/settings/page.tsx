"use client";

import React, { useState } from "react";
import { Sliders, Save, Check, Globe, Shield, Mail } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platform_name: "Digital Growth Studio",
    subdomain_suffix: ".digitalgrowthstudio.in",
    support_email: "support@digitalgrowthstudio.in",
    default_storage_mb: "1024",
    allow_public_registrations: true,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
        <p className="text-sm text-slate-500">Configure global SaaS multi-vendor defaults, domains, and operational parameters</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          Platform settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Platform Brand Name
          </label>
          <input
            type="text"
            value={settings.platform_name}
            onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Store Subdomain Suffix
          </label>
          <div className="flex rounded-xl shadow-xs">
            <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={settings.subdomain_suffix}
              onChange={(e) => setSettings({ ...settings, subdomain_suffix: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Platform Operations Email
          </label>
          <div className="flex rounded-xl shadow-xs">
            <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">
              <Mail className="w-3.5 h-3.5" />
            </span>
            <input
              type="email"
              value={settings.support_email}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Allow Public Vendor Registration</span>
            <span className="text-[11px] text-slate-500">Enable new store owners to register through /app/register</span>
          </div>
          <input
            type="checkbox"
            checked={settings.allow_public_registrations}
            onChange={(e) => setSettings({ ...settings, allow_public_registrations: e.target.checked })}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
}

