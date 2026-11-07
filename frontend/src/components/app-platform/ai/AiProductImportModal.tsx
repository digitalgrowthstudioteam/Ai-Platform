"use client";

import React, { useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { AiProductImportPreview } from "@/lib/app-platform/types";
import {
  Sparkles,
  Link as LinkIcon,
  X,
  Check,
  AlertCircle,
  Loader2,
  TrendingUp,
  Tag,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface AiProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCredits: number) => void;
  currentCredits: number;
  onBuyCreditsClick: () => void;
}

export default function AiProductImportModal({
  isOpen,
  onClose,
  onSuccess,
  currentCredits,
  onBuyCreditsClick,
}: AiProductImportModalProps) {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview form state
  const [preview, setPreview] = useState<AiProductImportPreview | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [sellingPrice, setSellingPrice] = useState<number>(499);
  const [mrp, setMrp] = useState<number>(999);
  const [shortDesc, setShortDesc] = useState("");
  const [descHtml, setDescHtml] = useState("");
  const [showRawDescHtml, setShowRawDescHtml] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  // Custom Variant creator state
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPriceDiff, setNewVariantPriceDiff] = useState(0);
  const [newVariantStock, setNewVariantStock] = useState(50);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchVariantsText, setBatchVariantsText] = useState("");

  if (!isOpen) return null;

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please paste a product URL from Amazon, Flipkart, or any e-commerce site.");
      return;
    }
    setError(null);
    setIsExtracting(true);

    try {
      const data = await platformApi.aiImportPreview(url.trim());
      setPreview(data);
      setTitle(data.title || "");
      setCategory(data.category || "General");
      setSellingPrice(data.selling_price || 499);
      setMrp(data.mrp || data.selling_price || 999);
      setShortDesc(data.short_description || "");
      setDescHtml(data.description_html || "");
      setSelectedImages(data.images || []);
      setVariants(data.variants || []);
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to extract product details from this link. Please verify the URL.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyMarkup = (percentage: number) => {
    const markupPrice = Math.round(sellingPrice * (1 + percentage / 100));
    setSellingPrice(markupPrice);
    if (mrp < markupPrice) {
      setMrp(Math.round(markupPrice * 1.3));
    }
  };

  const toggleImage = (imgUrl: string) => {
    if (selectedImages.includes(imgUrl)) {
      if (selectedImages.length === 1) return; // Keep at least 1 image
      setSelectedImages(selectedImages.filter((u) => u !== imgUrl));
    } else {
      setSelectedImages([...selectedImages, imgUrl]);
    }
  };

  // Variant operations
  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleAddCustomVariant = () => {
    if (!newVariantName.trim()) return;
    setVariants([
      ...variants,
      {
        name: newVariantName.trim(),
        sku_suffix: newVariantName.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "VAR",
        price_diff: Number(newVariantPriceDiff) || 0,
        stock: Number(newVariantStock) || 50,
      },
    ]);
    setNewVariantName("");
    setNewVariantPriceDiff(0);
    setNewVariantStock(50);
    setIsAddingVariant(false);
  };

  const handleApplyPreset = (presetType: "shoes" | "clothing" | "colors" | "packs" | "appliances") => {
    let newItems: string[] = [];
    if (presetType === "shoes") {
      newItems = ["6 UK", "7 UK", "8 UK", "9 UK", "10 UK"];
    } else if (presetType === "clothing") {
      newItems = ["S", "M", "L", "XL", "XXL"];
    } else if (presetType === "colors") {
      newItems = ["Black", "White", "Navy Blue", "Grey", "Beige"];
    } else if (presetType === "packs") {
      newItems = ["Single Unit", "Pack of 2", "Pack of 3"];
    } else if (presetType === "appliances") {
      newItems = ["6.5 kg", "7 kg", "8 kg", "10 kg"];
    }

    const existingNames = new Set(variants.map((v) => v.name.toLowerCase()));
    const additions = newItems
      .filter((n) => !existingNames.has(n.toLowerCase()))
      .map((n) => ({
        name: n,
        sku_suffix: n.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
        price_diff: 0,
        stock: 50,
      }));

    if (additions.length > 0) {
      if (variants.length === 1 && variants[0].name.toLowerCase() === "standard") {
        setVariants(additions);
      } else {
        setVariants([...variants, ...additions]);
      }
    }
  };

  const handleBatchAdd = () => {
    if (!batchVariantsText.trim()) return;
    const items = batchVariantsText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const existingNames = new Set(variants.map((v) => v.name.toLowerCase()));
    const additions = items
      .filter((n) => !existingNames.has(n.toLowerCase()))
      .map((n) => ({
        name: n,
        sku_suffix: n.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
        price_diff: 0,
        stock: 50,
      }));

    if (additions.length > 0) {
      if (variants.length === 1 && variants[0].name.toLowerCase() === "standard") {
        setVariants(additions);
      } else {
        setVariants([...variants, ...additions]);
      }
    }
    setBatchVariantsText("");
    setIsBatchOpen(false);
  };

  const handleConfirmImport = async () => {
    if (currentCredits < 3) {
      setError("Insufficient AI credits. 3 credits are required to import and publish a product.");
      return;
    }
    setError(null);
    setIsImporting(true);

    try {
      const res = await platformApi.aiImportConfirm({
        source_url: preview?.source_url || url,
        title: title.trim(),
        category_name: category.trim(),
        selling_price: Number(sellingPrice),
        mrp: Number(mrp),
        short_description: shortDesc,
        description_html: descHtml,
        images: selectedImages,
        variants: variants,
      });

      onSuccess(res.remaining_credits);
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish product.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setUrl("");
    setStep("input");
    setPreview(null);
    setError(null);
    setIsAddingVariant(false);
    setIsBatchOpen(false);
    setShowRawDescHtml(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-blue-50/60 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">AI 1-Click Product Importer</h3>
              </div>
              <p className="text-xs text-slate-500">
                Paste any link from Amazon, Flipkart, Meesho or Shopify to auto-create listings
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credit Indicator Pill */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Your Balance:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {currentCredits} Credits
            </span>
            <span className="text-slate-400">• (3 credits per import)</span>
          </div>
          {currentCredits < 3 && (
            <button
              onClick={onBuyCreditsClick}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              + Buy Credits
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Input URL */}
        {step === "input" && (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Product Link / URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. https://www.amazon.in/dp/B08L5WHFT9 or https://flipkart.com/..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetch();
                  }}
                />
              </div>
            </div>

            {/* Supported Platforms Badges */}
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-2">Tested & fully supported platforms:</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {["Amazon India", "Flipkart", "Meesho", "Shopify Stores", "WooCommerce", "Generic D2C"].map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200/60"
                  >
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Features Highlight */}
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-xs text-blue-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-blue-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                What the AI Importer extracts & optimizes:
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 text-[11px]">
                <li>✨ Extracts full descriptions, specifications & highlights</li>
                <li>✨ Re-writes titles cleanly for high mobile conversion</li>
                <li>✨ Fetches full-size uncompressed master photos</li>
                <li>✨ Automatically detects all sizes (6 UK - 10 UK / S - XXL)</li>
                <li>✨ Automatically detects color variants (Black, Grey, Blue)</li>
                <li>✨ Lets you create & customize any variants with 1 click</li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExtracting || !url.trim()}
                onClick={handleFetch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Descriptions, Variants & Photos (takes ~3s)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Fetch & Generate Listing
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Customization */}
        {step === "preview" && preview && (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category & Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (₹)</label>
                <input
                  type="number"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Profit Margin Markup */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Quick Markup Calculator:
              </span>
              <div className="flex gap-1.5">
                {[10, 20, 30, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyMarkup(pct)}
                    className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Images selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">
                  Extracted Product Images ({selectedImages.length} selected)
                </label>
                <span className="text-[11px] text-slate-400">Click to select/deselect</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {preview.images.map((imgUrl, i) => {
                  const isSelected = selectedImages.includes(imgUrl);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleImage(imgUrl)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-600 shadow-xs ring-2 ring-blue-100"
                          : "border-slate-200 opacity-40 hover:opacity-80"
                      }`}
                    >
                      <img src={imgUrl} alt={`Product ${i}`} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Description & Highlights */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Product Description & Highlights
                </label>
                <button
                  type="button"
                  onClick={() => setShowRawDescHtml(!showRawDescHtml)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  {showRawDescHtml ? "Show Formatted Preview" : "Edit HTML"}
                </button>
              </div>

              {showRawDescHtml ? (
                <textarea
                  rows={6}
                  value={descHtml}
                  onChange={(e) => setDescHtml(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="HTML description with bullet points and specs..."
                />
              ) : (
                <div
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-700 max-h-48 overflow-y-auto prose prose-xs"
                  dangerouslySetInnerHTML={{ __html: descHtml || "<p class='text-slate-400 italic'>No description generated.</p>" }}
                />
              )}
            </div>

            {/* Variants Section (Sizes & Colors) */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Product Variants, Sizes & Colors ({variants.length})
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Review extracted variants or add your own custom sizes and color options.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingVariant(!isAddingVariant)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    + Add Variant
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBatchOpen(!isBatchOpen)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    ⚡ Batch Sizes/Colors
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px]">
                <span className="text-slate-500 font-medium mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("shoes")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  👟 Footwear (6 UK – 10 UK)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("clothing")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  👕 Apparel (S – XXL)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("colors")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  🎨 Colors (Black, White, Navy, Grey)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("appliances")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  ⚖️ Capacity (6.5 – 10 kg)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("packs")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  📦 Packs (1, 2, 3)
                </button>
              </div>

              {/* Batch Add Input Box */}
              {isBatchOpen && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
                  <label className="text-[11px] font-semibold text-indigo-900 block">
                    Enter sizes or colors separated by commas:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={batchVariantsText}
                      onChange={(e) => setBatchVariantsText(e.target.value)}
                      placeholder="e.g. 6 UK, 7 UK, 8 UK, 9 UK, 10 UK or Red, Blue, Green, Yellow"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBatchAdd();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleBatchAdd}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                    >
                      Add All
                    </button>
                  </div>
                </div>
              )}

              {/* Add Single Variant Box */}
              {isAddingVariant && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-800">Create New Variant:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      placeholder="Name (e.g. Black / 8 UK)"
                      className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <input
                      type="number"
                      value={newVariantPriceDiff}
                      onChange={(e) => setNewVariantPriceDiff(Number(e.target.value))}
                      placeholder="Price Diff (₹)"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <input
                      type="number"
                      value={newVariantStock}
                      onChange={(e) => setNewVariantStock(Number(e.target.value))}
                      placeholder="Stock"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingVariant(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomVariant}
                      disabled={!newVariantName.trim()}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      Save Variant
                    </button>
                  </div>
                </div>
              )}

              {/* Variant Table / List */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 text-xs hover:bg-slate-50/60 gap-3">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleUpdateVariant(i, "name", e.target.value)}
                        className="w-full px-2 py-1 rounded-md border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs font-medium text-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <span>Price:</span>
                        <span className="font-semibold text-slate-900">₹{sellingPrice + (v.price_diff || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <span>Stock:</span>
                        <input
                          type="number"
                          value={v.stock ?? 50}
                          onChange={(e) => handleUpdateVariant(i, "stock", Number(e.target.value))}
                          className="w-16 px-1.5 py-0.5 rounded-md border border-slate-200 text-center text-[11px] font-semibold text-slate-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(i)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete variant"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                ← Back to Link
              </button>

              <button
                type="button"
                disabled={isImporting || currentCredits < 3}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Product & Staging Photos...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Import & Publish (3 Credits)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
