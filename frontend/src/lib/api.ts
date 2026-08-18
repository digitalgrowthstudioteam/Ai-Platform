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
        throw new Error(error.detail || `API error: ${response.status}`);
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
    return this.request<{ uid: string; email: string; name: string; picture?: string }>("/auth/me");
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
  async getDashboardOverview(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any>(
      `/dashboard/overview?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getDashboardChart(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/dashboard/chart?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getDashboardHealth(adAccountId: string) {
    return this.request<any>(`/dashboard/health?ad_account_id=${adAccountId}`);
  }

  async getCampaigns(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/campaigns?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getAds(adAccountId: string, startDate: string, endDate: string) {
    return this.request<any[]>(
      `/ads?ad_account_id=${adAccountId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getSyncStatus() {
    return this.request<{ last_sync_at?: string; last_sync_status?: string; last_sync_error?: string }>(
      "/meta/sync/status"
    );
  }

  // Phase 8: AI Recommendations endpoints
  async getRecommendations(adAccountId: string) {
    return this.request<any[]>(`/recommendations?ad_account_id=${adAccountId}`);
  }

  async applyRecommendation(recommendationId: string) {
    return this.request<{ status: string; message: string }>(`/recommendations/${recommendationId}/apply`, {
      method: "POST",
    });
  }

  async dismissRecommendation(recommendationId: string) {
    return this.request<{ status: string; message: string }>(`/recommendations/${recommendationId}/dismiss`, {
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
}

export const api = new ApiClient(API_BASE_URL);
