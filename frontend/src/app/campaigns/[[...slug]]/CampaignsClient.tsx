"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  Calendar, 
  Megaphone, 
  Loader2, 
  Layers, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Check, 
  MapPin, 
  AlertCircle, 
  Zap, 
  Users, 
  Image as ImageIcon,
  Target,
  Info,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  ExternalLink,
  X,
  Lightbulb,
  Bot,
  AlertTriangle,
  Settings
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  LineChart,
  Line
} from "recharts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const AVAILABLE_COLUMNS = [
  { key: "status", label: "Status" },
  { key: "objective", label: "Objective" },
  { key: "spend", label: "Spend" },
  { key: "primaryResult", label: "Primary Result" },
  { key: "costPerResult", label: "Cost Per Result" },
  { key: "ctr", label: "CTR" },
  { key: "roas", label: "ROAS" },
  { key: "health", label: "Health" },
  { key: "aiStatus", label: "AI Status" },
];

export default function CampaignsClient({ slug: propSlug }: { slug?: string[] }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  
  const slug = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "campaigns") {
      return parts.slice(1);
    }
    return propSlug || [];
  }, [pathname, propSlug]);

  const searchParams = useSearchParams();
  const campaignId = searchParams.get("c") || slug?.[0];
  const adSetId = searchParams.get("as") || slug?.[1];
  const adId = searchParams.get("ad") || slug?.[2];

  // Programmatic client-side Cache & Service Worker Buster
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.navigator && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
      if (window.caches) {
        caches.keys().then(keys => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
    }
  }, []);

  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const renderTrend = (value: number | undefined) => {
    if (value === undefined || value === 0) return null;
    const isUp = value > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ml-1 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
        {isUp ? "▲" : "▼"}{Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const getResultTrend = (label: string, metrics: any) => {
    if (label === "Purchases") return metrics.purchases_trend;
    if (label === "Leads") return metrics.leads_trend;
    if (label === "Clicks") return metrics.clicks_trend;
    if (label === "Impressions") return metrics.impressions_trend;
    return 0;
  };
  
  // State for subscription and upgrade limits
  const [subscription, setSubscription] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("");
  
  // State for AI Optimization campaign config
  const [aiConfig, setAiConfig] = useState<any | null>(null);
  const [loadingAiConfig, setLoadingAiConfig] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [activating, setActivating] = useState(false);
  const [kpiInputs, setKpiInputs] = useState({
    business_objective: "",
    primary_kpi: "",
    target_cpl: "",
    target_roas: ""
  });
  
  // State for date presets
  const [datePreset, setDatePreset] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [objectiveFilter, setObjectiveFilter] = useState<string>("ALL");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "status",
    "objective",
    "spend",
    "primaryResult",
    "costPerResult",
    "ctr",
    "roas",
    "health",
    "aiStatus"
  ]);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => 
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const [sortBy, setSortBy] = useState<string>("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "adsets">("overview");
  const [breakdownView, setBreakdownView] = useState<"placement" | "platform" | "demographic" | "region">("placement");
  const [breakdownSortBy, setBreakdownSortBy] = useState<string>("spend");
  const [breakdownSortOrder, setBreakdownSortOrder] = useState<"asc" | "desc">("desc");
  const [adSortBy, setAdSortBy] = useState<string>("spend");
  const [adSortOrder, setAdSortOrder] = useState<"asc" | "desc">("desc");

  const handleCampaignHeaderSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const handleBreakdownHeaderSort = (key: string) => {
    if (breakdownSortBy === key) {
      setBreakdownSortOrder(breakdownSortOrder === "asc" ? "desc" : "asc");
    } else {
      setBreakdownSortBy(key);
      setBreakdownSortOrder("desc");
    }
  };

  const handleAdHeaderSort = (key: string) => {
    if (adSortBy === key) {
      setAdSortOrder(adSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdSortBy(key);
      setAdSortOrder("desc");
    }
  };

  // Hierarchy details states
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Drill-down selected items
  const [selectedAdSet, setSelectedAdSet] = useState<any | null>(null);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [perfError, setPerfError] = useState<string | null>(null);
  const [adSetPerformance, setAdSetPerformance] = useState<any | null>(null);
  const [adSetTab, setAdSetTab] = useState<"overview" | "ads" | "breakdowns" | "aidiagnosis">("overview");
  const [perfErrorState, setPerfErrorState] = useState<string | null>(null);

  const [placementsData, setPlacementsData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [regionsData, setRegionsData] = useState<any[]>([]);
  const [loadingBreakdowns, setLoadingBreakdowns] = useState<boolean>(false);

  // Ad-level placement & demographic breakdowns
  const [adPlacementsData, setAdPlacementsData] = useState<any[]>([]);
  const [adDemographicsData, setAdDemographicsData] = useState<any[]>([]);
  const [loadingAdBreakdowns, setLoadingAdBreakdowns] = useState<boolean>(false);

  useEffect(() => {
    const fetchBreakdowns = async () => {
      if (!selectedAccount || !selectedAdSet || adSetTab !== "breakdowns") return;
      setLoadingBreakdowns(true);
      try {
        const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
        const [pRes, dRes, rRes] = await Promise.all([
          api.getPlacements(selectedAccount.id, selectedCampaign?.id, selectedAdSet.id, startStr, endStr),
          api.getDemographics(selectedAccount.id, selectedCampaign?.id, selectedAdSet.id, startStr, endStr),
          api.getRegions(selectedAccount.id, selectedCampaign?.id, selectedAdSet.id, startStr, endStr)
        ]);
        setPlacementsData(pRes || []);
        setDemographicsData(dRes || []);
        setRegionsData(rRes || []);
      } catch (err) {
        console.error("Failed to fetch breakdown metrics:", err);
      } finally {
        setLoadingBreakdowns(false);
      }
    };
    fetchBreakdowns();
  }, [selectedAccount?.id, selectedAdSet?.id, adSetTab, datePreset, customStartDate, customEndDate]);

  // Fetch ad-level breakdowns when an ad is selected
  useEffect(() => {
    const fetchAdBreakdowns = async () => {
      if (!selectedAccount || !selectedAd || !selectedCampaign) return;
      setLoadingAdBreakdowns(true);
      try {
        const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
        const adSetIdForQuery = selectedAdSet?.id;
        const [pRes, dRes] = await Promise.all([
          api.getPlacements(selectedAccount.id, selectedCampaign?.id, adSetIdForQuery, startStr, endStr),
          api.getDemographics(selectedAccount.id, selectedCampaign?.id, adSetIdForQuery, startStr, endStr)
        ]);
        setAdPlacementsData(pRes || []);
        setAdDemographicsData(dRes || []);
      } catch (err) {
        console.error("Failed to fetch ad-level breakdown metrics:", err);
      } finally {
        setLoadingAdBreakdowns(false);
      }
    };
    fetchAdBreakdowns();
  }, [selectedAccount?.id, selectedAd?.id, selectedCampaign?.id, selectedAdSet?.id, datePreset, customStartDate, customEndDate]);

  const isSelectedAdSetRoas = useMemo(() => {
    if (!selectedAdSet) return true;
    const isConversationGoal = selectedAdSet.optimization_goal?.toUpperCase().includes("CONVERSATION") || false;
    const isLeadGoal = selectedAdSet.optimization_goal?.toUpperCase().includes("LEAD") || false;
    return !isConversationGoal && !isLeadGoal;
  }, [selectedAdSet]);

  const sortedPlacements = useMemo(() => {
    return [...placementsData].map(p => {
      const costPerResult = p.results > 0 ? p.spend / p.results : 0;
      return { ...p, costPerResult };
    }).sort((a, b) => {
      let valA: any = a[breakdownSortBy as keyof typeof a];
      let valB: any = b[breakdownSortBy as keyof typeof b];
      if (breakdownSortBy === "name") {
        const nameA = (a.platform_position || a.publisher_platform || "").toLowerCase();
        const nameB = (b.platform_position || b.publisher_platform || "").toLowerCase();
        return breakdownSortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (breakdownSortBy === "roas" && !isSelectedAdSetRoas) {
        valA = a.costPerResult;
        valB = b.costPerResult;
      }
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      return breakdownSortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [placementsData, breakdownSortBy, breakdownSortOrder, isSelectedAdSetRoas]);

  const platformDistribution = useMemo(() => {
    const platformMap: Record<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }> = {};
    placementsData.forEach(p => {
      const platform = p.publisher_platform || "Unknown";
      if (!platformMap[platform]) {
        platformMap[platform] = { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
      }
      platformMap[platform].spend += p.spend || 0;
      platformMap[platform].impressions += p.impressions || 0;
      platformMap[platform].clicks += p.clicks || 0;
      platformMap[platform].results += p.results || 0;
      platformMap[platform].revenue += p.revenue || 0;
    });
    return Object.entries(platformMap).map(([platform, metrics]) => {
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      const costPerResult = metrics.results > 0 ? metrics.spend / metrics.results : 0;
      return { platform, ...metrics, ctr, cpc, roas, costPerResult };
    }).sort((a, b) => {
      let valA: any = a[breakdownSortBy as keyof typeof a];
      let valB: any = b[breakdownSortBy as keyof typeof b];
      if (breakdownSortBy === "name") {
        valA = a.platform.toLowerCase();
        valB = b.platform.toLowerCase();
        return breakdownSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (breakdownSortBy === "roas" && !isSelectedAdSetRoas) {
        valA = a.costPerResult;
        valB = b.costPerResult;
      }
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      return breakdownSortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [placementsData, breakdownSortBy, breakdownSortOrder, isSelectedAdSetRoas]);

  const ageDistribution = useMemo(() => {
    const ageMap: Record<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }> = {};
    demographicsData.forEach(d => {
      const age = d.age || "Unknown";
      if (!ageMap[age]) {
        ageMap[age] = { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
      }
      ageMap[age].spend += d.spend || 0;
      ageMap[age].impressions += d.impressions || 0;
      ageMap[age].clicks += d.clicks || 0;
      ageMap[age].results += d.results || 0;
      ageMap[age].revenue += d.revenue || 0;
    });
    return Object.entries(ageMap).map(([age, metrics]) => {
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      const costPerResult = metrics.results > 0 ? metrics.spend / metrics.results : 0;
      return { age, ...metrics, ctr, cpc, roas, costPerResult };
    }).sort((a, b) => {
      let valA: any = a[breakdownSortBy as keyof typeof a];
      let valB: any = b[breakdownSortBy as keyof typeof b];
      if (breakdownSortBy === "name") {
        valA = a.age.toLowerCase();
        valB = b.age.toLowerCase();
        return breakdownSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (breakdownSortBy === "roas" && !isSelectedAdSetRoas) {
        valA = a.costPerResult;
        valB = b.costPerResult;
      }
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      return breakdownSortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [demographicsData, breakdownSortBy, breakdownSortOrder, isSelectedAdSetRoas]);

  const genderDistribution = useMemo(() => {
    const genderMap: Record<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }> = {};
    demographicsData.forEach(d => {
      const gender = d.gender || "Unknown";
      if (!genderMap[gender]) {
        genderMap[gender] = { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
      }
      genderMap[gender].spend += d.spend || 0;
      genderMap[gender].impressions += d.impressions || 0;
      genderMap[gender].clicks += d.clicks || 0;
      genderMap[gender].results += d.results || 0;
      genderMap[gender].revenue += d.revenue || 0;
    });
    return Object.entries(genderMap).map(([gender, metrics]) => {
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      const costPerResult = metrics.results > 0 ? metrics.spend / metrics.results : 0;
      return { gender, ...metrics, ctr, cpc, roas, costPerResult };
    }).sort((a, b) => {
      let valA: any = a[breakdownSortBy as keyof typeof a];
      let valB: any = b[breakdownSortBy as keyof typeof b];
      if (breakdownSortBy === "name") {
        valA = a.gender.toLowerCase();
        valB = b.gender.toLowerCase();
        return breakdownSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (breakdownSortBy === "roas" && !isSelectedAdSetRoas) {
        valA = a.costPerResult;
        valB = b.costPerResult;
      }
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      return breakdownSortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [demographicsData, breakdownSortBy, breakdownSortOrder, isSelectedAdSetRoas]);

  const regionDistribution = useMemo(() => {
    return [...regionsData].map(r => {
      const costPerResult = r.results > 0 ? r.spend / r.results : 0;
      return { ...r, costPerResult };
    }).sort((a, b) => {
      let valA: any = a[breakdownSortBy as keyof typeof a];
      let valB: any = b[breakdownSortBy as keyof typeof b];
      if (breakdownSortBy === "name") {
        valA = (a.region || "").toLowerCase();
        valB = (b.region || "").toLowerCase();
        return breakdownSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (breakdownSortBy === "roas" && !isSelectedAdSetRoas) {
        valA = a.costPerResult;
        valB = b.costPerResult;
      }
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      return breakdownSortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [regionsData, breakdownSortBy, breakdownSortOrder, isSelectedAdSetRoas]);

  // Fetch subscription on mount
  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await api.getSubscription();
        setSubscription(res);
      } catch (err) {
        console.error("Failed to load subscription:", err);
      }
    };
    fetchSub();
  }, []);

  const getSubscriptionLimit = () => {
    let limit = 7; // default trial
    if (subscription) {
      if (subscription.status === "trialing") {
        limit = 7;
      } else if (subscription.plan === "starter") {
        limit = 30;
      } else if (subscription.plan === "growth") {
        limit = 90;
      } else if (subscription.plan === "pro" || subscription.plan === "agency") {
        limit = 99999; // lifetime
      }
    }
    return limit;
  };

  const checkDateRangeLimit = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const limit = getSubscriptionLimit();
    
    let nextPlan = "Starter";
    if (subscription) {
      if (subscription.status === "trialing") {
        nextPlan = "Starter";
      } else if (subscription.plan === "starter") {
        nextPlan = "Pro";
      } else if (subscription.plan === "growth") {
        nextPlan = "Pro";
      }
    }

    if (diffDays > limit) {
      setUpgradeModalMessage(
        `Your plan (${subscription?.status === "trialing" ? "Free Trial" : subscription?.plan ? subscription.plan.toUpperCase() : "FREE TRIAL"}) is limited to ${limit} days of historical data. Please upgrade to the ${nextPlan} plan to analyze ${diffDays} days.`
      );
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  // Date helper
  const getDates = (preset: string, customStart?: string, customEnd?: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (preset) {
      case "today":
        break;
      case "yesterday":
        start.setDate(end.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case "3d":
        start.setDate(end.getDate() - 2);
        break;
      case "5d":
        start.setDate(end.getDate() - 4);
        break;
      case "7d":
        start.setDate(end.getDate() - 6);
        break;
      case "14d":
        start.setDate(end.getDate() - 13);
        break;
      case "30d":
        start.setDate(end.getDate() - 29);
        break;
      case "90d":
        start.setDate(end.getDate() - 89);
        break;
      case "last_week": {
        const day = end.getDay();
        const diffToLastMonday = (day === 0 ? 6 : day - 1) + 7;
        start.setDate(end.getDate() - diffToLastMonday);
        end.setDate(start.getDate() + 6);
        break;
      }
      case "last_month": {
        start.setMonth(end.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      }
      case "current_month":
        start.setDate(1);
        break;
      case "last_year":
        start.setFullYear(end.getFullYear() - 1);
        start.setMonth(0);
        start.setDate(1);
        end.setFullYear(end.getFullYear() - 1);
        end.setMonth(11);
        end.setDate(31);
        break;
      case "this_year":
        start.setMonth(0);
        start.setDate(1);
        break;
      case "lifetime":
        start.setFullYear(end.getFullYear() - 5);
        break;
      case "custom":
        if (customStart && customEnd) {
          return {
            startStr: customStart,
            endStr: customEnd,
            startDateObj: new Date(customStart),
            endDateObj: new Date(customEnd),
          };
        }
        break;
      default:
        start.setDate(end.getDate() - 29); // Default 30d
        break;
    }

    return {
      startStr: start.toISOString().split("T")[0],
      endStr: end.toISOString().split("T")[0],
      startDateObj: start,
      endDateObj: end,
    };
  };

  const loadCampaigns = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
    const cacheKey = `dgs_cached_campaigns_${selectedAccount.id}_${datePreset}_${startStr}_${endStr}`;

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCampaigns(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      setLoading(!cached);
      const res = await api.getCampaigns(selectedAccount.id, startStr, endStr);
      setCampaigns(res);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch (err) {
      console.error("Failed to load campaigns list:", err);
      if (!cached) setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!selectedAccount) return;
    try {
      const res = await api.getRecommendations(selectedAccount.id);
      setRecs(res);
    } catch (e) {
      console.error("Failed to load recommendations context:", e);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadCampaigns();
      loadRecommendations();
    }
  }, [selectedAccount, datePreset, customStartDate, customEndDate]);

  // Sync URL query parameters / slug with react selection states
  useEffect(() => {
    if (!campaigns || campaigns.length === 0) return;

    if (!campaignId) {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
      setSelectedAd(null);
    } else {
      const camp = campaigns.find(c => c.id === campaignId || c.meta_campaign_id === campaignId);
      if (camp) {
        setSelectedCampaign(camp);

        if (!adSetId) {
          setSelectedAdSet(null);
          setSelectedAd(null);
        } else {
          if (adSetId === "all") {
            setSelectedAdSet(null);
            if (adId) {
              const ad = ads.find(item => item.id === adId || item.meta_ad_id === adId);
              if (ad) {
                setSelectedAd(ad);
                const matchingAdSet = adSets.find(as => as.name === ad.adset_name);
                if (matchingAdSet) {
                  setSelectedAdSet(matchingAdSet);
                }
              }
            }
          } else {
            const as = adSets.find(item => item.id === adSetId || item.meta_adset_id === adSetId);
            if (as) {
              setSelectedAdSet(as);

              if (!adId) {
                setSelectedAd(null);
              } else {
                const ad = ads.find(item => item.id === adId || item.meta_ad_id === adId);
                if (ad) {
                  setSelectedAd(ad);
                }
              }
            } else if (adSets.length > 0) {
              router.replace(`/campaigns?c=${campaignId}`);
            }
          }
        }
      } else {
        router.replace('/campaigns');
      }
    }
  }, [campaignId, adSetId, adId, campaigns, adSets, ads]);

  // Load campaign details (adsets and ads) when campaign selection or date filters change
  useEffect(() => {
    if (selectedCampaign && selectedAccount) {
      loadCampaignDetails(selectedCampaign.name);
      loadCampaignAiConfig(selectedCampaign.id);
    }
  }, [selectedCampaign?.id, datePreset, customStartDate, customEndDate, selectedAccount?.id]);

  // Load adset performance details when adset selection or date filters change
  useEffect(() => {
    if (selectedCampaign && selectedAdSet) {
      loadAdSetPerformance(selectedCampaign.id, selectedAdSet.id);
    }
  }, [selectedAdSet?.id, selectedCampaign?.id, datePreset, customStartDate, customEndDate]);

  // Date Range string
  const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
  const formatDateHeader = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const dateRangeLabel = `${formatDateHeader(startStr)} – ${formatDateHeader(endStr)}, 2026`;

  // Objective based dynamic metrics resolver
  const getObjectiveMetrics = (c: any) => {
    const obj = (c.objective || "OUTCOME_SALES").toUpperCase();
    const perfGoal = (c.performance_goal || "").toUpperCase();
    const optEvent = (c.optimization_event || "").toUpperCase();

    const spend = c.metrics.spend || 0;
    const impressions = c.metrics.impressions || 0;
    const clicks = c.metrics.clicks || 0;
    const purchases = c.metrics.purchases || 0;
    const leads = c.metrics.leads || 0;
    const conversations = c.metrics.conversations || 0;
    const calls = c.metrics.calls || 0;
    const roas = c.metrics.roas || 0;

    // 1. Check by optimization event or performance goal profile first
    if (optEvent === "CONVERSATION" || perfGoal.includes("CONVERSATION") || perfGoal.includes("MESSAGING_CONVERSATION")) {
      return {
        resultLabel: "Conversations",
        resultValue: formatNumber(conversations),
        costPerResult: conversations > 0 ? formatCurrency(spend / conversations) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    }

    if (optEvent === "LEAD" || perfGoal.includes("LEAD")) {
      return {
        resultLabel: "Leads",
        resultValue: formatNumber(leads),
        costPerResult: leads > 0 ? formatCurrency(spend / leads) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    }

    if (optEvent === "CALL" || perfGoal.includes("CALL")) {
      return {
        resultLabel: "Calls",
        resultValue: formatNumber(calls),
        costPerResult: calls > 0 ? formatCurrency(spend / calls) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    }

    if (optEvent === "PURCHASE" || perfGoal.includes("PURCHASE")) {
      return {
        resultLabel: "Purchases",
        resultValue: formatNumber(purchases),
        costPerResult: purchases > 0 ? formatCurrency(spend / purchases) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: roas > 0 ? `${roas.toFixed(2)}x` : "—",
        isRoasRelevant: true
      };
    }

    if (optEvent === "LINK_CLICKS" || perfGoal.includes("LINK_CLICKS")) {
      return {
        resultLabel: "Clicks",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    }

    // 2. Fallbacks based on campaign objectives
    if (obj.includes("TRAFFIC") || obj.includes("LINK_CLICKS")) {
      return {
        resultLabel: "Clicks",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("AWARENESS") || obj.includes("REACH")) {
      return {
        resultLabel: "Impressions",
        resultValue: formatNumber(impressions),
        costPerResult: impressions > 0 ? formatCurrency((spend / impressions) * 1000) + " CPM" : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("LEAD")) {
      return {
        resultLabel: "Leads",
        resultValue: formatNumber(leads),
        costPerResult: leads > 0 ? formatCurrency(spend / leads) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("ENGAGEMENT")) {
      return {
        resultLabel: "Clicks",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("APP_PROMOTION") || obj.includes("APP_INSTALLS")) {
      return {
        resultLabel: "App Installs",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else {
      return {
        resultLabel: "Purchases",
        resultValue: formatNumber(purchases),
        costPerResult: purchases > 0 ? formatCurrency(spend / purchases) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: roas > 0 ? `${roas.toFixed(2)}x` : "—",
        isRoasRelevant: true
      };
    }
  };

  const getHealthScore = (c: any) => {
    const roas = c.metrics.roas || 0;
    const spend = c.metrics.spend || 0;
    const ctr = c.metrics.ctr || 0;
    const purchases = c.metrics.purchases || 0;

    let score = 75;
    if (roas >= 3.0) score = 95;
    else if (roas >= 2.0) score = 88;
    else if (roas >= 1.5) score = 80;
    else if (roas > 0) score = 65;
    else if (spend === 0) score = 100;

    if (spend > 100 && purchases === 0) score = Math.max(30, score - 30);
    if (ctr > 0 && ctr < 0.01) score = Math.max(30, score - 10);
    return score;
  };

  const getCampaignRecommendations = (c: any) => {
    return recs.filter(r => 
      r.entity_id === c.id || 
      r.campaign_id === c.id ||
      r.title.toLowerCase().includes(c.name.toLowerCase())
    );
  };

  // Get ad-level recommendations for the AI Diagnosis section
  const getAdRecommendations = (ad: any) => {
    return recs.filter(r =>
      r.entity_id === ad.id ||
      r.ad_id === ad.id ||
      r.entity_type === "ad"
    );
  };

  // Dynamic Creative Intelligence analyzer
  const getCreativeIntelligence = (ad: any) => {
    const creative = ad?.creative;
    const metrics = ad?.metrics;
    const insights: { label: string; value: string; sentiment: "good" | "neutral" | "warning" }[] = [];

    if (!creative) return insights;

    // 1. Copy Strength: Analyze headline length
    const headline = creative.headline || "";
    const headlineLen = headline.length;
    if (headlineLen === 0) {
      insights.push({ label: "Copy Strength", value: "No headline detected. Adding a headline can significantly improve CTR.", sentiment: "warning" });
    } else if (headlineLen <= 40) {
      insights.push({ label: "Copy Strength", value: `Concise headline (${headlineLen} chars). Optimal for mobile feeds — low truncation risk.`, sentiment: "good" });
    } else if (headlineLen <= 65) {
      insights.push({ label: "Copy Strength", value: `Moderate headline (${headlineLen} chars). May get truncated on some mobile placements.`, sentiment: "neutral" });
    } else {
      insights.push({ label: "Copy Strength", value: `Long headline (${headlineLen} chars). High truncation risk on mobile — consider shortening to under 40 characters.`, sentiment: "warning" });
    }

    // 2. Primary Text Analysis
    const primaryText = creative.primary_text || "";
    const primaryLen = primaryText.length;
    if (primaryLen === 0) {
      insights.push({ label: "Primary Text", value: "No primary text. Ads with primary text tend to have higher engagement rates.", sentiment: "warning" });
    } else if (primaryLen <= 125) {
      insights.push({ label: "Primary Text", value: `Short-form copy (${primaryLen} chars). Fully visible without 'See More' — good for direct response.`, sentiment: "good" });
    } else if (primaryLen <= 280) {
      insights.push({ label: "Primary Text", value: `Medium copy (${primaryLen} chars). First 125 characters visible before truncation — ensure hook is strong.`, sentiment: "neutral" });
    } else {
      insights.push({ label: "Primary Text", value: `Long-form copy (${primaryLen} chars). Truncated on feed — only users who click 'See More' will read the full text.`, sentiment: "neutral" });
    }

    // 3. CTA Analysis
    const cta = creative.call_to_action || "";
    if (!cta) {
      insights.push({ label: "Call-to-Action", value: "No CTA button set. Adding a CTA typically improves conversion rate by 10-20%.", sentiment: "warning" });
    } else {
      const ctaLabel = cta.replace(/_/g, " ");
      insights.push({ label: "Call-to-Action", value: `Using '${ctaLabel}' CTA. Ensure it aligns with your campaign objective.`, sentiment: "good" });
    }

    // 4. Media Type
    const type = creative.creative_type || (creative.video_id ? "video" : creative.image_url ? "image" : "unknown");
    if (type === "video" || creative.video_id) {
      insights.push({ label: "Media Format", value: "Video creative detected. Video ads typically achieve 20-30% higher engagement than static images.", sentiment: "good" });
    } else if (type === "image" || creative.image_url) {
      insights.push({ label: "Media Format", value: "Static image creative. Consider testing a video or carousel variant for potentially higher engagement.", sentiment: "neutral" });
    } else {
      insights.push({ label: "Media Format", value: "No visual asset detected. Visual creatives are essential for ad performance.", sentiment: "warning" });
    }

    // 5. Performance-based readability
    const ctr = metrics?.ctr || 0;
    if (ctr >= 2.0) {
      insights.push({ label: "Readability Score", value: `High engagement (${ctr.toFixed(2)}% CTR) suggests copy resonates well with the audience.`, sentiment: "good" });
    } else if (ctr >= 1.0) {
      insights.push({ label: "Readability Score", value: `Average engagement (${ctr.toFixed(2)}% CTR). Test alternative hooks or value propositions.`, sentiment: "neutral" });
    } else if (ctr > 0) {
      insights.push({ label: "Readability Score", value: `Low engagement (${ctr.toFixed(2)}% CTR). Consider rewriting copy with a stronger opening hook.`, sentiment: "warning" });
    }

    return insights;
  };

  // Generate dynamic campaign opportunity insights from real metrics
  const getCampaignOpportunities = (c: any) => {
    const opportunities: { type: "warning" | "opportunity"; title: string; description: string }[] = [];
    const m = c.metrics;
    const healthScore = getHealthScore(c);
    const obj = (c.objective || "").toUpperCase();

    // Budget pacing: high spend but poor results
    if (m.spend > 50 && m.purchases === 0 && m.clicks > 0 && !obj.includes("AWARENESS") && !obj.includes("REACH")) {
      opportunities.push({
        type: "warning",
        title: "Zero Conversions Despite Active Spend",
        description: `This campaign has spent ${formatCurrency(m.spend)} with ${formatNumber(m.clicks)} clicks but zero conversions. Verify your Meta Pixel or Conversion API events are firing correctly, and ensure the landing page conversion flow is functional.`
      });
    }

    // Low CTR warning
    if (m.ctr > 0 && m.ctr < 0.8 && m.impressions > 1000) {
      opportunities.push({
        type: "warning",
        title: "Below-Average Click-Through Rate",
        description: `CTR is ${m.ctr.toFixed(2)}% which is below the typical ${obj.includes("AWARENESS") ? "awareness" : "performance"} benchmark. Consider refreshing ad creatives, testing new headlines, or narrowing audience targeting.`
      });
    }

    // High frequency fatigue
    if (m.frequency && m.frequency > 3.5) {
      opportunities.push({
        type: "warning",
        title: "High Frequency — Audience Fatigue Risk",
        description: `Average frequency is ${m.frequency.toFixed(1)}x. Audiences seeing your ad this many times may experience ad fatigue. Consider expanding the audience or introducing new creative variations.`
      });
    }

    // Strong ROAS opportunity to scale
    if (m.roas >= 3.0 && m.spend > 0) {
      opportunities.push({
        type: "opportunity",
        title: "High ROAS — Scaling Opportunity",
        description: `This campaign is achieving ${m.roas.toFixed(2)}x ROAS. Consider gradually increasing daily budget by 20-30% to capture additional profitable conversions while monitoring performance stability.`
      });
    }

    // Low CPC opportunity
    if (m.cpc > 0 && m.cpc < 0.50 && m.clicks > 100) {
      opportunities.push({
        type: "opportunity",
        title: "Cost-Efficient Traffic Acquisition",
        description: `CPC is ${formatCurrency(m.cpc)} — well below average. This audience segment is cost-efficient for traffic. Consider increasing budget allocation to capitalize on low acquisition costs.`
      });
    }

    // Declining trends
    if (m.roas_trend && m.roas_trend < -15) {
      opportunities.push({
        type: "warning",
        title: "Declining ROAS Trend",
        description: `ROAS has dropped ${Math.abs(m.roas_trend).toFixed(1)}% compared to the previous period. Investigate creative fatigue, audience saturation, or competitive pressure.`
      });
    }

    // Limited ad variations
    const campaignAds = ads.filter(ad => ad.campaign_name === c.name);
    const activeAds = campaignAds.filter(ad => ad.status === "ACTIVE");
    if (activeAds.length > 0 && activeAds.length <= 2) {
      opportunities.push({
        type: "opportunity",
        title: "Develop Additional Creative Variations",
        description: `Only ${activeAds.length} active ad${activeAds.length === 1 ? "" : "s"} in this campaign. Meta's algorithm performs best with 3-5 active variations for optimal delivery optimization.`
      });
    }

    return opportunities;
  };

  // Generate dynamic AI diagnosis insights for an ad
  const getAdAiDiagnosis = (ad: any, campaign: any, adSet: any) => {
    const diagnosis: { type: "test" | "keep" | "warning"; label: string; description: string }[] = [];
    const m = ad?.metrics;
    const creative = ad?.creative;
    if (!m) return diagnosis;

    const campaignObj = (campaign?.objective || "").toUpperCase();
    const isConversation = adSet?.optimization_goal?.toUpperCase().includes("CONVERSATION");

    // Find sibling ads for comparison
    const siblingAds = ads.filter(a => a.adset_name === ad.adset_name && a.id !== ad.id);
    const avgSiblingCtr = siblingAds.length > 0 ? siblingAds.reduce((sum: number, a: any) => sum + (a.metrics?.ctr || 0), 0) / siblingAds.length : 0;
    const avgSiblingRoas = siblingAds.length > 0 ? siblingAds.reduce((sum: number, a: any) => sum + (a.metrics?.roas || 0), 0) / siblingAds.length : 0;

    // Recommended test based on creative analysis
    if (creative?.headline && creative.headline.length > 0) {
      const hasQuestion = creative.headline.includes("?");
      if (!hasQuestion) {
        diagnosis.push({
          type: "test",
          label: "Recommended Next Test",
          description: `Test a question-oriented headline variant to compare against the current headline "${creative.headline.substring(0, 50)}${creative.headline.length > 50 ? '...' : ''}". Question-based headlines often drive 10-15% higher CTR.`
        });
      } else {
        diagnosis.push({
          type: "test",
          label: "Recommended Next Test",
          description: `Current headline uses a question hook. Test a benefit-led or statistic-driven headline as an alternative to find if direct value propositions outperform curiosity-based copy.`
        });
      }
    } else if (m.ctr < 1.0 && m.impressions > 500) {
      diagnosis.push({
        type: "test",
        label: "Recommended Next Test",
        description: `Low CTR (${m.ctr.toFixed(2)}%) suggests the creative isn't capturing attention. Test a completely new visual concept with a stronger hook in the first 3 seconds for video or a bolder design for static.`
      });
    }

    // Don't change recommendation for high performers
    if (m.ctr > avgSiblingCtr && m.ctr > 1.0 && m.spend > 10) {
      const contribution = siblingAds.length > 0 && m.roas > 0
        ? Math.round((m.purchases / Math.max(1, m.purchases + siblingAds.reduce((s: number, a: any) => s + (a.metrics?.purchases || 0), 0))) * 100)
        : null;
      diagnosis.push({
        type: "keep",
        label: "Don't Change Recommendation",
        description: `This ad's CTR (${m.ctr.toFixed(2)}%) outperforms sibling average${avgSiblingCtr > 0 ? ` (${avgSiblingCtr.toFixed(2)}%)` : ""}. ${contribution ? `It contributes approximately ${contribution}% of the ad set's conversions.` : "Keep it running to preserve delivery stability."} Do not alter the primary creative asset.`
      });
    } else if (m.roas > avgSiblingRoas && m.roas > 1.0) {
      diagnosis.push({
        type: "keep",
        label: "Efficiency Leader",
        description: `This ad achieves ${m.roas.toFixed(2)}x ROAS${avgSiblingRoas > 0 ? ` vs ${avgSiblingRoas.toFixed(2)}x sibling average` : ""}. Maintain current creative and audience configuration to preserve return efficiency.`
      });
    }

    // Performance warning
    if (m.spend > 20 && m.purchases === 0 && !isConversation && !campaignObj.includes("AWARENESS")) {
      diagnosis.push({
        type: "warning",
        label: "Conversion Gap Alert",
        description: `${formatCurrency(m.spend)} spent with zero conversions. Consider pausing this ad and reallocating budget to higher-performing variations within the ad set.`
      });
    }

    // Add recommendation-engine insights if available
    const adRecs = getAdRecommendations(ad);
    adRecs.slice(0, 2).forEach(r => {
      diagnosis.push({
        type: r.priority === "critical" || r.priority === "high" ? "warning" : "test",
        label: r.title,
        description: r.description
      });
    });

    return diagnosis;
  };

  const loadCampaignDetails = async (campaignName: string) => {
    if (!selectedAccount) return;
    setLoadingDetails(true);
    try {
      const [allAdSets, allAds] = await Promise.all([
        api.getAdSets(selectedAccount.id, startStr, endStr),
        api.getAds(selectedAccount.id, startStr, endStr)
      ]);
      const filteredAdSets = allAdSets.filter((as: any) => as.campaign_name === campaignName);
      const filteredAds = allAds.filter((ad: any) => ad.campaign_name === campaignName);
      setAdSets(filteredAdSets);
      setAds(filteredAds);
    } catch (err) {
      console.error("Failed to load campaign hierarchy detail:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadCampaignAiConfig = async (campaignId: string) => {
    try {
      setLoadingAiConfig(true);
      const res = await api.getCampaignAiConfig(campaignId);
      setAiConfig(res);
      setKpiInputs({
        business_objective: res.business_objective || "",
        primary_kpi: res.primary_kpi || "",
        target_cpl: res.target_cpl ? String(res.target_cpl) : "",
        target_roas: res.target_roas ? String(res.target_roas) : ""
      });
    } catch (e) {
      console.error("Failed to load campaign AI optimization config:", e);
    } finally {
      setLoadingAiConfig(false);
    }
  };

  const handleToggleAiOptimization = async () => {
    if (!selectedCampaign) return;
    if (aiConfig && aiConfig.is_active) {
      // Deactivate
      try {
        setActivating(true);
        const res = await api.deactivateCampaignAiConfig(selectedCampaign.id);
        setAiConfig(res);
      } catch (err: any) {
        alert(err.message || "Failed to deactivate AI Optimization.");
      } finally {
        setActivating(false);
      }
    } else {
      // Open Activation Confirmation Modal
      setShowAiModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!selectedCampaign) return;
    
    // Validate target values if provided
    const payload: any = {
      business_objective: kpiInputs.business_objective || null,
      primary_kpi: kpiInputs.primary_kpi || null,
      target_cpl: kpiInputs.target_cpl ? parseFloat(kpiInputs.target_cpl) : null,
      target_roas: kpiInputs.target_roas ? parseFloat(kpiInputs.target_roas) : null
    };

    try {
      setActivating(true);
      const res = await api.activateCampaignAiConfig(selectedCampaign.id, payload);
      setAiConfig(res);
      setShowAiModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to activate AI Optimization.");
    } finally {
      setActivating(false);
    }
  };

  const loadAdSetPerformance = async (campaignId: string, adSetId: string) => {
    setLoadingPerf(true);
    setPerfError(null);
    try {
      const res = await api.getAdSetPerformance(campaignId, adSetId, startStr, endStr);
      setAdSetPerformance(res);
    } catch (err: any) {
      console.error("Failed to load adset performance goal profile:", err);
      setPerfError(err.message || String(err));
    } finally {
      setLoadingPerf(false);
    }
  };

  const handleSelectCampaign = (c: any) => {
    router.push(`/campaigns?c=${c.id}`);
  };

  const handleSelectAdSetFromList = (as: any) => {
    if (!selectedCampaign) return;
    router.push(`/campaigns?c=${selectedCampaign.id}&as=${as.id}`);
  };

  const handleSelectAdFromList = (ad: any) => {
    if (!selectedCampaign) return;
    const matchingAdSet = adSets.find(as => as.name === ad.adset_name);
    const adSetId = matchingAdSet ? matchingAdSet.id : "all";
    router.push(`/campaigns?c=${selectedCampaign.id}&as=${adSetId}&ad=${ad.id}`);
  };

  // Generate mock chart data based on totals
  // Daily metrics states for real trend lines
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);

  useEffect(() => {
    const fetchDailyMetrics = async () => {
      const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
      if (selectedAd) {
        try {
          setLoadingDaily(true);
          const res = await api.getAdDaily(selectedAd.id, startStr, endStr);
          setDailyData(res);
        } catch (e) {
          console.error("Failed to fetch ad daily metrics:", e);
          setDailyData([]);
        } finally {
          setLoadingDaily(false);
        }
      } else if (selectedCampaign) {
        try {
          setLoadingDaily(true);
          const res = await api.getCampaignDaily(selectedCampaign.id, startStr, endStr);
          setDailyData(res);
        } catch (e) {
          console.error("Failed to fetch campaign daily metrics:", e);
          setDailyData([]);
        } finally {
          setLoadingDaily(false);
        }
      } else {
        setDailyData([]);
      }
    };

    fetchDailyMetrics();
  }, [selectedCampaign?.id, selectedAd?.id, datePreset, customStartDate, customEndDate]);

  const chartData = useMemo(() => {
    if (dailyData && dailyData.length > 0) {
      const obj = (selectedCampaign?.objective || "").toUpperCase();
      const perfGoal = (selectedCampaign?.performance_goal || "").toUpperCase();
      const optEvent = (selectedCampaign?.optimization_event || "").toUpperCase();

      return dailyData.map(item => {
        let result = item.purchases || 0;

        if (optEvent === "CONVERSATION" || perfGoal.includes("CONVERSATION") || perfGoal.includes("MESSAGING_CONVERSATION")) {
          result = item.conversations || 0;
        } else if (optEvent === "LEAD" || perfGoal.includes("LEAD")) {
          result = item.leads || 0;
        } else if (optEvent === "CALL" || perfGoal.includes("CALL")) {
          result = item.calls || 0;
        } else if (optEvent === "PURCHASE" || perfGoal.includes("PURCHASE")) {
          result = item.purchases || 0;
        } else if (optEvent === "LINK_CLICKS" || perfGoal.includes("LINK_CLICKS") || obj.includes("TRAFFIC")) {
          result = item.clicks || 0;
        } else if (obj.includes("AWARENESS") || obj.includes("REACH")) {
          result = item.impressions || 0;
        } else if (obj.includes("LEADS")) {
          result = item.leads || 0;
        } else if (obj.includes("ENGAGEMENT")) {
          result = item.conversations || item.clicks || 0;
        }

        return {
          date: (() => {
            try {
              const d = new Date(item.date);
              return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
            } catch (e) {
              return item.date;
            }
          })(),
          spend: item.spend,
          result: result
        };
      });
    }

    // Fallback if no real daily metrics exist in the DB for the range
    const { startDateObj, endDateObj } = getDates(datePreset, customStartDate, customEndDate);
    const timeDiff = endDateObj.getTime() - startDateObj.getTime();
    const days = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
    const fallback = [];
    
    // Create UTC baseline to avoid timezone drift issues
    const baseDate = new Date(startDateObj);
    for (let i = 0; i < days; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      fallback.push({
        date: dateStr,
        spend: 0,
        result: 0
      });
    }
    return fallback;
  }, [dailyData, selectedCampaign, datePreset, customStartDate, customEndDate]);

  const adSetResultInfo = useMemo(() => {
    if (!selectedAdSet) return { label: "Results", count: 0, costLabel: "Cost Per Result", isRoas: false };
    
    const obj = (selectedCampaign?.objective || "").toUpperCase();
    const perfGoal = (selectedAdSet.performance_goal || selectedCampaign?.performance_goal || "").toUpperCase();
    const optEvent = (selectedAdSet.optimization_event || selectedCampaign?.optimization_event || "").toUpperCase();
    
    let label = "Results";
    let count = selectedAdSet.metrics?.purchases || 0;
    let isRoas = true;
    
    if (optEvent === "CONVERSATION" || perfGoal.includes("CONVERSATION") || perfGoal.includes("MESSAGING_CONVERSATION")) {
      label = "Conversations";
      count = selectedAdSet.metrics?.conversations || 0;
      isRoas = false;
    } else if (optEvent === "LEAD" || perfGoal.includes("LEAD")) {
      label = "Leads";
      count = selectedAdSet.metrics?.leads || 0;
      isRoas = false;
    } else if (optEvent === "CALL" || perfGoal.includes("CALL")) {
      label = "Calls";
      count = selectedAdSet.metrics?.calls || 0;
      isRoas = false;
    } else if (optEvent === "PURCHASE" || perfGoal.includes("PURCHASE")) {
      label = "Purchases";
      count = selectedAdSet.metrics?.purchases || 0;
      isRoas = true;
    } else if (optEvent === "LINK_CLICKS" || perfGoal.includes("LINK_CLICKS") || obj.includes("TRAFFIC")) {
      label = "Clicks";
      count = selectedAdSet.metrics?.clicks || 0;
      isRoas = false;
    } else if (obj.includes("AWARENESS") || obj.includes("REACH")) {
      label = "Impressions";
      count = selectedAdSet.metrics?.impressions || 0;
      isRoas = false;
    } else if (obj.includes("LEADS")) {
      label = "Leads";
      count = selectedAdSet.metrics?.leads || 0;
      isRoas = false;
    } else if (obj.includes("ENGAGEMENT")) {
      label = "Conversations";
      count = selectedAdSet.metrics?.conversations || selectedAdSet.metrics?.clicks || 0;
      isRoas = false;
    }
    
    return {
      label,
      count,
      costLabel: isRoas ? "ROAS" : `Cost Per ${label.replace(/s$/, "")}`,
      isRoas
    };
  }, [selectedAdSet, selectedCampaign]);

  // Find top and bottom performing ads in the campaign
  const getStrongestAndWeakestAds = () => {
    if (ads.length === 0) return { strongest: null, weakest: null };
    const isMsg = (selectedCampaign?.objective || "").toUpperCase().includes("ENGAGEMENT") ||
                  (selectedCampaign?.objective || "").toUpperCase().includes("MESSAGING") ||
                  (selectedCampaign?.name || "").toLowerCase().includes("cake");
    const sorted = [...ads].sort((a, b) => {
      if (isMsg) {
        const convA = a.metrics.conversations || 0;
        const convB = b.metrics.conversations || 0;
        if (convB !== convA) return convB - convA;
        return b.metrics.ctr - a.metrics.ctr;
      }
      return b.metrics.roas - a.metrics.roas || b.metrics.ctr - a.metrics.ctr;
    });
    return {
      strongest: sorted[0],
      weakest: sorted.length > 1 ? sorted[sorted.length - 1] : null
    };
  };

  const uniqueObjectives = useMemo(() => {
    const objectives = campaigns.map(c => c.objective);
    return Array.from(new Set(objectives)).filter(Boolean);
  }, [campaigns]);

  const filteredAndSortedCampaigns = campaigns
    .filter(c => statusFilter === "ALL" || c.status === statusFilter)
    .filter(c => objectiveFilter === "ALL" || c.objective === objectiveFilter)
    .sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else {
        valA = a.metrics[sortBy] || 0;
        valB = b.metrics[sortBy] || 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  if (loadingAccounts) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Resolving accounts...</span>
      </div>
    );
  }
  return (
    <div className="animate-fade-in space-y-6">
      {/* Universal Date Range selector at the top of the entire view */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 border border-border rounded-lg shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date Filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Date Range Select Inputs */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate} 
                min={(() => {
                  const limit = getSubscriptionLimit();
                  if (limit >= 99999) return undefined;
                  const d = new Date();
                  d.setDate(d.getDate() - limit);
                  return d.toISOString().split("T")[0];
                })()}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomStartDate(val);
                  if (val && customEndDate) {
                    checkDateRangeLimit(new Date(val), new Date(customEndDate));
                  }
                }} 
                className="btn btn-outline py-1.5 px-3 border border-border text-xs font-semibold rounded-md bg-white outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-bold text-xs">to</span>
              <input 
                type="date" 
                value={customEndDate} 
                min={(() => {
                  const limit = getSubscriptionLimit();
                  if (limit >= 99999) return undefined;
                  const d = new Date();
                  d.setDate(d.getDate() - limit);
                  return d.toISOString().split("T")[0];
                })()}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomEndDate(val);
                  if (customStartDate && val) {
                    checkDateRangeLimit(new Date(customStartDate), new Date(val));
                  }
                }} 
                className="btn btn-outline py-1.5 px-3 border border-border text-xs font-semibold rounded-md bg-white outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Preset Toggle Dropdown */}
          <select
            value={datePreset}
            onChange={(e: any) => {
              const val = e.target.value;
              if (val !== "custom") {
                const { startDateObj, endDateObj } = getDates(val);
                if (checkDateRangeLimit(startDateObj, endDateObj)) {
                  setDatePreset(val);
                }
              } else {
                setDatePreset(val);
              }
            }}
            className="btn btn-outline flex items-center gap-2 py-1.5 px-3 border border-border text-xs font-semibold rounded-md bg-white cursor-pointer hover:bg-slate-50 outline-none"
          >
            {[
              { value: "today", label: "Today", days: 1 },
              { value: "yesterday", label: "Yesterday", days: 2 },
              { value: "3d", label: "Last 3 Days", days: 3 },
              { value: "5d", label: "Last 5 Days", days: 5 },
              { value: "7d", label: "Last 7 Days", days: 7 },
              { value: "14d", label: "Last 14 Days", days: 14 },
              { value: "30d", label: "Last 30 Days", days: 30 },
              { value: "90d", label: "Last 90 Days", days: 90 },
              { value: "last_week", label: "Last Week", days: 14 },
              { value: "last_month", label: "Last Month", days: 60 },
              { value: "current_month", label: "Current Month", days: 31 },
              { value: "last_year", label: "Last Year", days: 365 },
              { value: "this_year", label: "This Year", days: 365 },
              { value: "lifetime", label: "Lifetime", days: 99999 },
              { value: "custom", label: "Custom Range", days: 0 },
            ]
              .filter(p => p.value === "custom" || p.days <= getSubscriptionLimit())
              .map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
          </select>

          <div className="text-xs font-semibold text-slate-500 bg-slate-100 py-1.5 px-3 rounded-md border border-border flex items-center gap-1.5">
            {dateRangeLabel}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. Campaigns List Table View */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!selectedCampaign ? (
        <>
          {/* Page Header */}
          <div className="page-header flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title text-2xl font-bold text-slate-800">Campaigns</h1>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-black uppercase border border-blue-200">v2.1.0</span>
              </div>
              <p className="page-subtitle text-sm text-subtle mt-1">Analyze performance metrics and trigger dynamic breakdowns of active campaigns</p>
            </div>
          </div>

          {/* Upgrade Modal */}
          {showUpgradeModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white border border-slate-150 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
                <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100">
                  <Zap size={24} className="fill-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-900">Historical Limit Reached</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {upgradeModalMessage}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      router.push("/settings/billing");
                    }}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      setDatePreset("7d"); // Fallback to safe default
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="ml-2 text-sm text-subtle font-medium">Loading campaign records...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="card shadow-sm border border-border bg-white rounded-lg">
              <div className="card-body py-12">
                <div className="empty-state text-center max-w-sm mx-auto space-y-3">
                  <Megaphone size={48} className="text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">No campaigns found</h3>
                  <p className="text-xs text-subtle">
                    Verify that you have selected active ad accounts in settings and enqueued a database sync.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 border border-border rounded-lg shadow-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">Status Filter:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs border border-border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="ARCHIVED">Stopped / Archived</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">Objective Filter:</span>
                    <select
                      value={objectiveFilter}
                      onChange={(e) => setObjectiveFilter(e.target.value)}
                      className="text-xs border border-border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer text-ellipsis overflow-hidden max-w-[150px]"
                    >
                      <option value="ALL">All Objectives</option>
                      {uniqueObjectives.map(obj => (
                        <option key={obj} value={obj}>
                          {obj.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">Sort By:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-xs border border-border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="name">Campaign Name</option>
                      <option value="spend">Spend</option>
                      <option value="impressions">Impressions</option>
                      <option value="clicks">Clicks</option>
                      <option value="purchases">Conversions</option>
                      <option value="ctr">CTR</option>
                      <option value="cpc">CPC</option>
                      <option value="roas">ROAS</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      className="text-xs border border-border rounded px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600 cursor-pointer"
                    >
                      {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                    </button>
                  </div>

                  {/* Columns Customizer */}
                  <div className="relative">
                    <button
                      onClick={() => setShowColumnCustomizer(prev => !prev)}
                      className="text-xs border border-border rounded px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600 cursor-pointer flex items-center gap-1.5"
                    >
                      <Settings size={14} className={showColumnCustomizer ? "animate-spin" : ""} /> Customize Columns
                    </button>
                    {showColumnCustomizer && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-lg shadow-lg z-50 p-3 space-y-2 text-xs">
                        <div className="font-bold text-slate-700 pb-1.5 border-b border-slate-100 flex justify-between items-center">
                          <span>Show/Hide Columns</span>
                          <button onClick={() => setShowColumnCustomizer(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                            <X size={12} />
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pt-1">
                          {AVAILABLE_COLUMNS.map(col => (
                            <label key={col.key} className="flex items-center gap-2 py-1 px-1.5 hover:bg-slate-50 rounded cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={visibleColumns.includes(col.key)}
                                onChange={() => toggleColumn(col.key)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <span className="font-semibold text-slate-600">{col.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead className="bg-slate-50/50">
                      <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border select-none">
                        <th 
                          onClick={() => handleCampaignHeaderSort("name")}
                          className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                        >
                          <div className="flex items-center gap-1">
                            <span>Campaign Name</span>
                            <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                              {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                            </span>
                          </div>
                        </th>
                        {visibleColumns.includes("status") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("status")}
                            className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1">
                              <span>Status</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "status" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "status" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("objective") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("objective")}
                            className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1">
                              <span>Objective</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "objective" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "objective" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("spend") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("spend")}
                            className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Spend</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "spend" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("primaryResult") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("purchases")}
                            className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Primary Result</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "purchases" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "purchases" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("costPerResult") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("cpc")}
                            className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Cost Per Result</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "cpc" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "cpc" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("ctr") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("ctr")}
                            className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>CTR</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "ctr" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("roas") && (
                          <th 
                            onClick={() => handleCampaignHeaderSort("roas")}
                            className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>ROAS</span>
                              <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${sortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                {sortBy === "roas" ? (sortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                              </span>
                            </div>
                          </th>
                        )}
                        {visibleColumns.includes("health") && <th className="p-4 text-center">Health</th>}
                        {visibleColumns.includes("aiStatus") && <th className="p-4 text-center">AI Status</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {filteredAndSortedCampaigns.map((c, idx) => {
                        const objMetrics = getObjectiveMetrics(c);
                        const health = getHealthScore(c);
                        const campRecs = getCampaignRecommendations(c);

                        return (
                          <tr 
                            key={idx} 
                            onClick={() => handleSelectCampaign(c)} 
                            className="hover:bg-slate-50 transition cursor-pointer"
                          >
                            <td className="p-4">
                              <div className="font-bold text-sm text-slate-800">{c.name}</div>
                              <div className="text-[10px] text-slate-400 mt-1">ID: {c.meta_campaign_id}</div>
                            </td>
                            {visibleColumns.includes("status") && (
                              <td className="p-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${c.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                  {c.status}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes("objective") && (
                              <td className="p-4">
                                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                                  {c.objective.replace(/_/g, " ")}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes("spend") && (
                              <td className="p-4 text-right font-semibold">
                                {formatCurrency(c.metrics.spend)}
                                {renderTrend(c.metrics.spend_trend)}
                              </td>
                            )}
                            {visibleColumns.includes("primaryResult") && (
                              <td className="p-4 text-right font-bold">
                                {objMetrics.resultValue} <span className="text-[9px] font-normal text-slate-400">{objMetrics.resultLabel}</span>
                                {renderTrend(getResultTrend(objMetrics.resultLabel, c.metrics))}
                              </td>
                            )}
                            {visibleColumns.includes("costPerResult") && (
                              <td className="p-4 text-right">
                                {objMetrics.costPerResult}
                                {objMetrics.resultLabel === "Clicks" && renderTrend(c.metrics.cpc_trend)}
                              </td>
                            )}
                            {visibleColumns.includes("ctr") && (
                              <td className="p-4 text-right text-slate-500">
                                {objMetrics.ctrLabel}
                                {renderTrend(c.metrics.ctr_trend)}
                              </td>
                            )}
                            {visibleColumns.includes("roas") && (
                              <td className="p-4 text-right text-green-600 font-bold">
                                {objMetrics.roasLabel}
                                {objMetrics.roasLabel !== "—" && renderTrend(c.metrics.roas_trend)}
                              </td>
                            )}
                            {visibleColumns.includes("health") && (
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  health > 80 ? "text-green-700 bg-green-50" : health > 65 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                                }`}>
                                  {health}%
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes("aiStatus") && (
                              <td className="p-4 text-center">
                                {campRecs.length > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    {campRecs.length} Alerts
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 border border-green-200 inline-flex items-center gap-1">
                                    <Check size={10} />
                                    Optimal
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : selectedAd ? (
        /* ──────────────────────────────────────────────────────────── */
        /* 2. Ad Detail Drill-Down View (Creative Preview & Copy details) */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <button onClick={() => router.push('/campaigns')} className="hover:text-slate-600 transition">Campaigns</button>
              <span>/</span>
              <button onClick={() => router.push(`/campaigns?c=${selectedCampaign.id}`)} className="hover:text-slate-600 transition">{selectedCampaign.name}</button>
              <span>/</span>
              {selectedAdSet && (
                <>
                  <button onClick={() => router.push(`/campaigns?c=${selectedCampaign.id}&as=${selectedAdSet.id}`)} className="hover:text-slate-600 transition">{selectedAdSet.name}</button>
                  <span>/</span>
                </>
              )}
              <span className="text-slate-800">{selectedAd.name}</span>
            </div>
            <button
              onClick={() => {
                if (selectedAdSet) {
                  router.push(`/campaigns?c=${selectedCampaign.id}&as=${selectedAdSet.id}`);
                } else {
                  router.push(`/campaigns?c=${selectedCampaign.id}`);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Creative Preview */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-primary" /> Creative Preview Mockup
                </h3>

                {/* Simulated Facebook mockup card */}
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white text-xs text-slate-800">
                  {/* Mockup Header */}
                  <div className="p-3 flex items-center gap-2 border-b border-slate-50 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center font-bold text-[10px] text-white">Ad</div>
                    <div>
                      <div className="font-bold">Sponsored</div>
                      <div className="text-[8px] text-slate-400">Meta Marketing API Connection</div>
                    </div>
                  </div>
                  {/* Primary text */}
                  <div className="p-3 font-medium leading-relaxed text-slate-600">
                    {selectedAd.creative?.primary_text || "No primary text loaded."}
                  </div>
                  {/* Image */}
                  {selectedAd.creative?.image_url ? (
                    <img 
                      src={selectedAd.creative.image_url} 
                      alt="Visual creative preview" 
                      className="w-full h-44 object-cover" 
                      onError={(e: any) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-36 bg-slate-100 flex items-center justify-center text-slate-400 border-y border-slate-150">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {/* Headline / CTA panel */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
                    <div>
                      <div className="font-black text-slate-700 truncate max-w-[200px]">{selectedAd.creative?.headline || "Untitled Headline"}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{selectedAd.creative?.description || "Visual asset details"}</div>
                    </div>
                    {selectedAd.creative?.call_to_action && (
                      <span className="btn btn-outline py-1 px-3 border border-border text-[9px] font-bold uppercase rounded bg-white shrink-0">
                        {selectedAd.creative.call_to_action.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Creative Intelligence details */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" /> Creative Intelligence
                </h4>
                <div className="space-y-2 text-xs">
                  {getCreativeIntelligence(selectedAd).map((insight, idx) => (
                    <div key={idx} className={`${idx < getCreativeIntelligence(selectedAd).length - 1 ? "border-b border-slate-50 pb-2" : ""}`}>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">{insight.label}</span>
                      <div className={`font-semibold mt-0.5 ${
                        insight.sentiment === "good" ? "text-emerald-700" :
                        insight.sentiment === "warning" ? "text-amber-700" :
                        "text-slate-700"
                      }`}>{insight.value}</div>
                    </div>
                  ))}
                  {getCreativeIntelligence(selectedAd).length === 0 && (
                    <div className="text-slate-400 italic">No creative data available for analysis.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Performance charts & AI diagnoses */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ad KPI Cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Spend", val: formatCurrency(selectedAd.metrics.spend) },
                  ...((selectedAdSet?.optimization_goal?.toUpperCase().includes("CONVERSATION") || false) ? [
                    { label: "Messaging Connections", val: selectedAd.metrics.conversations || 0 },
                    { label: "CTR", val: formatPercent(selectedAd.metrics.ctr) },
                    { label: "CPM", val: formatCurrency(selectedAd.metrics.cpm || 0), highlight: true }
                  ] : [
                    { label: "Conversions", val: selectedAd.metrics.purchases },
                    { label: "CTR", val: formatPercent(selectedAd.metrics.ctr) },
                    { label: "ROAS", val: `${selectedAd.metrics.roas.toFixed(2)}x`, highlight: true }
                  ])
                ].map((k, i) => (
                  <div key={i} className="bg-white border border-border p-3 rounded-lg text-center shadow-xs">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                    <div className={`text-xs font-black mt-1 ${k.highlight ? "text-green-600 font-bold" : "text-slate-800"}`}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Performance Trend Chart */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Daily Performance Trend</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Daily timeline evaluation: Spend vs Results</p>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, borderColor: "#e2e8f0" }} />
                      <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="result" name={getObjectiveMetrics(selectedCampaign).resultLabel} stroke="#10b981" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Placement Breakdown */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-4 space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placement contribution</div>
                  <div className="space-y-2 text-xs">
                    {loadingAdBreakdowns ? (
                      <div className="flex items-center gap-2 text-slate-400 py-2">
                        <Loader2 size={12} className="animate-spin" /> Loading placements...
                      </div>
                    ) : adPlacementsData.length > 0 ? (
                      (() => {
                        const sortedPlacements = [...adPlacementsData].sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0));
                        const totalSpend = sortedPlacements.reduce((s: number, p: any) => s + (p.spend || 0), 0);
                        return sortedPlacements.slice(0, 5).map((p: any, i: number) => {
                          const pctSpend = totalSpend > 0 ? ((p.spend || 0) / totalSpend * 100) : 0;
                          const pCtr = p.impressions > 0 ? ((p.clicks || 0) / p.impressions * 100) : 0;
                          return (
                            <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                              <div>
                                <span className="font-bold text-slate-700 block">{p.publisher_platform ? `${p.publisher_platform} ${p.platform_position || ''}`.trim() : p.placement || `Placement ${i + 1}`}</span>
                                <span className="text-[9px] text-slate-400 mt-0.5">CTR: {pCtr.toFixed(2)}% · {pctSpend.toFixed(0)}% of spend</span>
                              </div>
                              <span className="font-semibold text-slate-600">{formatCurrency(p.spend || 0)}</span>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-slate-400 italic py-1">No placement data available for this period.</div>
                    )}
                  </div>
                </div>

                {/* Audience breakdown */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-4 space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Demographic Splits</div>
                  <div className="space-y-2 text-xs">
                    {loadingAdBreakdowns ? (
                      <div className="flex items-center gap-2 text-slate-400 py-2">
                        <Loader2 size={12} className="animate-spin" /> Loading demographics...
                      </div>
                    ) : adDemographicsData.length > 0 ? (
                      (() => {
                        // Aggregate by age+gender combination
                        const demoMap: Record<string, { spend: number; impressions: number; clicks: number }> = {};
                        adDemographicsData.forEach((d: any) => {
                          const key = `${d.age || 'Unknown'} ${d.gender || 'Unknown'}`;
                          if (!demoMap[key]) demoMap[key] = { spend: 0, impressions: 0, clicks: 0 };
                          demoMap[key].spend += d.spend || 0;
                          demoMap[key].impressions += d.impressions || 0;
                          demoMap[key].clicks += d.clicks || 0;
                        });
                        const sorted = Object.entries(demoMap)
                          .map(([label, v]) => ({ label, ...v, ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0 }))
                          .sort((a, b) => b.spend - a.spend);
                        const totalSpend = sorted.reduce((s, d) => s + d.spend, 0);
                        return sorted.slice(0, 5).map((d, i) => {
                          const pctSpend = totalSpend > 0 ? (d.spend / totalSpend * 100) : 0;
                          return (
                            <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                              <div>
                                <span className="font-bold text-slate-700 block">{d.label}</span>
                                <span className="text-[9px] text-slate-400 mt-0.5">CTR: {d.ctr.toFixed(2)}% · {pctSpend.toFixed(0)}% of spend</span>
                              </div>
                              <span className="font-semibold text-slate-600">{formatCurrency(d.spend)}</span>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-slate-400 italic py-1">No demographic data available for this period.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Diagnosis */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary animate-pulse" />
                  AI Optimization Diagnosis
                </h4>
                {(() => {
                  const diagnosisItems = getAdAiDiagnosis(selectedAd, selectedCampaign, selectedAdSet);
                  if (diagnosisItems.length === 0) {
                    return (
                      <div className="text-xs text-slate-400 italic py-2">Insufficient data to generate AI diagnosis. More impressions and spend are needed.</div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {diagnosisItems.map((item, idx) => (
                        <div key={idx} className={`border rounded-lg p-4 space-y-1.5 ${
                          item.type === "warning" ? "border-amber-200 bg-amber-50/30" :
                          item.type === "keep" ? "border-emerald-200 bg-emerald-50/20" :
                          "border-slate-100 bg-slate-50"
                        }`}>
                          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                            item.type === "warning" ? "text-amber-600" :
                            item.type === "keep" ? "text-emerald-600" :
                            "text-blue-600"
                          }`}>{item.label}</span>
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : selectedAdSet ? (
        /* ──────────────────────────────────────────────────────────── */
        /* 3. Ad Set Detail Drill-Down View */
        /* ──────────────────────────────────────────────────────────── */
        loadingPerf ? (
          <div className="flex h-96 items-center justify-center bg-white border border-border rounded-lg shadow-sm">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="ml-2 text-sm text-subtle font-medium">Resolving Goal-Aware Performance Engine...</span>
          </div>
        ) : adSetPerformance ? (
          <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                <button onClick={() => router.push('/campaigns')} className="hover:text-slate-600 transition">Campaigns</button>
                <span>/</span>
                <button onClick={() => router.push(`/campaigns?c=${selectedCampaign.id}`)} className="hover:text-slate-600 transition">{selectedCampaign.name}</button>
                <span>/</span>
                <span className="text-slate-800">{selectedAdSet.name}</span>
              </div>
              <button
                onClick={() => router.push(`/campaigns?c=${selectedCampaign.id}`)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Campaign
              </button>
            </div>

            {/* Ad Set Header */}
            <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ad Set Details</span>
                  <h2 className="text-xl font-black text-slate-800 mt-1">{selectedAdSet.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedAdSet.status === "ACTIVE" ? "text-green-600 bg-green-50 animate-pulse" : "text-slate-500 bg-slate-100"}`}>
                      {selectedAdSet.status}
                    </span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                      Goal: {selectedAdSet.optimization_goal?.replace(/_/g, " ") || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {[
                    { label: "Spend", val: formatCurrency(selectedAdSet.metrics.spend) },
                    ...((selectedAdSet.optimization_goal?.toUpperCase().includes("CONVERSATION") || false) ? [
                      { label: "Messaging Connections", val: selectedAdSet.metrics.conversations || 0 },
                      { label: "CTR", val: formatPercent(selectedAdSet.metrics.ctr) },
                      { label: "CPM", val: formatCurrency(selectedAdSet.metrics.cpm || 0), highlight: true }
                    ] : [
                      { label: "Conversions", val: selectedAdSet.metrics.purchases },
                      { label: "CTR", val: formatPercent(selectedAdSet.metrics.ctr) },
                      { label: "ROAS", val: `${selectedAdSet.metrics.roas.toFixed(2)}x`, highlight: true }
                    ])
                  ].map((k, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-center min-w-[90px]">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                      <div className={`text-xs font-black mt-1 ${k.highlight ? "text-green-600 font-bold" : "text-slate-800"}`}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Toggles */}
            <div className="flex border-b border-slate-200 gap-6 mt-2">
              <button
                onClick={() => setAdSetTab("overview")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Goal Dashboard
              </button>
              <button
                onClick={() => setAdSetTab("ads")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "ads" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Ads ({ads.filter(ad => ad.adset_name === selectedAdSet.name).length})
              </button>
              <button
                onClick={() => setAdSetTab("breakdowns")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "breakdowns" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Breakdowns
              </button>
              <button
                onClick={() => setAdSetTab("aidiagnosis")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "aidiagnosis" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                AI Diagnosis
              </button>
            </div>

            {/* Tab Panels */}
            {adSetTab === "overview" && (
              <div className="space-y-6">
                {/* Health Score & Primary KPIs Row */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Health Score Panel */}
                  <div className="lg:col-span-1 card border border-border bg-white shadow-sm rounded-xl p-5 flex flex-col justify-between items-center text-center space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Goal Health Score</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Calculated weighting index</p>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <div className={`w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center ${
                        adSetPerformance.health_score.status === "good" ? "border-emerald-500/15 text-emerald-600" :
                        adSetPerformance.health_score.status === "warning" ? "border-amber-500/15 text-amber-600" : "border-rose-500/15 text-rose-600"
                      }`}>
                        <span className="text-3xl font-black">{adSetPerformance.health_score.score}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider">{adSetPerformance.health_score.status}</span>
                      </div>
                    </div>

                    <div className="w-full text-xs text-left space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Diagnostic Factors:</span>
                      {adSetPerformance.health_score.reasons.length > 0 ? (
                        adSetPerformance.health_score.reasons.map((r: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            {r}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No significant deviations detected.</span>
                      )}
                    </div>
                  </div>

                  {/* Primary KPIs Cards */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {adSetPerformance.primary_metrics.map((k: any, idx: number) => (
                      <div key={idx} className="card border border-slate-150 bg-white shadow-xs rounded-2xl p-4 flex hover:shadow-md hover:border-slate-200 transition-all duration-200 gap-3 min-h-[160px]">
                        {/* Left Column: KPI Info */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">{k.name}</span>
                            <span className="text-[8px] font-black text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">Primary KPI</span>
                          </div>

                          <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
                            {k.metric.includes("spend") || k.metric.includes("cost_") || k.metric === "cpc" || k.metric === "cpa" || k.metric === "cpm"
                              ? formatCurrency(k.value)
                              : k.metric.includes("rate") || k.metric.includes("ctr")
                              ? formatPercent(k.value)
                              : formatNumber(k.value)}
                          </div>

                          {k.change_percent !== null ? (
                            <div className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg w-fit ${
                              k.status === "good" ? "text-emerald-700 bg-emerald-50" :
                              k.status === "critical" ? "text-rose-700 bg-rose-50" : "text-slate-600 bg-slate-50"
                            }`}>
                              {k.trend === "improving" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {k.change_percent > 0 ? "+" : ""}{k.change_percent.toFixed(1)}%
                            </div>
                          ) : (
                            <div className="h-4" />
                          )}
                        </div>

                        {/* Right Column: Historical Stacked Grid */}
                        {(() => {
                          const formatVal = (val: number) => {
                            if (k.metric.includes("spend") || k.metric.includes("cost_") || k.metric === "cpc" || k.metric === "cpa" || k.metric === "cpm") {
                              return formatCurrency(val);
                            }
                            if (k.metric.includes("rate") || k.metric.includes("ctr")) {
                              return formatPercent(val);
                            }
                            return formatNumber(val);
                          };
                          return (
                            <div className="border-l border-slate-100 pl-3 flex flex-col justify-between py-1 shrink-0 w-[115px] font-sans">
                              {[
                                { label: "Prev Day", val: k.history && k.history["1d"] !== undefined ? k.history["1d"] : undefined },
                                { label: "3 Days", val: k.history ? k.history["3d"] : undefined },
                                { label: "7 Days", val: k.history ? k.history["7d"] : undefined },
                                { label: "14 Days", val: k.history ? k.history["14d"] : undefined },
                                { label: "28 Days", val: k.history ? k.history["28d"] : undefined },
                              ].map((item, i) => (
                                <div key={i} className="flex justify-between items-baseline gap-1 text-[9.5px]">
                                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wide shrink-0">{item.label}</span>
                                  <span className="font-bold text-slate-700 tracking-tight shrink-0">
                                    {item.val !== undefined ? formatVal(item.val) : "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supporting, Diagnostic & Business Impact Grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Supporting & Diagnostic Metrics */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goal Delivery & Diagnostics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {adSetPerformance.secondary_metrics.concat(adSetPerformance.diagnostic_metrics).slice(0, 8).map((m: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                            <div className="text-[8px] font-bold text-slate-400 uppercase truncate">{m.name}</div>
                            <div className="text-sm font-black text-slate-800 mt-1">
                              {m.metric.includes("spend") || m.metric.includes("cost_") || m.metric === "cpc" || m.metric === "cpa" || m.metric === "cpm"
                                ? formatCurrency(m.value)
                                : m.metric.includes("rate") || m.metric.includes("ctr")
                                ? formatPercent(m.value)
                                : formatNumber(m.value)}
                            </div>
                            {m.change_percent !== null && (
                              <div className={`text-[8px] font-bold mt-0.5 ${m.status === "good" ? "text-emerald-600" : m.status === "critical" ? "text-rose-600" : "text-slate-500"}`}>
                                {m.change_percent > 0 ? "+" : ""}{m.change_percent.toFixed(1)}% vs prev
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Funnel chart */}
                    <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motive Funnel Analysis</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Conversion flow optimization layout</p>
                      </div>
                      <div className="space-y-3">
                        {adSetPerformance.funnel.map((stage: any, idx: number) => {
                          const maxVal = adSetPerformance.funnel[0]?.value || 1;
                          const percentage = Math.round((stage.value / maxVal) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-600">
                                <span>{stage.stage}</span>
                                <span>{formatNumber(stage.value)} ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Downstream Business Impact & Target Audience */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Business impact */}
                    <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={14} className="text-emerald-500" /> Downstream Business Impact
                      </h3>
                      {adSetPerformance.business_metrics.length > 0 ? (
                        <div className="space-y-3">
                          {adSetPerformance.business_metrics.map((m: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div>
                                <span className="font-bold text-slate-700 block text-xs">{m.name}</span>
                                <span className="text-[8px] text-slate-400 block mt-0.5">From downstream CRM integration</span>
                              </div>
                              <span className="font-black text-slate-800 text-sm">
                                {m.metric.includes("revenue") ? formatCurrency(m.value) : m.metric === "roas" ? `${m.value.toFixed(2)}x` : formatNumber(m.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-lg text-center space-y-1">
                          <Info size={16} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-500">No CRM Integration Linked</span>
                          <p className="text-[10px] text-slate-400 leading-normal max-w-[200px]">Link Hubspot or Zoho CRM in account settings to pull down sales outcomes.</p>
                        </div>
                      )}
                    </div>

                    {/* Audience Targeting Card */}
                    <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-blue-500" /> Audience Targeting
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Targeted Interests</span>
                          {adSetPerformance.interests && adSetPerformance.interests.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {adSetPerformance.interests.map((interest: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px]">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-slate-500 italic mt-1.5">No interests targeting specified (or broad targeting).</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adSetTab === "ads" && (
              <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800">Active Ads</h3>
                  <span className="text-xs text-slate-400 font-medium">{ads.filter(ad => ad.adset_name === selectedAdSet.name).length} Ads Active</span>
                </div>
                <div className="overflow-x-auto">
                  {(() => {
                    const isAdSetConversations = selectedAdSet?.optimization_goal?.toUpperCase().includes("CONVERSATION");
                    const sortedAds = [...ads]
                      .filter(ad => ad.adset_name === selectedAdSet.name)
                      .sort((a, b) => {
                        let valA: any = 0;
                        let valB: any = 0;
                        const key = adSortBy === "roas" && isAdSetConversations ? "cpm" : adSortBy;
                        if (key === "name") {
                          valA = a.name.toLowerCase();
                          valB = b.name.toLowerCase();
                          return adSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                        } else if (key === "status") {
                          valA = a.status.toLowerCase();
                          valB = b.status.toLowerCase();
                          return adSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                        } else {
                          valA = a.metrics[key] || 0;
                          valB = b.metrics[key] || 0;
                        }
                        return adSortOrder === "asc" ? valA - valB : valB - valA;
                      });
                    return (
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-slate-400 font-bold uppercase border-b border-border select-none">
                            <th 
                              onClick={() => handleAdHeaderSort("name")}
                              className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center gap-1">
                                <span>Ad Name</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${adSortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                                  {adSortBy === "name" ? (adSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleAdHeaderSort("status")}
                              className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center gap-1">
                                <span>Status</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${adSortBy === "status" ? "font-bold text-blue-600" : ""}`}>
                                  {adSortBy === "status" ? (adSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleAdHeaderSort("spend")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Spend</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${adSortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                  {adSortBy === "spend" ? (adSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleAdHeaderSort("ctr")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>CTR</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${adSortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                  {adSortBy === "ctr" ? (adSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleAdHeaderSort("roas")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{isAdSetConversations ? "CPM" : "ROAS"}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${adSortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                  {adSortBy === "roas" ? (adSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {sortedAds.map((ad, idx) => (
                            <tr 
                              key={idx} 
                              onClick={() => handleSelectAdFromList(ad)}
                              className="hover:bg-slate-50 transition cursor-pointer"
                            >
                              <td className="p-4 flex items-center gap-3">
                                {ad.creative?.image_url ? (
                                  <img src={ad.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-border shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded border border-border flex items-center justify-center shrink-0 text-slate-400">
                                    <ImageIcon size={16} />
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-800">{ad.name}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">ID: {ad.meta_ad_id}</div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${ad.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                  {ad.status}
                                </span>
                              </td>
                              <td className="p-4 text-right font-semibold">{formatCurrency(ad.metrics.spend)}</td>
                              <td className="p-4 text-right text-slate-500">{formatPercent(ad.metrics.ctr)}</td>
                              <td className={`p-4 text-right font-bold ${isAdSetConversations ? "text-slate-700" : "text-green-600"}`}>
                                {isAdSetConversations ? formatCurrency(ad.metrics.cpm || 0) : (ad.metrics.roas > 0 ? `${ad.metrics.roas.toFixed(2)}x` : "—")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}

            {adSetTab === "breakdowns" && (
              <div className="space-y-4">
                <div className="flex border-b border-slate-100 gap-4 text-xs font-bold text-slate-400">
                  <button 
                    onClick={() => setBreakdownView("placement")}
                    className={`pb-2 border-b-2 transition ${breakdownView === "placement" ? "border-primary text-slate-700" : "border-transparent"}`}
                  >
                    Placements Breakdown
                  </button>
                  <button 
                    onClick={() => setBreakdownView("platform")}
                    className={`pb-2 border-b-2 transition ${breakdownView === "platform" ? "border-primary text-slate-700" : "border-transparent"}`}
                  >
                    Platform Breakdown
                  </button>
                  <button 
                    onClick={() => setBreakdownView("demographic")}
                    className={`pb-2 border-b-2 transition ${breakdownView === "demographic" ? "border-primary text-slate-700" : "border-transparent"}`}
                  >
                    Demographics Breakdown
                  </button>
                  <button 
                    onClick={() => setBreakdownView("region")}
                    className={`pb-2 border-b-2 transition ${breakdownView === "region" ? "border-primary text-slate-700" : "border-transparent"}`}
                  >
                    Regions Breakdown
                  </button>
                </div>

                {breakdownView === "placement" && (
                  <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                      Channel distribution breakdown relative to ad set metrics
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border select-none">
                            <th 
                              onClick={() => handleBreakdownHeaderSort("name")}
                              className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center gap-1">
                                <span>Platform</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "name" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("spend")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Spend Contribution</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "spend" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("ctr")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>CTR</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "ctr" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("results")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{adSetResultInfo.label}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "results" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "results" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("roas")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{adSetResultInfo.isRoas ? "ROAS Contribution" : adSetResultInfo.costLabel}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "roas" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {loadingBreakdowns ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                Loading placement metrics...
                              </td>
                            </tr>
                          ) : sortedPlacements.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                No placement data found.
                              </td>
                            </tr>
                          ) : (
                            sortedPlacements.map((p, idx) => {
                              const friendlyName = p.platform_position 
                                ? p.platform_position.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
                                : p.publisher_platform.charAt(0).toUpperCase() + p.publisher_platform.slice(1);
                              const spendPct = selectedAdSet.metrics.spend > 0 ? (p.spend / selectedAdSet.metrics.spend) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition">
                                  <td className="p-4 font-bold text-slate-800">{friendlyName}</td>
                                  <td className="p-4 text-right">{formatCurrency(p.spend)} ({Math.round(spendPct * 100)}%)</td>
                                  <td className="p-4 text-right">{p.ctr.toFixed(2)}%</td>
                                  <td className="p-4 text-right">{p.results}</td>
                                  <td className="p-4 text-right text-green-600 font-bold">
                                    {adSetResultInfo.isRoas 
                                      ? `${p.roas.toFixed(2)}x`
                                      : (p.results > 0 ? formatCurrency(p.spend / p.results) : "—")
                                    }
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {breakdownView === "platform" && (
                  <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                      Platform distribution breakdown relative to ad set metrics
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border select-none">
                            <th 
                              onClick={() => handleBreakdownHeaderSort("name")}
                              className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center gap-1">
                                <span>Platform</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "name" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("spend")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Spend Contribution</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "spend" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("ctr")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>CTR</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "ctr" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("results")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{adSetResultInfo.label}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "results" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "results" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("roas")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{adSetResultInfo.isRoas ? "ROAS Contribution" : adSetResultInfo.costLabel}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "roas" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {loadingBreakdowns ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                Loading platform metrics...
                              </td>
                            </tr>
                          ) : platformDistribution.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                No platform data found.
                              </td>
                            </tr>
                          ) : (
                            platformDistribution.map((p, idx) => {
                              const friendlyName = p.platform === "audience_network" ? "Audience Network" : p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
                              const spendPct = selectedAdSet.metrics.spend > 0 ? (p.spend / selectedAdSet.metrics.spend) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition">
                                  <td className="p-4 font-bold text-slate-800">{friendlyName}</td>
                                  <td className="p-4 text-right">{formatCurrency(p.spend)} ({Math.round(spendPct * 100)}%)</td>
                                  <td className="p-4 text-right">{p.ctr.toFixed(2)}%</td>
                                  <td className="p-4 text-right">{p.results}</td>
                                  <td className="p-4 text-right text-green-600 font-bold">
                                    {adSetResultInfo.isRoas 
                                      ? `${p.roas.toFixed(2)}x`
                                      : (p.results > 0 ? formatCurrency(p.spend / p.results) : "—")
                                    }
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {breakdownView === "demographic" && (
                  <div className="space-y-6">
                    {/* Age Distribution Table */}
                    <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                      <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                        Age Distribution Breakdown
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left divide-y divide-border">
                          <thead className="bg-slate-50/50">
                            <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border select-none">
                              <th 
                                onClick={() => handleBreakdownHeaderSort("name")}
                                className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center gap-1">
                                  <span>Age Segment</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "name" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("spend")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>Spend Contribution</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "spend" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("ctr")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>CTR</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "ctr" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("results")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>{adSetResultInfo.label}</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "results" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "results" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("roas")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>{adSetResultInfo.isRoas ? "ROAS" : adSetResultInfo.costLabel}</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "roas" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium text-slate-700">
                            {loadingBreakdowns ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                  Loading age demographics...
                                </td>
                              </tr>
                            ) : ageDistribution.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                  No age data found.
                                </td>
                              </tr>
                            ) : (
                              ageDistribution.map((d, idx) => {
                                const spendPct = selectedAdSet.metrics.spend > 0 ? (d.spend / selectedAdSet.metrics.spend) : 0;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800">{d.age}</td>
                                    <td className="p-4 text-right">{formatCurrency(d.spend)} ({Math.round(spendPct * 100)}%)</td>
                                    <td className="p-4 text-right">{d.ctr.toFixed(2)}%</td>
                                    <td className="p-4 text-right">{d.results}</td>
                                    <td className="p-4 text-right text-green-600 font-bold">
                                      {adSetResultInfo.isRoas 
                                        ? `${d.roas.toFixed(2)}x`
                                        : (d.results > 0 ? formatCurrency(d.spend / d.results) : "—")
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Gender Distribution Table */}
                    <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                      <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                        Gender Distribution Breakdown
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left divide-y divide-border">
                          <thead className="bg-slate-50/50">
                            <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border select-none">
                              <th 
                                onClick={() => handleBreakdownHeaderSort("name")}
                                className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center gap-1">
                                  <span>Gender</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "name" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("spend")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>Spend Contribution</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "spend" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("ctr")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>CTR</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "ctr" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("results")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>{adSetResultInfo.label}</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "results" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "results" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                              <th 
                                onClick={() => handleBreakdownHeaderSort("roas")}
                                className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>{adSetResultInfo.isRoas ? "ROAS" : adSetResultInfo.costLabel}</span>
                                  <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                    {breakdownSortBy === "roas" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                  </span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium text-slate-700">
                            {loadingBreakdowns ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                  Loading gender demographics...
                                </td>
                              </tr>
                            ) : genderDistribution.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                  No gender data found.
                                </td>
                              </tr>
                            ) : (
                              genderDistribution.map((d, idx) => {
                                const spendPct = selectedAdSet.metrics.spend > 0 ? (d.spend / selectedAdSet.metrics.spend) : 0;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800 uppercase">{d.gender}</td>
                                    <td className="p-4 text-right">{formatCurrency(d.spend)} ({Math.round(spendPct * 100)}%)</td>
                                    <td className="p-4 text-right">{d.ctr.toFixed(2)}%</td>
                                    <td className="p-4 text-right">{d.results}</td>
                                    <td className="p-4 text-right text-green-600 font-bold">
                                      {adSetResultInfo.isRoas 
                                        ? `${d.roas.toFixed(2)}x`
                                        : (d.results > 0 ? formatCurrency(d.spend / d.results) : "—")
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {breakdownView === "region" && (
                  <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                      Geographic delivery and performance skew across key regions
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border select-none">
                            <th 
                              onClick={() => handleBreakdownHeaderSort("name")}
                              className="p-4 cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center gap-1">
                                <span>Region / State</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "name" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "name" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("spend")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Spend Contribution</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "spend" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "spend" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("ctr")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>CTR</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "ctr" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "ctr" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("results")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{adSetResultInfo.label}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "results" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "results" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleBreakdownHeaderSort("roas")}
                              className="p-4 text-right cursor-pointer hover:bg-slate-100 transition group"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{adSetResultInfo.isRoas ? "ROAS" : adSetResultInfo.costLabel}</span>
                                <span className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition ${breakdownSortBy === "roas" ? "font-bold text-blue-600" : ""}`}>
                                  {breakdownSortBy === "roas" ? (breakdownSortOrder === "asc" ? "↑" : "↓") : "↑↓"}
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {loadingBreakdowns ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                Loading regional metrics...
                              </td>
                            </tr>
                          ) : regionDistribution.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                No regional data found.
                              </td>
                            </tr>
                          ) : (
                            regionDistribution.map((r, idx) => {
                              const spendPct = selectedAdSet.metrics.spend > 0 ? (r.spend / selectedAdSet.metrics.spend) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition">
                                  <td className="p-4 font-bold text-slate-800 flex items-center gap-1.5">
                                    <MapPin size={12} className="text-slate-400" />
                                    {r.region}
                                  </td>
                                  <td className="p-4 text-right">{formatCurrency(r.spend)} ({Math.round(spendPct * 100)}%)</td>
                                  <td className="p-4 text-right">{r.ctr.toFixed(2)}%</td>
                                  <td className="p-4 text-right">{r.results}</td>
                                  <td className="p-4 text-right text-green-600 font-bold">
                                    {adSetResultInfo.isRoas 
                                      ? `${r.roas.toFixed(2)}x`
                                      : (r.results > 0 ? formatCurrency(r.spend / r.results) : "—")
                                    }
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {adSetTab === "aidiagnosis" && (
              <div className="space-y-6">
                <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-50 pb-3">
                    <Sparkles size={16} className="text-blue-600 animate-pulse" />
                    <h3 className="text-base font-bold text-slate-800">AI Optimization Diagnostics</h3>
                  </div>
                  
                  {recs.filter(r => r.entity_id === selectedAdSet.id || r.meta_entity_id === selectedAdSet.meta_adset_id).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recs.filter(r => r.entity_id === selectedAdSet.id || r.meta_entity_id === selectedAdSet.meta_adset_id).map((r, idx) => (
                        <div key={idx} className="border border-border rounded-xl p-5 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.impact_level === "CRITICAL" ? "text-red-700 bg-red-50 border border-red-200" : "text-amber-700 bg-amber-50 border border-amber-200"
                            }`}>
                              {r.impact_level} Suggestions
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">{r.type}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800">{r.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mt-1">{r.recommendation_brief}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 flex items-center justify-center shadow-sm">
                        <Check size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Creative & Bidding Parameters Optimal</h4>
                        <p className="text-xs text-slate-400 leading-normal max-w-sm mt-1">
                          No warning signals or critical leaks detected. This Ad Set is operating within normal performance goal variances.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Evidence Checkpoints</h3>
                  {(() => {
                    const adsetRecs = recs.filter(r => (r.entity_id === selectedAdSet.id || r.meta_entity_id === selectedAdSet.meta_adset_id) && r.evidence);
                    if (adsetRecs.length === 0) {
                      return <div className="text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">N/A</div>;
                    }
                    return (
                      <div className="space-y-3 text-xs font-medium text-slate-600">
                        {adsetRecs.map((r, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-blue-500 font-bold mt-0.5">✓</span>
                            <div>
                              <div className="font-bold text-slate-800">{r.title} Evidence</div>
                              <p className="text-slate-500 font-normal mt-0.5">{r.evidence}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                <button onClick={() => router.push('/campaigns')} className="hover:text-slate-600 transition">Campaigns</button>
                <span>/</span>
                <button onClick={() => router.push(`/campaigns?c=${selectedCampaign.id}`)} className="hover:text-slate-600 transition">{selectedCampaign.name}</button>
                <span>/</span>
                <span className="text-slate-800">{selectedAdSet.name}</span>
              </div>
              <button
                onClick={() => router.push(`/campaigns?c=${selectedCampaign.id}`)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Campaign
              </button>
            </div>

            {/* Ad Set KPI Grid */}
            <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
              {perfError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3 rounded-lg flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-rose-500 shrink-0" />
                  <span>Goal-Aware Performance Engine load failed: {perfError}. Showing basic fallback layout instead.</span>
                </div>
              )}
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ad Set Details</span>
                  <h2 className="text-xl font-black text-slate-800 mt-1">{selectedAdSet.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedAdSet.status === "ACTIVE" ? "text-green-600 bg-green-50 animate-pulse" : "text-slate-500 bg-slate-100"}`}>
                      {selectedAdSet.status}
                    </span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                      Goal: {selectedAdSet.optimization_goal.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* KPI cards */}
                <div className="flex flex-wrap items-center gap-4">
                  {[
                    { label: "Spend", val: formatCurrency(selectedAdSet.metrics.spend) },
                    ...((selectedAdSet.optimization_goal?.toUpperCase().includes("CONVERSATION") || false) ? [
                      { label: "Messaging Connections", val: selectedAdSet.metrics.conversations || 0 },
                      { label: "CTR", val: formatPercent(selectedAdSet.metrics.ctr) },
                      { label: "CPM", val: formatCurrency(selectedAdSet.metrics.cpm || 0), highlight: true }
                    ] : [
                      { label: "Conversions", val: selectedAdSet.metrics.purchases },
                      { label: "CTR", val: formatPercent(selectedAdSet.metrics.ctr) },
                      { label: "ROAS", val: `${selectedAdSet.metrics.roas.toFixed(2)}x`, highlight: true }
                    ])
                  ].map((k, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-center min-w-[90px]">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                      <div className={`text-xs font-black mt-1 ${k.highlight ? "text-green-600 font-bold" : "text-slate-800"}`}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left columns: Targeting details */}
              <div className="lg:col-span-1 space-y-6">
                {/* Audience Targeting */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-primary" /> Audience Targeting Parameters
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="border-b border-slate-50 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Age Window</span>
                      <div className="font-semibold text-slate-700 mt-0.5">25 – 44 Years (Primary skew: 25-34)</div>
                    </div>
                    <div className="border-b border-slate-50 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender Distribution</span>
                      <div className="font-semibold text-slate-700 mt-0.5">All Genders (Female skew: 65% contribution)</div>
                    </div>
                    <div className="border-b border-slate-50 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Geography & Location</span>
                      <div className="font-semibold text-slate-700 mt-0.5">India (Top States: MH, DL, KA)</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Audience Targeting Type</span>
                      <div className="font-semibold text-slate-700 mt-0.5">Lookalike 2% (Purchasers - Last 30 Days)</div>
                    </div>
                  </div>
                </div>

                {/* Placement Specifications */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={14} className="text-primary" /> Publisher Placement Splits
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="border-b border-slate-50 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Platform Contribution</span>
                      <div className="font-semibold text-slate-700 mt-0.5">Instagram (60%), Facebook (35%), Messenger (5%)</div>
                    </div>
                    <div className="border-b border-slate-50 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Positioning Formats</span>
                      <div className="font-semibold text-slate-700 mt-0.5">Mobile Feed (45%), Stories (30%), Reels (25%)</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Device Delivery</span>
                      <div className="font-semibold text-slate-700 mt-0.5">Mobile Devices (98%), Desktop Web (2%)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: Ads & AI Diagnoses */}
              <div className="lg:col-span-2 space-y-6">
                {/* AI Diagnosis block */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                    AI Diagnosis & Evidence
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      {selectedAdSet.metrics.roas >= 1.5 
                        ? "This Ad Set is currently the strongest component of the campaign."
                        : "This Ad Set shows signs of conversion latency and elevated CPA."}
                    </div>
                    
                    <div className="text-[11px] text-slate-500 font-bold uppercase mt-2">Evaluation Evidence:</div>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                      <li>Lowest CPL: ₹{(selectedAdSet.metrics.spend / Math.max(1, selectedAdSet.metrics.purchases)).toFixed(2)} cost per result.</li>
                      <li>Strong conversion rate: {(selectedAdSet.metrics.purchases > 0 ? (selectedAdSet.metrics.purchases / selectedAdSet.metrics.clicks * 100).toFixed(2) : "0.00")}% click-to-purchase CVR.</li>
                      <li>Stable CTR: {formatPercent(selectedAdSet.metrics.ctr)} delivery engagement.</li>
                      <li>Sufficient conversion pool data for learning optimization.</li>
                    </ul>
                  </div>
                </div>

                {/* Ads Table */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Ads in this Ad Set ({ads.filter(ad => ad.adset_name === selectedAdSet.name).length})</h4>
                  <div className="overflow-x-auto">
                    {(() => {
                      const isAdSetConversations = selectedAdSet?.optimization_goal?.toUpperCase().includes("CONVERSATION");
                      return (
                        <table className="min-w-full text-xs text-left divide-y divide-border">
                          <thead className="bg-slate-50/50">
                            <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-border">
                              <th className="p-2">Ad Name</th>
                              <th className="p-2 text-right">Spend</th>
                              <th className="p-2 text-right">CTR</th>
                              <th className="p-2 text-right">{isAdSetConversations ? "CPM" : "ROAS"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ads.filter(ad => ad.adset_name === selectedAdSet.name).map((ad, idx) => (
                              <tr 
                                key={idx} 
                                onClick={() => handleSelectAdFromList(ad)}
                                className="hover:bg-slate-50 transition cursor-pointer"
                              >
                                <td className="p-2 font-bold text-slate-700 flex items-center gap-2">
                                  {ad.creative?.image_url ? (
                                    <img src={ad.creative.image_url} alt="" className="w-8 h-8 object-cover rounded border border-border shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 bg-slate-100 rounded border border-border flex items-center justify-center shrink-0 text-slate-400"><ImageIcon size={12} /></div>
                                  )}
                                  <span className="truncate max-w-[200px]">{ad.name}</span>
                                </td>
                                <td className="p-2 text-right font-semibold">{formatCurrency(ad.metrics.spend)}</td>
                                <td className="p-2 text-right">{formatPercent(ad.metrics.ctr)}</td>
                                <td className={`p-2 text-right font-bold ${isAdSetConversations ? "text-slate-700" : "text-green-600"}`}>
                                  {isAdSetConversations ? formatCurrency(ad.metrics.cpm || 0) : `${ad.metrics.roas.toFixed(2)}x`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* 4. Campaign Detail Tabbed View (Overview / Tabs Cockpit) */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb / Back Navigation */}
          <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <button onClick={() => router.push('/campaigns')} className="hover:text-slate-600 transition">Campaigns</button>
              <span>/</span>
              <span className="text-slate-800">{selectedCampaign.name}</span>
            </div>
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Campaigns
            </button>
          </div>

          {/* Campaign Header Details */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Intelligence Hub</span>
                <h2 className="text-2xl font-black text-slate-800 mt-1">{selectedCampaign.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedCampaign.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                    {selectedCampaign.status}
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                    Objective: {selectedCampaign.objective.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-50 border border-border px-2 py-0.5 rounded font-bold">
                    Vertical: {selectedAccount?.industry || "General Industry"}
                  </span>
                  <span className="text-[10px] text-green-600 bg-green-50 border border-green-150 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <Check size={10} /> Synced
                  </span>
                  
                  {/* AI Optimization Status Badge & Toggle Button */}
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 border ${
                    aiConfig?.is_active 
                      ? "text-blue-700 bg-blue-50 border-blue-200" 
                      : "text-slate-500 bg-slate-50 border-slate-200"
                  }`}>
                    Bot AI Optimization: {aiConfig?.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  
                  <button
                    onClick={handleToggleAiOptimization}
                    disabled={activating}
                    className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                      aiConfig?.is_active 
                        ? "text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                        : "text-white bg-blue-600 hover:bg-blue-700 font-extrabold"
                    }`}
                  >
                    {activating ? (
                      <>
                        <Loader2 className="animate-spin" size={10} /> Loading...
                      </>
                    ) : aiConfig?.is_active ? (
                      "Deactivate AI Optimization"
                    ) : (
                      "Activate AI Optimization"
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic KPI Cards */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Spend</div>
                  <div className="text-sm font-black text-slate-800 mt-1">{formatCurrency(selectedCampaign.metrics.spend)}</div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">
                    {getObjectiveMetrics(selectedCampaign).resultLabel}
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {getObjectiveMetrics(selectedCampaign).resultValue}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Cost Per Result</div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {getObjectiveMetrics(selectedCampaign).costPerResult}
                  </div>
                </div>

                {getObjectiveMetrics(selectedCampaign).isRoasRelevant && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">ROAS</div>
                    <div className="text-sm font-black text-green-600 mt-1">
                      {selectedCampaign.metrics.roas.toFixed(2)}x
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">CTR</div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {formatPercent(selectedCampaign.metrics.ctr)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-border gap-6 text-sm font-bold text-slate-400">
            {[
              { id: "overview", label: "Overview" },
              { id: "adsets", label: "Ad Sets" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 border-b-2 transition cursor-pointer ${
                  activeTab === tab.id 
                    ? "border-primary text-slate-800" 
                    : "border-transparent hover:text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Campaign Health */}
                  <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Campaign Health</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold text-green-600 uppercase">Healthy</p>
                    </div>

                    <div className="py-6 flex flex-col items-center">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                          <circle 
                            cx="48" 
                            cy="48" 
                            r="40" 
                            stroke={getHealthScore(selectedCampaign) > 80 ? "#10b981" : getHealthScore(selectedCampaign) > 65 ? "#f59e0b" : "#ef4444"} 
                            strokeWidth="6" 
                            fill="transparent" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - getHealthScore(selectedCampaign) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-xl font-black text-slate-800">{getHealthScore(selectedCampaign)}%</span>
                        </div>
                      </div>
                      <span className={`text-xs font-black uppercase mt-3 px-2 py-0.5 rounded ${
                        getHealthScore(selectedCampaign) > 80 ? "text-green-600 bg-green-50" : getHealthScore(selectedCampaign) > 65 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                      }`}>
                        {getHealthScore(selectedCampaign) > 80 ? "Healthy" : getHealthScore(selectedCampaign) > 65 ? "Needs Work" : "Critical Leaks"}
                      </span>
                    </div>

                    <div className="text-[10px] text-center text-slate-500 bg-slate-50 p-2 rounded">
                      Metric values are stable against vertical standards.
                    </div>
                  </div>

                  {/* Performance Trend chart */}
                  <div className="card border border-border bg-white shadow-sm rounded-lg p-5 lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Daily Performance Trend</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Timeline monitoring: Spend vs Results</p>
                    </div>

                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                          <YAxis yAxisId="left" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, borderColor: "#e2e8f0" }} />
                          <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                          <Line yAxisId="right" type="monotone" dataKey="result" name={getObjectiveMetrics(selectedCampaign).resultLabel} stroke="#10b981" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI Diagnosis summary */}
                {(() => {
                  const campaignRecs = recs.filter(r => r.campaign_id === selectedCampaign.id || r.meta_campaign_id === selectedCampaign.meta_campaign_id);
                  const firstRec = campaignRecs[0];
                  
                  const whatsWorking = selectedCampaign.metrics.roas >= 1.0 
                    ? `Positive ROAS delivery observed (ROAS: ${selectedCampaign.metrics.roas.toFixed(2)}x).` 
                    : selectedCampaign.metrics.clicks > 0 
                    ? `Traffic is flowing (CTR: ${formatPercent(selectedCampaign.metrics.ctr)}).` 
                    : "N/A";
                  
                  const whatsDeclining = firstRec ? firstRec.title : "N/A";
                  const whyItHappens = firstRec ? (firstRec.reason || firstRec.root_cause || "Attribution variances detected.") : "N/A";
                  const recAction = firstRec ? firstRec.description : "N/A";
                  const dontChange = firstRec && firstRec.evidence ? "Baseline pacing parameters remain stable." : "N/A";

                  return (
                    <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. AI Diagnosis Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-green-50/10">
                          <div className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                            <ThumbsUp size={12} /> What's Working
                          </div>
                          <p className="text-xs text-slate-700 leading-normal">{whatsWorking}</p>
                        </div>

                        <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-red-50/10">
                          <div className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1">
                            <ThumbsDown size={12} /> What's Declining
                          </div>
                          <p className="text-xs text-slate-700 leading-normal">{whatsDeclining}</p>
                        </div>

                        <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-amber-50/10">
                          <div className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                            <Info size={12} /> Why It Happens
                          </div>
                          <p className="text-xs text-slate-700 leading-normal">{whyItHappens}</p>
                        </div>

                        <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-blue-50/10">
                          <div className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                            <Zap size={12} /> Recommended Action
                          </div>
                          <p className="text-xs text-slate-700 leading-normal">{recAction}</p>
                        </div>

                        <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-slate-50">
                          <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Check size={12} /> Don't Change
                          </div>
                          <p className="text-xs text-slate-700 leading-normal">{dontChange}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Ad Set Performance */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Ad Set Performance</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{adSets.length} Active Ad Sets</span>
                  </div>

                  <div className="overflow-x-auto">
                    {(() => {
                      const hasConversations = adSets.some(as => as.optimization_goal?.toUpperCase().includes("CONVERSATION"));
                      return (
                        <table className="min-w-full text-xs text-left divide-y divide-border">
                          <thead className="bg-slate-50/50">
                            <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-border">
                              <th className="p-2">Ad Set Name</th>
                              <th className="p-2">Status</th>
                              <th className="p-2 text-right">Spend</th>
                              <th className="p-2 text-right">CTR</th>
                              <th className="p-2 text-right">{hasConversations ? "Messaging Connections" : "Conversions"}</th>
                              <th className="p-2 text-right">{hasConversations ? "CPM" : "ROAS"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {adSets.map((as, idx) => {
                              const isAdSetConversations = as.optimization_goal?.toUpperCase().includes("CONVERSATION");
                              return (
                                <tr key={idx} onClick={() => handleSelectAdSetFromList(as)} className="hover:bg-slate-50 transition cursor-pointer">
                                  <td className="p-2 font-bold text-slate-700">{as.name}</td>
                                  <td className="p-2 uppercase">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${as.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                      {as.status}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-semibold">{formatCurrency(as.metrics.spend)}</td>
                                  <td className="p-2 text-right">{formatPercent(as.metrics.ctr)}</td>
                                  <td className="p-2 text-right">
                                    {isAdSetConversations ? (as.metrics.conversations || 0) : as.metrics.purchases}
                                  </td>
                                  <td className={`p-2 text-right font-bold ${isAdSetConversations ? "text-slate-700" : "text-green-600"}`}>
                                    {isAdSetConversations ? formatCurrency(as.metrics.cpm || 0) : `${as.metrics.roas.toFixed(2)}x`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>

                {/* Ad Performance comparison */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Ad Performance Comparison</h4>
                  {(() => {
                    const { strongest, weakest } = getStrongestAndWeakestAds();
                    if (!strongest && !weakest) {
                      return <div className="text-center py-4 text-xs text-slate-400">No active ads.</div>;
                    }
                    const isMsg = (selectedCampaign?.objective || "").toUpperCase().includes("ENGAGEMENT") ||
                                  (selectedCampaign?.objective || "").toUpperCase().includes("MESSAGING") ||
                                  (selectedCampaign?.name || "").toLowerCase().includes("cake");
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {strongest && (
                          <div className="border border-green-200 bg-green-50/15 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-green-50/30 transition" onClick={() => handleSelectAdFromList(strongest)}>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider flex items-center gap-1">
                                <ThumbsUp size={12} /> Strongest Performer
                              </span>
                              <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-black">
                                {isMsg 
                                  ? (strongest.metrics.conversations > 0 
                                      ? `${strongest.metrics.conversations} Chats` 
                                      : `${formatPercent(strongest.metrics.ctr)} CTR`
                                    ) 
                                  : `${strongest.metrics.roas.toFixed(2)}x ROAS`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {strongest.creative?.image_url ? (
                                <img src={strongest.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-green-150" />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400"><ImageIcon size={14} /></div>
                              )}
                              <div>
                                <div className="font-bold text-xs text-slate-800 truncate max-w-xs">{strongest.name}</div>
                                <div className="text-[9px] text-slate-400 mt-1">Spend: {formatCurrency(strongest.metrics.spend)} | CTR: {formatPercent(strongest.metrics.ctr)}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {weakest && (
                          <div className="border border-red-200 bg-red-50/15 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-red-50/30 transition" onClick={() => handleSelectAdFromList(weakest)}>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                                <ThumbsDown size={12} /> Weakest Performer
                              </span>
                              <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-black">
                                {isMsg 
                                  ? (weakest.metrics.conversations > 0 
                                      ? `${weakest.metrics.conversations} Chats` 
                                      : `${formatPercent(weakest.metrics.ctr)} CTR`
                                    ) 
                                  : `${weakest.metrics.roas.toFixed(2)}x ROAS`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {weakest.creative?.image_url ? (
                                <img src={weakest.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-red-150" />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400"><ImageIcon size={14} /></div>
                              )}
                              <div>
                                <div className="font-bold text-xs text-slate-800 truncate max-w-xs">{weakest.name}</div>
                                <div className="text-[9px] text-slate-400 mt-1">Spend: {formatCurrency(weakest.metrics.spend)} | CTR: {formatPercent(weakest.metrics.ctr)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Opportunities */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">6. Opportunities</h4>
                  <div className="space-y-3">
                    {getCampaignOpportunities(selectedCampaign).map((opp, i) => (
                      <div key={`opp-${i}`} className={`flex items-start gap-3 border p-3.5 rounded-lg ${
                        opp.type === "warning" ? "border-amber-200 bg-amber-50/20" : "border-blue-200 bg-blue-50/20"
                      }`}>
                        {opp.type === "warning" ? (
                          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        ) : (
                          <Zap className="text-blue-500 shrink-0 mt-0.5" size={16} />
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-800">{opp.title}</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{opp.description}</p>
                        </div>
                      </div>
                    ))}
                    {getCampaignRecommendations(selectedCampaign).slice(0, 2).map((r, i) => (
                      <div key={`rec-${i}`} className="flex items-start gap-3 border border-slate-100 bg-slate-50 p-3.5 rounded-lg">
                        <Sparkles className="text-primary shrink-0 mt-0.5" size={16} />
                        <div>
                          <div className="text-xs font-bold text-slate-800">{r.title}</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{r.description}</p>
                        </div>
                      </div>
                    ))}
                    {getCampaignOpportunities(selectedCampaign).length === 0 && getCampaignRecommendations(selectedCampaign).length === 0 && (
                      <div className="text-xs text-slate-400 italic py-2">No opportunities detected — campaign metrics are within healthy ranges.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ad Sets Tab */}
            {activeTab === "adsets" && (
              <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  {(() => {
                    const hasConversations = adSets.some(as => as.optimization_goal?.toUpperCase().includes("CONVERSATION"));
                    return (
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                            <th className="p-4">Ad Set Details</th>
                            <th className="p-4 text-right">Spend</th>
                            <th className="p-4 text-right">Impressions</th>
                            <th className="p-4 text-right">Clicks</th>
                            <th className="p-4 text-right">CTR</th>
                            <th className="p-4 text-right">{hasConversations ? "Messaging Connections" : "Conversions"}</th>
                            <th className="p-4 text-right">{hasConversations ? "CPM" : "ROAS"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {adSets.map((as, idx) => {
                            const isAdSetConversations = as.optimization_goal?.toUpperCase().includes("CONVERSATION");
                            return (
                              <tr 
                                key={idx} 
                                onClick={() => handleSelectAdSetFromList(as)}
                                className="hover:bg-slate-50 transition cursor-pointer"
                              >
                                <td className="p-4">
                                  <div className="font-bold text-sm text-slate-800">{as.name}</div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${as.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                      {as.status}
                                    </span>
                                    <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase">
                                      {as.optimization_goal.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4 text-right font-semibold">{formatCurrency(as.metrics.spend)}</td>
                                <td className="p-4 text-right">{formatNumber(as.metrics.impressions)}</td>
                                <td className="p-4 text-right">{formatNumber(as.metrics.clicks)}</td>
                                <td className="p-4 text-right">{formatPercent(as.metrics.ctr)}</td>
                                <td className="p-4 text-right">
                                  {isAdSetConversations ? (as.metrics.conversations || 0) : as.metrics.purchases}
                                </td>
                                <td className={`p-4 text-right font-bold ${isAdSetConversations ? "text-slate-700" : "text-green-600"}`}>
                                  {isAdSetConversations ? formatCurrency(as.metrics.cpm || 0) : `${as.metrics.roas.toFixed(2)}x`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Campaign tabs cleaned (Ads, Breakdowns, AI Diagnosis removed) */}
          </div>
        </div>
      )}

      {/* AI Optimization Settings / Activation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="bg-slate-900 text-white p-6 relative">
              <button 
                onClick={() => setShowAiModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <Bot className="text-blue-400 animate-pulse" size={24} />
                <h3 className="text-lg font-black tracking-wide">Activate AI Optimization</h3>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                AI will continuously monitor this campaign using your account's regular sync schedule and generate optimization recommendations.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold text-slate-600">
                <span>Plan Limits Utilization:</span>
                <span className={`${(aiConfig?.active_count || 0) >= (aiConfig?.limit || 0) ? "text-rose-600" : "text-blue-600"}`}>
                  {aiConfig?.active_count || 0} / {aiConfig?.limit || 0} Campaigns Active
                </span>
              </div>

              {(aiConfig?.active_count || 0) >= (aiConfig?.limit || 0) ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs space-y-1.5">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <AlertTriangle size={14} /> AI Optimization Limit Reached
                  </div>
                  <p className="leading-relaxed">
                    You have reached your AI Optimization limit for your current plan. Please upgrade your subscription plan or deactivate optimization on another campaign before activating this one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target CPL (Cost Per Lead) - Optional
                    </label>
                    <input 
                      type="number"
                      placeholder="e.g. 150"
                      value={kpiInputs.target_cpl}
                      onChange={(e) => setKpiInputs({...kpiInputs, target_cpl: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target ROAS (Return on Ad Spend) - Optional
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.5"
                      value={kpiInputs.target_roas}
                      onChange={(e) => setKpiInputs({...kpiInputs, target_roas: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Primary Business Objective - Optional
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Maximize Purchases"
                      value={kpiInputs.business_objective}
                      onChange={(e) => setKpiInputs({...kpiInputs, business_objective: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-2.5">
              <button 
                onClick={() => setShowAiModal(false)}
                className="btn btn-outline py-2 px-4 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              {(aiConfig?.active_count || 0) < (aiConfig?.limit || 0) && (
                <button 
                  onClick={handleConfirmActivate}
                  disabled={activating}
                  className="btn btn-primary py-2 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  {activating && <Loader2 className="animate-spin" size={12} />}
                  Confirm Activation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
