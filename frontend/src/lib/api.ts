/**
 * Digital Growth Studio — API Client
 * Communicates with the FastAPI backend.
 * Automatically injects the Firebase auth token when a user is signed in.
 */
import { auth } from "./firebase";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "https://digital-growth-studio-api.onrender.com/api/v1";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://digital-growth-studio-api.onrender.com/api/v1";
};

const API_BASE_URL = getBaseUrl();

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  public baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}, retries = 2): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const headersConfig: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    // Inject Firebase Auth ID token if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        headersConfig["Authorization"] = `Bearer ${token}`;
      } catch (tokenErr) {
        console.warn("Failed to retrieve Firebase ID token:", tokenErr);
      }
    }

    const isGet = method === "GET";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), isGet ? 8000 : 60000);

    const config: RequestInit = {
      method,
      headers: headersConfig,
      signal: controller.signal,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 && currentUser && retries > 0) {
          try {
            const newToken = await currentUser.getIdToken(true);
            headersConfig["Authorization"] = `Bearer ${newToken}`;
            return this.request<T>(endpoint, { ...options, headers: headersConfig }, retries - 1);
          } catch (refreshErr) {
            console.warn("Token refresh failed:", refreshErr);
          }
        }
        const error = await response.json().catch(() => ({ detail: "An error occurred" }));
        const errorMessage = typeof error.detail === "string"
          ? error.detail
          : JSON.stringify(error.detail) || `API error: ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (retries > 0 && (err.name === "TypeError" || err.name === "AbortError" || err.message?.includes("Failed to fetch"))) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw err;
    }
  }

  // Health Check
  async healthCheck() {
    return this.request<{ status: string; service: string; version: string }>("/health");
  }

  // Phase 1: Auth endpoints
  async getMe() {
    return this.request<{ uid: string; email: string; name: string; picture?: string; status: string }>("/auth/me");
  }

  // Phase 3: Meta Connection endpoints
  async getMetaStatus() {
    return this.request<{ connected: boolean; meta_user_name?: string; last_sync_at?: string }>("/meta/status");
  }

  async getMetaAccounts() {
    return this.request<Array<{
      id: string;
      name: string;
      currency: string;
      timezone: string;
      account_status: number;
      is_connected: boolean;
      industry?: string | null;
      ai_intelligence_status?: string | null;
      historical_intelligence_status?: string | null;
    }>>("/meta/accounts");
  }

  async selectMetaAccounts(accountIds: string[], industries?: Record<string, string>) {
    return this.request<{ status: string; message: string }>("/meta/accounts/select", {
      method: "POST",
      body: { account_ids: accountIds, industries: industries },
    });
  }

  async disconnectMeta() {
    return this.request<{ status: string; message: string }>("/meta/disconnect", {
      method: "POST",
    });
  }

  // Phase 6: Analytics Engine endpoints
  async getDashboardOverview(adAccountId: string, startDate: string, endDate: string, goal: string = "all") {
    return this.request<any>(
      `/dashboard/overview?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}&goal=${goal}`
    );
  }

  async getDashboardChart(adAccountId: string, startDate: string, endDate: string, goal: string = "all") {
    return this.request<any[]>(
      `/dashboard/chart?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}&goal=${goal}`
    );
  }

  async getDashboardHealth(adAccountId: string, goal: string = "all") {
    return this.request<any>(`/dashboard/health?ad_account_id=${adAccountId}&goal=${goal}`);
  }

  async getCampaigns(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/campaigns?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getAdSetPerformance(campaignId: string, adSetId: string, startDate: string, endDate: string) {
    return this.request<any>(
      `/campaigns/${campaignId}/adsets/${adSetId}/performance?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getCampaignDaily(campaignId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/campaigns/${campaignId}/daily?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getAdSetDaily(campaignId: string, adSetId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/campaigns/${campaignId}/adsets/${adSetId}/daily?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getAdDaily(adId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/ads/${adId}/daily?start_date=${startDate}&end_date=${endDate}`
    );
  }


  async getAds(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/ads?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getAdSets(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/ads/adsets?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getCreatives(adAccountId: string) {
    return this.request<any[]>(
      `/ads/creatives?ad_account_id=${adAccountId}`
    );
  }

  async getPlacements(adAccountId: string, campaignId?: string, adsetId?: string, startDate?: string, endDate?: string) {
    let url = `/ads/placements?ad_account_id=${adAccountId}`;
    if (campaignId) url += `&campaign_id=${campaignId}`;
    if (adsetId) url += `&adset_id=${adsetId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return this.request<any[]>(url);
  }

  async getDemographics(adAccountId: string, campaignId?: string, adsetId?: string, startDate?: string, endDate?: string) {
    let url = `/ads/demographics?ad_account_id=${adAccountId}`;
    if (campaignId) url += `&campaign_id=${campaignId}`;
    if (adsetId) url += `&adset_id=${adsetId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return this.request<any[]>(url);
  }

  async getRegions(adAccountId: string, campaignId?: string, adsetId?: string, startDate?: string, endDate?: string) {
    let url = `/ads/regions?ad_account_id=${adAccountId}`;
    if (campaignId) url += `&campaign_id=${campaignId}`;
    if (adsetId) url += `&adset_id=${adsetId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return this.request<any[]>(url);
  }

  async getAudiences(adAccountId: string) {
    return this.request<any[]>(
      `/ads/audiences?ad_account_id=${adAccountId}`
    );
  }

  async getSyncStatus() {
    return this.request<{ last_sync_at?: string; last_sync_status?: string; last_sync_error?: string; sync_interval_hours?: number }>(
      "/meta/sync/status"
    );
  }

  async triggerSync(adAccountId?: string) {
    return this.request<{ status: string; message: string }>("/meta/sync/trigger", {
      method: "POST",
      body: { ad_account_id: adAccountId },
    });
  }

  // AI Optimization endpoints
  async getCampaignAiConfig(campaignId: string) {
    return this.request<any>(`/campaigns/${campaignId}/ai-optimization`);
  }

  async activateCampaignAiConfig(campaignId: string, payload: any) {
    return this.request<any>(`/campaigns/${campaignId}/ai-optimization/activate`, {
      method: "POST",
      body: payload
    });
  }

  async deactivateCampaignAiConfig(campaignId: string) {
    return this.request<any>(`/campaigns/${campaignId}/ai-optimization/deactivate`, {
      method: "POST"
    });
  }

  async getAiOptimizationDashboard(adAccountId: string) {
    return this.request<any>(`/campaigns/ai-optimization/dashboard?ad_account_id=${adAccountId}`);
  }

  // AI Assistant endpoints
  async getAiCredits(adAccountId?: string) {
    const query = adAccountId ? `?ad_account_id=${adAccountId}` : "";
    return this.request<{
      credits: number;
      monthly_credits_remaining: number;
      purchased_credits_remaining: number;
      trial_credits_remaining: number;
      monthly_credits_limit: number;
      monthly_credits_used: number;
    }>(`/assistant/credits${query}`);
  }

  async getConversations(adAccountId: string) {
    return this.request<any[]>(`/assistant/conversations?ad_account_id=${adAccountId}`);
  }

  async createConversation(adAccountId: string, title?: string) {
    return this.request<any>("/assistant/conversations", {
      method: "POST",
      body: { ad_account_id: adAccountId, title },
    });
  }

  async deleteConversation(conversationId: string) {
    return this.request<any>(`/assistant/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }

  async getMessages(conversationId: string) {
    return this.request<any[]>(`/assistant/conversations/${conversationId}/messages`);
  }

  async sendAssistantMessage(
    conversationId: string, 
    content: string, 
    adAccountId: string,
    campaignId?: string | null,
    adSetId?: string | null,
    adId?: string | null
  ) {
    return this.request<{ role: string; content: string; credits_remaining: number }>(
      `/assistant/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: { 
          content, 
          ad_account_id: adAccountId,
          campaign_id: campaignId || null,
          adset_id: adSetId || null,
          ad_id: adId || null
        },
      }
    );
  }

  // Phase 8: AI Recommendations endpoints
  async getRecommendations(adAccountId: string, filters?: { goal?: string; priority?: string; status?: string; entity?: string }) {
    let url = `/recommendations?ad_account_id=${adAccountId}`;
    if (filters) {
      if (filters.goal) url += `&goal=${encodeURIComponent(filters.goal)}`;
      if (filters.priority) url += `&priority=${encodeURIComponent(filters.priority)}`;
      if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
      if (filters.entity) url += `&entity=${encodeURIComponent(filters.entity)}`;
    }
    return this.request<any[]>(url);
  }

  async getRecommendationsSummary(adAccountId: string) {
    return this.request<any>(`/recommendations/summary?ad_account_id=${adAccountId}`);
  }

  async getRecommendationEffectiveness(adAccountId: string) {
    return this.request<any[]>(`/recommendations/effectiveness?ad_account_id=${adAccountId}`);
  }

  async viewRecommendation(recommendationId: string) {
    return this.request<{ status: string; message: string }>(`/recommendations/${recommendationId}/view`, {
      method: "POST",
    });
  }

  async applyRecommendation(recommendationId: string) {
    return this.request<{ status: string; message: string }>(`/recommendations/${recommendationId}/apply`, {
      method: "POST",
    });
  }

  async dismissRecommendation(recommendationId: string, reason?: string) {
    let url = `/recommendations/${recommendationId}/dismiss`;
    if (reason) {
      url += `?reason=${encodeURIComponent(reason)}`;
    }
    return this.request<{ status: string; message: string }>(url, {
      method: "POST",
    });
  }

  async getAccountMemory(adAccountId: string) {
    return this.request<any[]>(`/recommendations/memory?ad_account_id=${adAccountId}`);
  }

  async getExperiments(adAccountId: string) {
    return this.request<any[]>(`/recommendations/experiments?ad_account_id=${adAccountId}`);
  }

  async createExperiment(adAccountId: string, payload: any) {
    return this.request<any>(`/recommendations/experiments?ad_account_id=${adAccountId}`, {
      method: "POST",
      body: payload,
    });
  }

  async completeExperiment(experimentId: string, payload: any) {
    return this.request<any>(`/recommendations/experiments/${experimentId}/complete`, {
      method: "POST",
      body: payload,
    });
  }
  async getFeatures(adAccountId: string, date?: string) {
    const dateParam = date ? `&feature_date=${date}` : "";
    return this.request<any[]>(`/recommendations/features?ad_account_id=${adAccountId}${dateParam}`);
  }

  async extractFeatures(adAccountId: string) {
    return this.request<{ status: string; message: string }>(`/recommendations/features/extract?ad_account_id=${adAccountId}`, {
      method: "POST",
    });
  }

  // Phase 9: AI Decision Center and Brief endpoints
  async getDecisionCenter(adAccountId: string) {
    return this.request<any>(`/recommendations/decision-center?ad_account_id=${adAccountId}`);
  }

  async getDailyBrief(adAccountId: string, date?: string) {
    const dateParam = date ? `&report_date=${date}` : "";
    return this.request<any>(`/recommendations/brief/daily?ad_account_id=${adAccountId}${dateParam}`);
  }

  async refreshDailyBrief(adAccountId: string, date?: string) {
    const dateParam = date ? `&report_date=${date}` : "";
    return this.request<any>(`/recommendations/brief/daily/refresh?ad_account_id=${adAccountId}${dateParam}`, {
      method: "POST",
    });
  }

  async getBriefDrilldown(adAccountId: string, date?: string, days: number = 1) {
    const dateParam = date ? `&report_date=${date}` : "";
    return this.request<any[]>(`/campaigns/brief-drilldown?ad_account_id=${adAccountId}${dateParam}&days=${days}`);
  }

  async getWeeklyBrief(adAccountId: string, startDate?: string) {
    const dateParam = startDate ? `&start_date=${startDate}` : "";
    return this.request<any>(`/recommendations/brief/weekly?ad_account_id=${adAccountId}${dateParam}`);
  }

  async refreshWeeklyBrief(adAccountId: string, startDate?: string) {
    const dateParam = startDate ? `&start_date=${startDate}` : "";
    return this.request<any>(`/recommendations/brief/weekly/refresh?ad_account_id=${adAccountId}${dateParam}`, {
      method: "POST",
    });
  }

  // Phase 10: ML Feature Store & Optimization Actions
  async getMLFeatures(adAccountId: string, date?: string) {
    const dateParam = date ? `&feature_date=${date}` : "";
    return this.request<any[]>(`/recommendations/features?ad_account_id=${adAccountId}${dateParam}`);
  }

  async extractMLFeatures(adAccountId: string, date?: string) {
    const dateParam = date ? `&feature_date=${date}` : "";
    return this.request<any>(`/recommendations/features/extract?ad_account_id=${adAccountId}${dateParam}`, {
      method: "POST",
    });
  }

  async getOptimizationActions(adAccountId: string, status?: string) {
    const statusParam = status ? `&status_filter=${status}` : "";
    return this.request<any[]>(`/recommendations/actions?ad_account_id=${adAccountId}${statusParam}`);
  }

  async approveOptimizationAction(actionId: string) {
    return this.request<any>(`/recommendations/actions/approve/${actionId}`, {
      method: "POST",
    });
  }

  async cancelOptimizationAction(actionId: string) {
    return this.request<any>(`/recommendations/actions/cancel/${actionId}`, {
      method: "POST",
    });
  }

  // Phase 9: Billing & Subscription endpoints
  async getSubscription() {
    return this.request<{
      plan: string;
      status: string;
      started_at?: string;
      expires_at?: string;
      is_mock: boolean;
      resolved_entitlements: any;
      active_addons_list: Array<{
        addon_id: string;
        name: string;
        quantity: number;
        expires_at: string;
        price_monthly: number;
      }>;
      monthly_total_cost: number;
    }>("/billing/subscription");
  }

  async createBillingOrder(planId: string) {
    return this.request<{ order_id: string; amount: number; currency: string; key_id?: string; is_mock: boolean }>(
      "/billing/order",
      {
        method: "POST",
        body: { plan_id: planId },
      }
    );
  }

  async createAddonBillingOrder(addonId: string, quantity: number = 1) {
    return this.request<{ order_id: string; amount: number; currency: string; key_id?: string; is_mock: boolean }>(
      "/billing/order",
      {
        method: "POST",
        body: { addon_id: addonId, quantity: quantity },
      }
    );
  }

  async verifyBillingPayment(orderId: string, paymentId: string, signature: string, planId: string) {
    return this.request<{ status: string; message: string }>("/billing/verify", {
      method: "POST",
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        plan_id: planId,
      },
    });
  }

  async verifyAddonBillingPayment(orderId: string, paymentId: string, signature: string, addonId: string, quantity: number = 1) {
    return this.request<{ status: string; message: string }>("/billing/verify", {
      method: "POST",
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        addon_id: addonId,
        quantity: quantity,
      },
    });
  }

  async cancelAddon(addonId: string) {
    return this.request<{ status: string; message: string }>(`/billing/addon/cancel?addon_id=${addonId}`, {
      method: "POST",
    });
  }

  async getAIIntelligenceStatus() {
    return this.request<{
      all_accounts_active: boolean;
      individual_slots_total: number;
      individual_slots_used: number;
      individual_slots_available: number;
      accounts: Array<{
        id: string;
        meta_account_id: string;
        account_name: string;
        ai_intelligence_status: string;
        historical_intelligence_status: string;
      }>;
    }>("/billing/ai-intelligence/status");
  }

  async assignAIIntelligence(adAccountId: string) {
    return this.request<{ status: string; message: string }>("/billing/ai-intelligence/assign", {
      method: "POST",
      body: { ad_account_id: adAccountId },
    });
  }

  async unassignAIIntelligence(adAccountId: string) {
    return this.request<{ status: string; message: string }>("/billing/ai-intelligence/unassign", {
      method: "POST",
      body: { ad_account_id: adAccountId },
    });
  }

  async getLifetimeHistoryStatus() {
    return this.request<{
      individual_slots_total: number;
      individual_slots_used: number;
      individual_slots_available: number;
      accounts: Array<{
        id: string;
        meta_account_id: string;
        account_name: string;
        ai_intelligence_status: string;
        historical_intelligence_status: string;
      }>;
    }>("/billing/lifetime-history/status");
  }

  async assignLifetimeHistory(adAccountId: string) {
    return this.request<{ status: string; message: string }>("/billing/lifetime-history/assign", {
      method: "POST",
      body: { ad_account_id: adAccountId },
    });
  }

  async unassignLifetimeHistory(adAccountId: string) {
    return this.request<{ status: string; message: string }>("/billing/lifetime-history/unassign", {
      method: "POST",
      body: { ad_account_id: adAccountId },
    });
  }

  async getPlansAvailability() {
    return this.request<{ starter_available: boolean; active_starter_count: number }>("/billing/plans/availability");
  }

  // Phase 10: Admin Panel endpoints
  async getAdminStats() {
    return this.request<{
      total_users: number;
      connected_ad_accounts: number;
      active_connections: number;
      plan_distribution: Array<{ plan: string; count: number }>;
      total_campaigns: number;
      total_addons_active: number;
    }>("/admin/stats");
  }

  async getAdminFinanceStats(startDate?: string, endDate?: string) {
    let url = "/admin/finance/stats";
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return this.request<any>(url);
  }

  async createAdminExpense(payload: { category: string; amount: number; description?: string; expense_date?: string }) {
    return this.request<any>("/admin/finance/expenses", {
      method: "POST",
      body: payload,
    });
  }

  async deleteAdminExpense(expenseId: string) {
    return this.request<any>(`/admin/finance/expenses/${expenseId}`, {
      method: "DELETE",
    });
  }

  async getAdminUsers() {
    return this.request<any[]>("/admin/users");
  }

  async updateUserPlan(userId: string, planId: string) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/plan`, {
      method: "POST",
      body: { plan_id: planId },
    });
  }

  async updateUserStatus(userId: string, status: string) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/status`, {
      method: "POST",
      body: { status: status },
    });
  }

  async getAdminUserDetails(userId: string) {
    return this.request<any>(`/admin/users/${userId}/details`);
  }

  async deleteUser(userId: string) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  async updateUserAddons(userId: string, addonId: string, quantity: number) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/addons`, {
      method: "POST",
      body: { addon_id: addonId, quantity },
    });
  }

  async updateUserCredits(userId: string, credits: number) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/credits`, {
      method: "POST",
      body: { credits },
    });
  }

  async adminRaiseQuotation(userId: string, payload: any) {
    return this.request<{ status: string; message: string; quotation_id: string; quotation_link?: string }>(`/admin/users/${userId}/raise-quotation`, {
      method: "POST",
      body: payload,
    });
  }

  async adminRaiseTicket(userId: string, payload: any) {
    return this.request<{ status: string; message: string; ticket_id: string }>(`/admin/users/${userId}/raise-ticket`, {
      method: "POST",
      body: payload,
    });
  }

  async updateUserAdPacks(userId: string, packType: string, totalAdCredits: number, usedAdCredits: number, remainingAdCredits: number) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/ad-packs`, {
      method: "POST",
      body: {
        pack_type: packType,
        total_ad_credits: totalAdCredits,
        used_ad_credits: usedAdCredits,
        remaining_ad_credits: remainingAdCredits,
      },
    });
  }

  async updateUserAdServiceRequest(userId: string, requestId: string, status?: string, additionalServices?: string[]) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/ad-service-requests/${requestId}`, {
      method: "POST",
      body: { status, additional_services: additionalServices },
    });
  }

  async deleteUserAdServiceRequest(userId: string, requestId: string) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/ad-service-requests/${requestId}`, {
      method: "DELETE",
    });
  }

  async updateUserIntroOffer(userId: string, introOfferEligible?: boolean, introOfferUsed?: boolean) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/intro-offer`, {
      method: "POST",
      body: { intro_offer_eligible: introOfferEligible, intro_offer_used: introOfferUsed },
    });
  }

  async updateUserOptimizationSlots(userId: string, slots: number) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/optimization-slots`, {
      method: "POST",
      body: { slots },
    });
  }

  async getAdminAiDashboard() {
    return this.request<{
      total_assistant_requests: number;
      total_optimization_requests: number;
      total_input_tokens: number;
      total_output_tokens: number;
      estimated_cost_usd: number;
      credit_pack_revenue_inr: number;
      estimated_cost_inr: number;
      profit_inr: number;
      margin_pct: number;
    }>("/admin/ai/dashboard");
  }

  // Team Endpoints
  async getTeamMembers() {
    return this.request<any[]>("/team");
  }

  async inviteTeamMember(email: string, name?: string, role: string = "member") {
    return this.request<any>("/team/invite", {
      method: "POST",
      body: { email, name, role },
    });
  }

  async removeTeamMember(memberId: string) {
    return this.request<{ status: string; message: string }>(`/team/${memberId}`, {
      method: "DELETE",
    });
  }

  // Help & Support Endpoints
  async getSupportTickets() {
    return this.request<any[]>("/support/tickets");
  }

  async createSupportTicket(subject: string, description: string, category: string = "General Support") {
    return this.request<any>("/support/tickets", {
      method: "POST",
      body: { subject, description, category },
    });
  }

  // Admin Ticket Endpoints
  async getAdminTickets() {
    return this.request<any[]>("/admin/tickets");
  }

  async replyToTicket(ticketId: string, reply: string, status: string = "resolved") {
    return this.request<{ status: string; message: string }>(`/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      body: { reply, status },
    });
  }

  // Notifications Endpoints
  async getNotifications() {
    return this.request<any[]>("/notifications");
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<{ status: string; message: string }>(`/notifications/${notificationId}/read`, {
      method: "POST",
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ status: string; message: string }>("/notifications/read-all", {
      method: "POST",
    });
  }

  // Account Deletion Endpoints
  async deleteAccount() {
    return this.request<{ status: string; message: string }>("/auth/delete-account", {
      method: "POST",
    });
  }

  async cancelAccountDeletion() {
    return this.request<{ status: string; message: string }>("/auth/cancel-delete", {
      method: "POST",
    });
  }

  async getMyProfile() {
    return this.request<any>("/auth/me");
  }

  // Lead Funnel Endpoints
  async submitRecommendation(answers: Record<string, any>, contactName?: string, contactPhone?: string) {
    return this.request<any>("/funnel/recommendation", {
      method: "POST",
      body: { answers, contact_name: contactName || null, contact_phone: contactPhone || null },
    });
  }

  async getLatestRecommendation() {
    return this.request<any>("/funnel/recommendation/latest");
  }

  async getRecommendationPdf(recId: string): Promise<Blob> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/funnel/recommendation/${recId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to download PDF");
    return res.blob();
  }

  private async getAuthToken(): Promise<string> {
    // Get current Firebase user token
    const { auth } = await import("@/lib/firebase");
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }

  async runHealthCheckAudit(adAccountId: string) {
    return this.request<any>("/funnel/health-check/audit", {
      method: "POST",
      body: { ad_account_id: adAccountId },
    });
  }

  async getLatestHealthAudit() {
    return this.request<any>("/funnel/health-check/audit/latest");
  }

  async logFunnelEvent(eventName: string, payload?: Record<string, any>) {
    return this.request<any>("/funnel/event", {
      method: "POST",
      body: { event_name: eventName, payload },
    });
  }

  // Meta Ads Service Acquisition Endpoints
  async getAdsServiceConfig() {
    return this.request<any>("/ads-service/config");
  }

  async submitAdsServiceRequest(payload: any) {
    return this.request<any>("/ads-service/request", {
      method: "POST",
      body: payload,
    });
  }

  async submitAdsServiceRequestPublic(payload: any) {
    return this.request<any>("/ads-service/public/request", {
      method: "POST",
      body: payload,
    });
  }

  async getLatestAdsServiceRequest() {
    return this.request<any>("/ads-service/request/latest");
  }

  async activateAdsServiceTrial(requestId: string) {
    return this.request<any>(`/ads-service/request/${requestId}/activate-trial`, {
      method: "POST",
    });
  }

  async purchaseAdsServicePack(requestId: string) {
    return this.request<any>(`/ads-service/request/${requestId}/purchase-pack`, {
      method: "POST",
    });
  }

  async verifyAdsServicePayment(requestId: string, orderId: string, paymentId: string, signature: string) {
    return this.request<any>(`/ads-service/request/${requestId}/verify-payment`, {
      method: "POST",
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      },
    });
  }

  async getUserAdPacks() {
    return this.request<any>("/ads-service/packs");
  }

  async getUserOrders() {
    return this.request<any>("/ads-service/orders");
  }

  async getUserBillingHistory() {
    return this.request<any>("/ads-service/billing-history");
  }

  async cancelQuotation(quotationId: string) {
    return this.request<any>(`/ads-service/quotations/${quotationId}/cancel`, {
      method: "POST",
    });
  }

  async getAdminAdsServiceRequests() {
    return this.request<any>("/ads-service/admin/requests");
  }

  async getAdminAdsServiceRequest(requestId: string) {
    return this.request<any>(`/ads-service/admin/requests/${requestId}`);
  }

  async getAdminAdsServiceOrders() {
    return this.request<any>("/ads-service/admin/orders");
  }

  async adminUpdateAdsServiceRequest(requestId: string, payload: any) {
    return this.request<any>(`/ads-service/admin/requests/${requestId}/update-status`, {
      method: "POST",
      body: payload,
    });
  }

  async adminDeleteQuotation(quotationId: string) {
    return this.request<any>(`/ads-service/admin/quotations/${quotationId}`, {
      method: "DELETE",
    });
  }

  async adminCreateOrder(payload: any) {
    return this.request<any>("/ads-service/admin/orders", {
      method: "POST",
      body: payload,
    });
  }

  async adminDeleteOrder(orderId: string) {
    return this.request<any>(`/ads-service/admin/orders/${orderId}`, {
      method: "DELETE",
    });
  }

  async updateIndividualOrderStatus(orderId: string, status: string, comment?: string) {
    return this.request<any>(`/ads-service/admin/orders/${orderId}/status`, {
      method: "POST",
      body: { status, comment },
    });
  }

  async generateCampaignPlan(payload: any) {
    return this.request<any>("/ads-service/campaign-plans/generate", {
      method: "POST",
      body: payload,
    });
  }

  async saveCampaignPlan(payload: any) {
    return this.request<any>("/ads-service/campaign-plans/save", {
      method: "POST",
      body: payload,
    });
  }

  async getCampaignPlans() {
    return this.request<any[]>("/ads-service/campaign-plans");
  }

  async getCampaignPlan(planId: string) {
    return this.request<any>(`/ads-service/campaign-plans/${planId}`);
  }

  async updateProfile(payload: any) {
    return this.request<any>("/users/profile", {
      method: "PUT",
      body: payload,
    });
  }

  async getPublicQuotation(quotationId: string) {
    return this.request<any>(`/ads-service/public/quotations/${quotationId}`);
  }

  async publicQuotationCheckout(quotationId: string, payload: any) {
    return this.request<any>(`/ads-service/public/quotations/${quotationId}/checkout`, {
      method: "POST",
      body: payload,
    });
  }

  async publicVerifyQuotationPayment(quotationId: string, payload: any) {
    return this.request<any>(`/ads-service/public/quotations/${quotationId}/verify-payment`, {
      method: "POST",
      body: payload,
    });
  }

}

export const api = new ApiClient(API_BASE_URL);
