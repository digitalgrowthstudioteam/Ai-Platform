"use client";

import React, { useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  Loader2,
  Wand2,
  Download,
  CheckCircle2,
  Camera,
  Layers,
} from "lucide-react";

interface AiImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  productId?: string;
  currentCredits: number;
  onSuccess: (enhancedUrl: string, remainingCredits: number) => void;
  onBuyCreditsClick: () => void;
}

const STUDIO_STYLES = [
  {
    id: "studio-white",
    name: "Studio White",
    description: "Pure #FFFFFF marketplace-compliant with soft grounded shadow",
    previewColor: "bg-white border-slate-300 text-slate-800",
    badge: "Amazon/Google Standard",
  },
  {
    id: "minimal-marble",
    name: "Minimal Marble",
    description: "Luxury Italian Carrara marble pedestal with soft lighting",
    previewColor: "bg-slate-100 border-slate-300 text-slate-800",
    badge: "Luxury Aesthetic",
  },
  {
    id: "modern-pastel",
    name: "Modern Pastel",
    description: "Warm cream & linen ambient gradient for contemporary D2C brands",
    previewColor: "bg-amber-50 border-amber-200 text-amber-900",
    badge: "Trending D2C",
  },
  {
    id: "luxury-dark",
    name: "Luxury Dark",
    description: "Matte obsidian slate with focused center spotlight beam",
    previewColor: "bg-slate-900 border-slate-800 text-white",
    badge: "Flagship Edition",
  },
];

export default function AiImageStudioModal({
  isOpen,
  onClose,
  imageUrl,
  productId,
  currentCredits,
  onSuccess,
  onBuyCreditsClick,
}: AiImageStudioModalProps) {
  const [selectedStyle, setSelectedStyle] = useState("studio-white");
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnhance = async () => {
    if (currentCredits < 5) {
      setError("Insufficient AI credits. You need 5 credits for AI Studio Photo Redesign.");
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      const res = await platformApi.aiImageStudio({
        image_url: imageUrl,
        style: selectedStyle,
        product_id: productId,
      });

      setEnhancedUrl(res.enhanced_image_url);
      onSuccess(res.enhanced_image_url, res.remaining_credits);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setEnhancedUrl(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-purple-50/60 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">AI Image Studio</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-full">
                  1-Click Redesign
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Replace messy backgrounds with luxury studio lighting & ground shadows
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

        {/* Credit Indicator */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Your Balance:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {currentCredits} Credits
            </span>
            <span className="text-slate-400">• (5 credits per studio redesign)</span>
          </div>
          {currentCredits < 5 && (
            <button
              onClick={onBuyCreditsClick}
              className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer"
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

        <div className="p-6 space-y-6">
          {/* Before & After Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Original Image */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1.5">Original Photo</span>
              <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-2">
                <img src={imageUrl} alt="Original" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            </div>

            {/* Enhanced Studio Image */}
            <div>
              <span className="block text-xs font-semibold text-purple-700 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                {enhancedUrl ? "Enhanced Studio Result" : "Studio Preview"}
              </span>
              <div className="aspect-square rounded-xl overflow-hidden border-2 border-purple-200 bg-purple-50/30 flex items-center justify-center p-2 relative">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-purple-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-semibold">Generating 3D Studio Lighting...</span>
                  </div>
                ) : enhancedUrl ? (
                  <img src={enhancedUrl} alt="Enhanced" className="max-w-full max-h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center p-4 text-slate-400">
                    <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Select a studio aesthetic below and click Generate</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Style Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Choose Studio Aesthetic Backdrop
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STUDIO_STYLES.map((st) => {
                const isSelected = selectedStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStyle(st.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/50 shadow-xs ring-2 ring-purple-100"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 mb-1">
                      {st.badge}
                    </span>
                    <p className="text-xs font-bold text-slate-900">{st.name}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {st.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {enhancedUrl && (
                <a
                  href={enhancedUrl}
                  download="studio_product.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              )}

              <button
                type="button"
                disabled={isProcessing || currentCredits < 5}
                onClick={handleEnhance}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transforming...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {enhancedUrl ? "Re-generate (5 Credits)" : "Redesign Photo (5 Credits)"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
