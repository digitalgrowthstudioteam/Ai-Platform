"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Sliders,
  Award,
  Zap,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  type: "single" | "multi";
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "What type of advertising describes your business?",
    type: "single",
    options: [
      "Ecommerce / Products",
      "Lead Generation",
      "Local Business",
      "SaaS / Software",
      "Education",
      "Services",
      "Other",
    ],
  },
  {
    id: "q2",
    question: "What is your primary conversion objective?",
    type: "single",
    options: [
      "Get Sales",
      "Generate Leads",
      "Website Conversions",
      "WhatsApp Enquiries",
      "App Installs",
      "Brand Awareness",
    ],
  },
  {
    id: "q3",
    question: "What is your monthly Meta Ads budget?",
    type: "single",
    options: [
      "Under ₹25,000",
      "₹25,000 – ₹50,000",
      "₹50,000 – ₹1 Lakh",
      "₹1 Lakh – ₹5 Lakhs",
      "₹5 Lakhs – ₹10 Lakhs",
      "₹10 Lakhs+",
    ],
  },
  {
    id: "q4",
    question: "How long have you been active on Meta Ads?",
    type: "single",
    options: [
      "I'm just starting",
      "Less than 3 months",
      "3–6 months",
      "6–12 months",
      "More than 1 year",
    ],
  },
  {
    id: "q5",
    question: "What is your single biggest bottleneck right now?",
    type: "single",
    options: [
      "CPL / CPA is too high",
      "Not getting enough leads",
      "Sales are low",
      "ROAS is poor",
      "Ads are becoming expensive",
      "I don't know which campaigns to stop",
      "I don't know where to increase budget",
      "Results are inconsistent",
    ],
  },
  {
    id: "q6",
    question: "How many active campaigns are you currently running?",
    type: "single",
    options: ["None", "1–3", "4–10", "11–25", "25+"],
  },
  {
    id: "q7",
    question: "How frequently do you make optimization edits?",
    type: "single",
    options: [
      "Every day",
      "A few times a week",
      "Once a week",
      "Occasionally",
      "Almost never",
    ],
  },
  {
    id: "q8",
    question: "What do you usually optimize when reviewing metrics?",
    type: "multi",
    options: [
      "Daily budgets",
      "Audience parameters",
      "Creative assets",
      "Placements",
      "Ad sets structure",
      "I'm not sure",
    ],
  },
  {
    id: "q9",
    question: "What is your biggest concern with your Meta Ads performance?",
    type: "single",
    options: [
      "Wasting ad budget",
      "Scaling limitations",
      "Creative fatigue",
      "Audience saturation",
      "Reducing lead/sale costs",
      "Understanding analytics",
    ],
  },
  {
    id: "q10",
    question: "What would you most like to discover from this assessment?",
    type: "single",
    options: [
      "Which campaigns to scale",
      "Which ads are wasting money",
      "How to reduce acquisition cost",
      "How to distribute budget",
      "Audience growth options",
    ],
  },
];

