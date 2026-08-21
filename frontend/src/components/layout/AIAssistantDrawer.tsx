"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  X, 
  Send, 
  MessageSquare, 
  Trash2, 
  PlusCircle, 
  Bot, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from "lucide-react";

export default function AIAssistantDrawer() {
  const router = useRouter();
  const { selectedAccount } = useAdAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [creditsBreakdown, setCreditsBreakdown] = useState<{
    monthly_credits_remaining: number;
    purchased_credits_remaining: number;
    trial_credits_remaining: number;
    monthly_credits_limit: number;
    monthly_credits_used: number;
  } | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Dynamic context selector metadata states
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const [selectedScope, setSelectedScope] = useState<"account" | "campaign" | "adset" | "ad">("account");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdSetId, setSelectedAdSetId] = useState<string>("");
  const [selectedAdId, setSelectedAdId] = useState<string>("");
  
  // Input and UI loading states
  const [inputValue, setInputValue] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested prompts
  const suggestedPrompts = [
    "Why did my CPL change?",
    "Which campaign is performing best?",
    "Which ad is wasting money?",
    "What should I optimize today?",
    "Give me a quick account performance summary."
  ];

  // 1. Listen for toggle event
  useEffect(() => {
    const handleToggle = () => setIsOpen(open => !open);
    window.addEventListener("toggle-ai-assistant", handleToggle);
    return () => window.removeEventListener("toggle-ai-assistant", handleToggle);
  }, []);

  // 2. Fetch credits and conversations when drawer opens or selectedAccount changes
  const fetchCreditsAndConvos = async () => {
    if (!selectedAccount?.id) return;
    setLoadingConvos(true);
    setErrorMsg(null);
    try {
      setLoadingMetadata(true);
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];

      // Fetch credits, conversations, and account metadata (campaigns, adsets, ads) concurrently
      const [credRes, convos, campsList, adSetsList, adsList] = await Promise.all([
        api.getAiCredits(),
        api.getConversations(selectedAccount.id),
        api.getCampaigns(selectedAccount.id, start, end).catch(() => []),
        api.getAdSets(selectedAccount.id, start, end).catch(() => []),
        api.getAds(selectedAccount.id, start, end).catch(() => []),
      ]);

      setCredits(credRes.credits);
      setCreditsBreakdown({
        monthly_credits_remaining: credRes.monthly_credits_remaining,
        purchased_credits_remaining: credRes.purchased_credits_remaining,
        trial_credits_remaining: credRes.trial_credits_remaining,
        monthly_credits_limit: credRes.monthly_credits_limit,
        monthly_credits_used: credRes.monthly_credits_used,
      });

      setConversations(convos);
      setCampaigns(campsList || []);
      setAdSets(adSetsList || []);
      setAds(adsList || []);

      if (convos.length > 0) {
        // Automatically load the latest conversation if none is active
        if (!activeConvoId) {
          setActiveConvoId(convos[0].id);
          await loadMessages(convos[0].id);
        }
      } else {
        // No past conversations, reset states
        setActiveConvoId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load AI Assistant details:", e);
      setErrorMsg("Failed to load assistant history.");
    } finally {
      setLoadingConvos(false);
      setLoadingMetadata(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCreditsAndConvos();
    }
  }, [isOpen, selectedAccount?.id]);

  // Handle ad account switching context boundaries
  useEffect(() => {
    // If account switches, close history list and clean history states
    setActiveConvoId(null);
    setMessages([]);
    setShowHistoryDropdown(false);
    setSelectedScope("account");
    setSelectedCampaignId("");
    setSelectedAdSetId("");
    setSelectedAdId("");
  }, [selectedAccount?.id]);

  // Load message logs of a specific conversation
  const loadMessages = async (convoId: string) => {
    setLoadingMessages(true);
    setErrorMsg(null);
    try {
      const msgs = await api.getMessages(convoId);
      setMessages(msgs);
      scrollToBottom();
    } catch (e) {
      console.error("Failed to load messages:", e);
      setErrorMsg("Failed to load chat history.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  // Create a new conversation session
  const startNewConversation = async () => {
    if (!selectedAccount?.id) return;
    setLoadingMessages(true);
    setErrorMsg(null);
    try {
      const convo = await api.createConversation(selectedAccount.id, "New Chat Session");
      setActiveConvoId(convo.id);
      setMessages([]);
      setConversations(prev => [convo, ...prev]);
      setShowHistoryDropdown(false);
    } catch (e) {
      console.error("Failed to create conversation:", e);
      setErrorMsg("Failed to create new session.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (convoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convoId);
      setConversations(prev => prev.filter(c => c.id !== convoId));
      if (activeConvoId === convoId) {
        setActiveConvoId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending || !selectedAccount?.id) return;
    
    // Check credits locally before calling Gemini
    if (credits <= 0) {
      setErrorMsg("You've used all your AI Credits. Please upgrade your plan or top up to continue.");
      return;
    }

    // Dynamic Context Scoping Validations
    if (selectedScope === "campaign" && !selectedCampaignId) {
      setErrorMsg("Please select a Campaign first.");
      return;
    }
    if (selectedScope === "adset" && (!selectedCampaignId || !selectedAdSetId)) {
      setErrorMsg("Please select a Campaign and an Ad Set first.");
      return;
    }
    if (selectedScope === "ad" && (!selectedCampaignId || !selectedAdSetId || !selectedAdId)) {
      setErrorMsg("Please select a Campaign, Ad Set, and Ad first.");
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    // Optimistically update message state for user bubble
    const userBubble = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userBubble]);
    setInputValue("");
    scrollToBottom();

    // Ensure we have a conversation ID. If not, create one dynamically first!
    let targetConvoId = activeConvoId;
    try {
      if (!targetConvoId) {
        const convo = await api.createConversation(selectedAccount.id, text.slice(0, 30));
        targetConvoId = convo.id;
        setActiveConvoId(convo.id);
        setConversations(prev => [convo, ...prev]);
      }

      // Send to backend
      const res = await api.sendAssistantMessage(
        targetConvoId!, 
        text, 
        selectedAccount.id,
        selectedScope === "campaign" || selectedScope === "adset" || selectedScope === "ad" ? selectedCampaignId : null,
        selectedScope === "adset" || selectedScope === "ad" ? selectedAdSetId : null,
        selectedScope === "ad" ? selectedAdId : null
      );
      
      // Update assistant response bubble
      const modelBubble = {
        id: Math.random().toString(),
        role: "model",
        content: res.content,
        created_at: new Date().toISOString(),
        gemini_status: "success"
      };
      setMessages(prev => [...prev, modelBubble]);
      setCredits(res.credits_remaining);
      
      // Refresh credits breakdown
      try {
        const credRes = await api.getAiCredits();
        setCredits(credRes.credits);
        setCreditsBreakdown({
          monthly_credits_remaining: credRes.monthly_credits_remaining,
          purchased_credits_remaining: credRes.purchased_credits_remaining,
          trial_credits_remaining: credRes.trial_credits_remaining,
          monthly_credits_limit: credRes.monthly_credits_limit,
          monthly_credits_used: credRes.monthly_credits_used,
        });
      } catch (creditsErr) {
        console.warn("Failed to refresh credits breakdown:", creditsErr);
      }

      // Refresh conversations list to update title if it was changed
      const updatedConvos = await api.getConversations(selectedAccount.id);
      setConversations(updatedConvos);

      scrollToBottom();
    } catch (err: any) {
      console.error("Failed to send message:", err);
      // Remove optimistic bubble and show error
      setMessages(prev => prev.filter(m => m.id !== userBubble.id));
      
      const detail = err.response?.data?.detail || "I couldn't generate a response right now. Please try again.";
      setErrorMsg(detail);
    } finally {
      setIsSending(false);
    }
  };

  // Clickable links parser for meta entities
  const parseMessageContent = (text: string) => {
    const regex = /\[([^\]]+)\]\(entity:([^:]+):([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, name, type, id] = match;
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex));
      }

      parts.push(
        <button
          key={id + "-" + matchIndex}
          onClick={() => {
            setIsOpen(false); // Auto-close drawer on navigation
            if (type === "campaign") {
              router.push(`/campaigns/${id}`);
            } else if (type === "adset") {
              router.push(`/campaigns?as=${id}`);
            } else if (type === "ad") {
              router.push(`/campaigns?ad=${id}`);
            }
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded text-[11px] font-bold text-blue-400 hover:text-blue-300 transition my-0.5"
        >
          <span>🤖 {name}</span>
        </button>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998] transition-opacity duration-300"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-[440px] bg-slate-950 border-l border-slate-800 text-slate-100 flex flex-col z-[9999] shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col gap-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400">
                <Bot size={18} />
              </div>
              <h2 className="text-base font-black tracking-tight">AI Assistant</h2>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs mt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Connected Account</span>
              <span className="text-slate-300 font-semibold truncate max-w-[200px]">
                {selectedAccount?.name || "No Account Selected"}
              </span>
            </div>
            <div className="text-right flex flex-col relative group cursor-pointer z-50">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Credits</span>
              <span className={`font-bold flex items-center justify-end gap-1 ${credits > 0 ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`}>
                {credits} remaining
                <span className="text-[9px] text-slate-500">▼</span>
              </span>
              
              {/* Dropdown breakdown info card on hover */}
              {creditsBreakdown && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl text-left pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-[10000]">
                  <div className="text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1.5 mb-2">Credit Breakdown</div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Included Limit</span>
                      <span className="font-semibold">{creditsBreakdown.monthly_credits_limit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Included Remaining</span>
                      <span className="font-semibold text-emerald-400">{creditsBreakdown.monthly_credits_remaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Purchased (No Expiry)</span>
                      <span className="font-semibold text-sky-400">{creditsBreakdown.purchased_credits_remaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Free Trial Remaining</span>
                      <span className="font-semibold text-amber-400">{creditsBreakdown.trial_credits_remaining}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5 font-bold text-white">
                      <span>Total Available</span>
                      <span className="text-emerald-400">{credits}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toggle History Dropdown */}
          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/60 justify-between items-center">
            <button
              onClick={() => setShowHistoryDropdown(prev => !prev)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded-md transition"
            >
              <MessageSquare size={12} />
              <span>Chat History</span>
            </button>

            <button
              onClick={startNewConversation}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 hover:bg-blue-500/5 border border-blue-500/10 rounded-md transition"
            >
              <PlusCircle size={12} />
              <span>New Chat</span>
            </button>
          </div>

          {/* History Dropdown List */}
          {showHistoryDropdown && (
            <div className="absolute top-[135px] left-4 right-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 max-h-[300px] overflow-y-auto">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1">Recent Chats</div>
              {conversations.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 text-center">No past chats in this account.</div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveConvoId(c.id);
                      loadMessages(c.id);
                      setShowHistoryDropdown(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs hover:bg-slate-800 transition ${
                      activeConvoId === c.id ? "bg-slate-800 text-white font-bold" : "text-slate-400"
                    }`}
                  >
                    <span className="truncate pr-2 max-w-[280px]">{c.title}</span>
                    <button 
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="text-slate-500 hover:text-rose-500 p-1 rounded-md"
                    >
                      <Trash2 size={12} />
                    </button>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Context Selector Section */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Analysis Focus</span>
            
            {/* Scope Selection Tabs */}
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {(["account", "campaign", "adset", "ad"] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => {
                    setSelectedScope(scope);
                    setErrorMsg(null);
                    // Clear lower dependent levels
                    if (scope === "account") {
                      setSelectedCampaignId("");
                      setSelectedAdSetId("");
                      setSelectedAdId("");
                    } else if (scope === "campaign") {
                      setSelectedAdSetId("");
                      setSelectedAdId("");
                    } else if (scope === "adset") {
                      setSelectedAdId("");
                    }
                  }}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                    selectedScope === scope 
                      ? "bg-blue-600 text-white shadow-xs" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {scope === "account" ? "Account" : scope === "campaign" ? "Campaign" : scope === "adset" ? "Ad Set" : "Ad"}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic selector lists */}
          {selectedScope !== "account" && (
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              {/* Campaign Dropdown */}
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Select Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => {
                    setSelectedCampaignId(e.target.value);
                    setSelectedAdSetId("");
                    setSelectedAdId("");
                    setErrorMsg(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 font-medium focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Campaign --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Ad Set Dropdown */}
              {(selectedScope === "adset" || selectedScope === "ad") && (
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Select Ad Set</label>
                  <select
                    disabled={!selectedCampaignId}
                    value={selectedAdSetId}
                    onChange={(e) => {
                      setSelectedAdSetId(e.target.value);
                      setSelectedAdId("");
                      setErrorMsg(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 font-medium focus:outline-hidden focus:border-blue-500 disabled:opacity-40 cursor-pointer"
                  >
                    <option value="">-- Choose Ad Set --</option>
                    {adSets
                      .filter((s) => !selectedCampaignId || s.campaign_id === selectedCampaignId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Ad Dropdown */}
              {selectedScope === "ad" && (
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Select Ad</label>
                  <select
                    disabled={!selectedAdSetId}
                    value={selectedAdId}
                    onChange={(e) => {
                      setSelectedAdId(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 font-medium focus:outline-hidden focus:border-blue-500 disabled:opacity-40 cursor-pointer"
                  >
                    <option value="">-- Choose Ad --</option>
                    {ads
                      .filter((ad) => !selectedAdSetId || ad.ad_set_id === selectedAdSetId)
                      .map((ad) => (
                        <option key={ad.id} value={ad.id}>{ad.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Logs Window */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-950 scrollbar-thin select-text">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2 text-xs">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loadingMessages ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw size={24} className="animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty Chat / Suggested Pills */
            <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-6">
              <div className="mx-auto w-12 h-12 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                <Bot size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Ask anything about this account</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                  Get instant insight about campaign performance, low conversion adsets, budget scale triggers, or recommendations.
                </p>
              </div>

              <div className="w-full space-y-2 pt-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Suggested Questions</div>
                <div className="flex flex-col gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-xs text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition leading-relaxed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div 
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser 
                      ? "bg-blue-600 text-white rounded-tr-none font-medium" 
                      : "bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none font-normal"
                  }`}>
                    {/* Render message parse details */}
                    <div className="whitespace-pre-line">
                      {isUser ? m.content : parseMessageContent(m.content)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-blue-500" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSending || credits <= 0}
              placeholder={credits <= 0 ? "You've used all your AI Credits." : "Ask me anything about this ad account..."}
              className="flex-grow bg-slate-900 hover:bg-slate-900/80 focus:bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
            
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending || credits <= 0}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </form>

          {credits <= 0 && (
            <div className="text-[10px] text-center text-rose-500 mt-1">
              Top up your AI Credits inside the Billing panel to resume chatting.
            </div>
          )}
        </div>

      </div>
    </>
  );
}