export default function RecommendationPage() {
  const { user, loginWithGoogle, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authError, setAuthError] = useState("");

  // Log funnel event on mount
  useEffect(() => {
    api.logFunnelEvent("recommendation_started").catch(() => {});
  }, []);

  // Listen to keyboard inputs for navigation
  useEffect(() => {
    if (currentStep >= QUESTIONS.length || result) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const q = QUESTIONS[currentStep];

      // Handle Backspace to go back
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBack();
        return;
      }

      // Handle number keys for options selection
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= q.options.length) {
        e.preventDefault();
        const selectedOption = q.options[num - 1];
        if (q.type === "single") {
          handleSelectSingle(selectedOption);
        } else {
          toggleMultiSelect(selectedOption);
        }
      }

      // Handle Enter key for multi-select confirmation
      if (e.key === "Enter" && q.type === "multi") {
        e.preventDefault();
        const currentSelected = answers[q.id] || [];
        if (currentSelected.length > 0) {
          handleNextStep();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, answers, result]);

  const handleSelectSingle = (val: string) => {
    const q = QUESTIONS[currentStep];
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);
    
    // Log event for slide progression
    api.logFunnelEvent("recommendation_step_completed", { step: currentStep + 1, question_id: q.id }).catch(() => {});

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completed last question
      setCurrentStep(QUESTIONS.length);
    }
  };

  const toggleMultiSelect = (val: string) => {
    const q = QUESTIONS[currentStep];
    const currentSelected: string[] = answers[q.id] || [];
    let updated: string[];

    if (val === "I'm not sure") {
      updated = ["I'm not sure"];
    } else {
      updated = currentSelected.filter((item) => item !== "I'm not sure");
      if (updated.includes(val)) {
        updated = updated.filter((item) => item !== val);
      } else {
        updated.push(val);
      }
    }

    setAnswers({ ...answers, [q.id]: updated });
  };

  const handleNextStep = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(QUESTIONS.length);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Triggers Firebase Google Auth and submits answers post-login
  const handleSaveAndSubmit = async () => {
    setAuthError("");
    setSubmitting(true);
    try {
      if (!isAuthenticated) {
        await loginWithGoogle();
      }
    } catch (e: any) {
      setAuthError(e.message || "Google authentication failed.");
      setSubmitting(false);
      return;
    }
  };

  // Trigger submission automatically when user authenticates
  useEffect(() => {
    if (isAuthenticated && currentStep === QUESTIONS.length && !result && !submitting) {
      const submit = async () => {
        setSubmitting(true);
        try {
          const res = await api.submitRecommendation(answers);
          setResult(res);
        } catch (err) {
          console.error("Failed to submit recommendations:", err);
        } finally {
          setSubmitting(false);
        }
      };
      submit();
    }
  }, [isAuthenticated, currentStep, answers, result, submitting]);

  // Renders options index indicator
  const getIndexLabel = (idx: number) => {
    return (
      <span className="inline-flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 rounded-md w-5 h-5 text-[10px] font-bold mr-2.5 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition">
        {idx + 1}
      </span>
    );
  };

  const currentQuestion = QUESTIONS[currentStep];
  const progressPercent = Math.min(((currentStep + 1) / QUESTIONS.length) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-extrabold text-sm tracking-tight">Digital Growth Studio</span>
          </Link>
          <div className="text-xs font-semibold text-slate-500">
            Funnel • Strategy Audit
          </div>
        </div>
      </header>

      {/* QUESTIONNAIRE BODY */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        {result ? (
          /* RESULT SCREEN */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-3">
              <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-full w-fit mx-auto border border-emerald-200">
                <Award size={36} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">Your Strategy Readiness Report</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Based on your campaign profile, we have calculated your conversion setup readiness score and key operational priorities.
              </p>
            </div>

            {/* Strategy Readiness Score gauge */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center max-w-sm mx-auto text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Strategy Readiness Score</div>
              <div className="text-5xl font-black text-blue-600 flex items-baseline gap-1">
                <span>{result.score}</span>
                <span className="text-base font-bold text-slate-400">/ 100</span>
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                <Zap size={13} />
                <span>{result.score >= 80 ? "Conversion Ready" : result.score >= 60 ? "Requires Tuning" : "Critical Optimization Needed"}</span>
              </div>
            </div>

            {/* Strategic Priorities */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders size={18} className="text-blue-600" />
                <span>Your Core Strategic Priorities</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {result.priorities.map((rec: any, idx: number) => (
                  <div key={idx} className="border border-slate-100 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                          Priority {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {rec.type.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.priority === "HIGH" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base">{rec.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.recommendation}</p>
                    <div className="pt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded w-fit">
                      <CheckCircle size={12} />
                      <span><b>Expected Outcome:</b> {rec.expected_impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to action (Go to Health Check) */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-semibold text-slate-500 text-center sm:text-left">
                Next Step: Audit your actual campaign performance metrics.
              </div>
              <Link
                href="/health-check"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
              >
                <span>Run Free Ads Health Check</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : currentStep === QUESTIONS.length ? (
          /* MID-FLOW GOOGLE LOGIN GATE */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-full w-fit mx-auto border border-blue-100">
              <Sparkles size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Save Your Strategy Audit</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Connect your account via Google to save your answers, view your readiness score, and identify key recommendations.
              </p>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-700 border border-red-200 text-xs px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={handleSaveAndSubmit}
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-3 disabled:opacity-55 cursor-pointer shadow-md"
            >
              {submitting ? (
                <span>Generating recommendations...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.808 0-8.73-3.83-8.73-8.519 0-4.69 3.922-8.519 8.73-8.519 2.062 0 3.93.753 5.4 2.191l3.203-3.21C18.66 1.83 15.65 0 12.24 0 5.48 0 0 5.373 0 12s5.48 12 12.24 12c6.26 0 11.24-4.337 11.24-11.114 0-.66-.06-1.3-.18-1.886H12.24z" />
                  </svg>
                  <span>Log In with Google</span>
                </>
              )}
            </button>
            <button
              onClick={() => setCurrentStep(QUESTIONS.length - 1)}
              disabled={submitting}
              className="text-xs text-slate-400 hover:text-slate-600 transition font-semibold"
            >
              Modify Answers
            </button>
          </div>
        ) : (
          /* QUESTIONS SLIDER INTERFACE */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-8 min-h-[450px] flex flex-col justify-between animate-in fade-in slide-in-from-right duration-300">
            <div className="space-y-4">
              {/* Stepper progress */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>QUESTION {currentStep + 1} OF {QUESTIONS.length}</span>
                <span>{Math.round(progressPercent)}% COMPLETE</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Question title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight pt-3">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Options grid */}
            {currentQuestion.type === "single" ? (
              <div className="grid grid-cols-1 gap-3.5 pt-4">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSingle(opt)}
                    className="flex items-center text-left border border-slate-200 hover:border-blue-600 p-4 rounded-2xl hover:bg-blue-50/20 transition group text-sm font-bold text-slate-800 cursor-pointer"
                  >
                    {getIndexLabel(idx)}
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-3.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const currentSelected = answers[currentQuestion.id] || [];
                    const isSelected = currentSelected.includes(opt);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleMultiSelect(opt)}
                        className={`flex items-center text-left border p-4 rounded-2xl transition group text-sm font-bold cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/30 text-blue-700"
                            : "border-slate-200 hover:border-blue-600 text-slate-800 hover:bg-blue-50/20"
                        }`}
                      >
                        {getIndexLabel(idx)}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={handleNextStep}
                  disabled={!(answers[currentQuestion.id] || []).length}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md"
                >
                  <span>Confirm Selection</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Navigation instructions footer */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pt-4 border-t border-slate-100 flex-wrap gap-2">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-1 hover:text-slate-600 transition disabled:opacity-30 font-bold"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
              <div className="hidden sm:inline-flex items-center gap-2">
                <span>Press</span>
                <kbd className="bg-slate-100 border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 font-mono text-[10px]">1-{currentQuestion.options.length}</kbd>
                <span>to select</span>
                <span className="mx-1">•</span>
                <kbd className="bg-slate-100 border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 font-mono text-[10px]">Backspace</kbd>
                <span>to go back</span>
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
