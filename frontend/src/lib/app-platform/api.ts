/**
 * Digital Growth Studio — Multi-Vendor Platform API Client
 */
import {
  PlatformUser,
  PlatformTokenResponse,
  VendorOverview,
  Product,
  Category,
  Banner,
  Order,
  Customer,
  StoreSettings,
  VendorProfile,
  AppConfig,
  SuperAdminOverview,
  VendorListItem,
  Plan,
  Addon,
  SetupFeeQuote,
  CouponValidation,
  PlatformCouponItem,
  VendorPolicies,
  VendorPixelConfig,
  VendorAnalyticsSummary,
  AdminDetailedAnalytics,
} from './types';
import { demoSandbox, DEMO_USER } from './demo-sandbox';

const getPlatformBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://digital-growth-studio-api.onrender.com';
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'https://digital-growth-studio-api.onrender.com';
  return envUrl.replace(/\/api\/v1\/?$/, '');
};

class PlatformApiClient {
  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('dgs_platform_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit & { timeout?: number; retries?: number } = {}): Promise<T> {
    const baseUrl = getPlatformBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    const maxRetries = options.retries ?? 2;
    const timeoutMs = options.timeout ?? 45000;

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          ...options,
          headers,
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        // Read response body once as text to prevent stream already read errors
        const rawText = await res.text();
        let responseData: any = null;
        try {
          responseData = rawText ? JSON.parse(rawText) : null;
        } catch {
          responseData = null;
        }

        if (!res.ok) {
          let errorMsg = `Server error (${res.status})`;
          if (responseData) {
            if (typeof responseData.detail === 'string') {
              errorMsg = responseData.detail;
            } else if (Array.isArray(responseData.detail)) {
              errorMsg = responseData.detail
                .map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
                .join(', ');
            } else if (typeof responseData.message === 'string') {
              errorMsg = responseData.message;
            } else {
              errorMsg = JSON.stringify(responseData);
            }
          } else if (rawText) {
            errorMsg = rawText.slice(0, 160) || res.statusText || errorMsg;
          } else if (res.statusText) {
            errorMsg = res.statusText;
          }
          const err = new Error(errorMsg);
          (err as any).status = res.status;
          throw err;
        }

        return responseData as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        // If it was a real HTTP response from the server, do not retry 4xx errors
        if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
          throw err;
        }

        // On transient network failure or timeout, wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
          continue;
        }
      }
    }

    if (lastError?.status) {
      throw lastError;
    }

    if (lastError?.name === 'AbortError') {
      const err = new Error('Connection timed out. Please check your internet connection or retry in a moment.');
      (err as any).status = 408;
      throw err;
    }

    if (lastError?.message === 'Failed to fetch') {
      const err = new Error('Unable to connect to platform server. Please check your internet or retry.');
      (err as any).status = 503;
      throw err;
    }

    throw lastError;
  }

  // ──────────────────────────────────────────────
  // Auth
  // ──────────────────────────────────────────────
  async login(payload: { email: string; password: string }): Promise<PlatformTokenResponse> {
    const res = await this.request<PlatformTokenResponse>('/api/v1/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (typeof window !== 'undefined' && res.access_token) {
      localStorage.setItem('dgs_platform_token', res.access_token);
    }
    return res;
  }

  async googleLogin(idToken: string): Promise<PlatformTokenResponse> {
    const res = await this.request<PlatformTokenResponse>('/api/v1/platform/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
    if (typeof window !== 'undefined' && res.access_token) {
      localStorage.setItem('dgs_platform_token', res.access_token);
    }
    return res;
  }

  async register(payload: {
    email: string;
    owner_name: string;
    business_name: string;
    password?: string;
    google_id_token?: string;
    phone?: string;
    whatsapp_number?: string;
    business_phone?: string;
    category?: string;
    brand_name?: string;
    description?: string;
    logo_url?: string;
    address?: string;
    has_payment_gateway?: string;
    needs_delivery_help?: string;
    store_slug?: string;
  }): Promise<PlatformTokenResponse> {
    const res = await this.request<PlatformTokenResponse>('/api/v1/platform/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (typeof window !== 'undefined' && res.access_token) {
      localStorage.setItem('dgs_platform_token', res.access_token);
    }
    return res;
  }

  isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dgs_platform_is_demo') === 'true';
  }

  setDemoMode(enabled: boolean) {
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.setItem('dgs_platform_is_demo', 'true');
        localStorage.setItem('dgs_platform_token', 'demo_sandbox_token');
      } else {
        localStorage.removeItem('dgs_platform_is_demo');
        localStorage.removeItem('dgs_platform_token');
      }
    }
  }

  resetDemo() {
    demoSandbox.reset();
  }

  async getMe(): Promise<PlatformUser> {
    if (this.isDemoMode()) return DEMO_USER;
    return this.request<PlatformUser>('/api/v1/platform/auth/me');
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dgs_platform_token');
      localStorage.removeItem('dgs_platform_user');
      localStorage.removeItem('dgs_platform_is_demo');
    }
  }

  // ──────────────────────────────────────────────
  // Vendor Dashboard APIs
  // ──────────────────────────────────────────────
  async getVendorOverview(): Promise<VendorOverview> {
    if (this.isDemoMode()) return demoSandbox.getOverview();
    return this.request<VendorOverview>('/api/v1/platform/vendor/overview');
  }

  async getVendorStore(): Promise<StoreSettings> {
    if (this.isDemoMode()) return demoSandbox.getStore();
    return this.request<StoreSettings>('/api/v1/platform/vendor/store');
  }

  async getVendorProfile(): Promise<VendorProfile> {
    if (this.isDemoMode()) return demoSandbox.getProfile();
    return this.request<VendorProfile>('/api/v1/platform/vendor/profile');
  }

  async updateVendorProfile(payload: Partial<VendorProfile>): Promise<VendorProfile> {
    if (this.isDemoMode()) return demoSandbox.updateProfile(payload);
    return this.request<VendorProfile>('/api/v1/platform/vendor/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async updateVendorStore(payload: Partial<StoreSettings>): Promise<StoreSettings> {
    if (this.isDemoMode()) return demoSandbox.updateStore(payload);
    return this.request<StoreSettings>('/api/v1/platform/vendor/store', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getVendorCustomDomainInfo(): Promise<any> {
    if (this.isDemoMode()) {
      return {
        custom_domain: null,
        custom_domain_enabled: false,
        custom_domain_status: 'UNCONFIGURED',
        custom_domain_ssl_status: 'PENDING',
        custom_domain_dns_target: 'cname.digitalgrowthstudio.in',
        addon_id: 'mock_addon_custom_domain',
        addon_price_inr: 999.0,
        has_paid_addon: false,
      };
    }
    return this.request<any>('/api/v1/platform/vendor/custom-domain');
  }

  async verifyVendorCustomDomain(): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: 'Custom domain verified! SSL is active.' };
    }
    return this.request<any>('/api/v1/platform/vendor/custom-domain/verify', {
      method: 'POST',
    });
  }

  async adminUpdateVendorCustomDomainAccess(vendorId: string, payload: { custom_domain_enabled: boolean; custom_domain?: string; custom_domain_status?: string }): Promise<any> {
    return this.request<any>(`/api/v1/platform/admin/vendors/${vendorId}/custom-domain-access`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getVendorEmailSettings(): Promise<any> {
    if (this.isDemoMode()) {
      return {
        email_notifications_enabled: true,
        email_provider: 'PLATFORM',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_from_email: '',
        smtp_from_name: 'Demo Store',
        has_custom_password: false,
        default_platform_sender: 'Demo Store <no-reply@digitalgrowthstudio.in>',
        default_reply_to: 'support@example.com',
      };
    }
    return this.request<any>('/api/v1/platform/vendor/email-settings');
  }

  async updateVendorEmailSettings(payload: any): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, ...payload };
    }
    return this.request<any>('/api/v1/platform/vendor/email-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async sendVendorTestEmail(test_email?: string): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: `Test email sent successfully to ${test_email || 'your email'}!` };
    }
    return this.request<any>('/api/v1/platform/vendor/email-settings/test', {
      method: 'POST',
      body: JSON.stringify({ test_email }),
    });
  }

  async getVendorPolicies(): Promise<VendorPolicies> {
    if (this.isDemoMode()) {
      const s = demoSandbox.getStore();
      return {
        store_name: s.store_name,
        store_slug: s.store_slug,
        terms_and_conditions: s.terms_and_conditions || `# Terms & Conditions for ${s.store_name}\n\nWelcome to ${s.store_name}. By browsing or purchasing from our store, you agree to our standard terms of sale, transparent pricing, and secure order fulfillment.`,
        privacy_policy: s.privacy_policy || `# Privacy Policy for ${s.store_name}\n\nWe prioritize customer privacy. Your details are strictly used to fulfill your orders and are never shared or sold.`,
        shipping_policy: s.shipping_policy || `# Shipping & Delivery Policy for ${s.store_name}\n\nOrders are delivered within 3-5 business days across India with real-time tracking updates.`,
        refund_policy: s.refund_policy || `# Return & Refund Policy for ${s.store_name}\n\nWe offer a 7-day return and exchange window for unused items or damaged transit issues.`,
        is_custom_terms: Boolean(s.terms_and_conditions),
        is_custom_privacy: Boolean(s.privacy_policy),
        is_custom_shipping: Boolean(s.shipping_policy),
        is_custom_refund: Boolean(s.refund_policy),
      };
    }
    return this.request<VendorPolicies>('/api/v1/platform/vendor/policies');
  }

  async updateVendorPolicies(payload: Partial<VendorPolicies>): Promise<VendorPolicies> {
    if (this.isDemoMode()) {
      demoSandbox.updateStore(payload as any);
      return this.getVendorPolicies();
    }
    return this.request<VendorPolicies>('/api/v1/platform/vendor/policies', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async resetVendorPolicies(policyType: string = 'all'): Promise<VendorPolicies> {
    if (this.isDemoMode()) {
      return this.getVendorPolicies();
    }
    return this.request<VendorPolicies>(`/api/v1/platform/vendor/policies/reset-default?policy_type=${policyType}`, {
      method: 'POST',
    });
  }

  async getPublicStorePolicies(slug: string): Promise<VendorPolicies> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return this.getVendorPolicies();
    }
    return this.request<VendorPolicies>(`/api/store/${slug}/policies`);
  }

  async verifyRazorpay(payload: { key_id: string; key_secret?: string }): Promise<any> {
    if (this.isDemoMode()) {
      return {
        status: 'success',
        verified: true,
        mode: payload.key_id.startsWith('rzp_live_') ? 'live' : 'test',
        message: 'Razorpay credentials verified successfully! (Demo Sandbox)',
      };
    }
    return this.request('/api/v1/platform/vendor/store/verify-razorpay', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getVendorAppConfig(): Promise<AppConfig> {
    if (this.isDemoMode()) return demoSandbox.getAppConfig();
    return this.request<AppConfig>('/api/v1/platform/vendor/app-config');
  }

  async updateVendorAppConfig(payload: Partial<AppConfig>): Promise<AppConfig> {
    if (this.isDemoMode()) return demoSandbox.updateAppConfig(payload);
    return this.request<AppConfig>('/api/v1/platform/vendor/app-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async submitVendorAppForDevelopment(): Promise<AppConfig> {
    if (this.isDemoMode()) {
      return demoSandbox.updateAppConfig({ is_locked: true, app_build_status: 'QUEUED' });
    }
    return this.request<AppConfig>('/api/v1/platform/vendor/app-config/submit', {
      method: 'POST',
    });
  }

  async getProducts(params?: { category_id?: string; status?: string }): Promise<Product[]> {
    if (this.isDemoMode()) return demoSandbox.getProducts(params?.category_id, params?.status);
    const q = new URLSearchParams();
    if (params?.category_id) q.set('category_id', params.category_id);
    if (params?.status) q.set('status_filter', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<Product[]>(`/api/v1/platform/vendor/products${qs}`);
  }

  async getProduct(id: string): Promise<Product> {
    if (this.isDemoMode()) {
      const found = demoSandbox.getProduct(id);
      if (found) return found;
      const list = demoSandbox.getProducts();
      return list[0];
    }
    return this.request<Product>(`/api/v1/platform/vendor/products/${id}`);
  }

  async createProduct(payload: Partial<Product> & { image_urls?: string[] }): Promise<Product> {
    if (this.isDemoMode()) return demoSandbox.createProduct(payload);
    return this.request<Product>('/api/v1/platform/vendor/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(id: string, payload: Partial<Product> & { image_urls?: string[] }): Promise<Product> {
    if (this.isDemoMode()) return demoSandbox.updateProduct(id, payload);
    return this.request<Product>(`/api/v1/platform/vendor/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    if (this.isDemoMode()) return demoSandbox.deleteProduct(id);
    return this.request<{ message: string }>(`/api/v1/platform/vendor/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories(): Promise<Category[]> {
    if (this.isDemoMode()) return demoSandbox.getCategories();
    return this.request<Category[]>('/api/v1/platform/vendor/categories');
  }

  async createCategory(payload: Partial<Category>): Promise<Category> {
    if (this.isDemoMode()) return demoSandbox.createCategory(payload);
    return this.request<Category>('/api/v1/platform/vendor/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCategory(id: string, payload: Partial<Category>): Promise<Category> {
    if (this.isDemoMode()) return demoSandbox.updateCategory(id, payload);
    return this.request<Category>(`/api/v1/platform/vendor/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    if (this.isDemoMode()) return demoSandbox.deleteCategory(id);
    return this.request<{ message: string }>(`/api/v1/platform/vendor/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getBanners(): Promise<Banner[]> {
    if (this.isDemoMode()) return demoSandbox.getBanners();
    return this.request<Banner[]>('/api/v1/platform/vendor/banners');
  }

  async createBanner(payload: Partial<Banner>): Promise<Banner> {
    if (this.isDemoMode()) return demoSandbox.createBanner(payload);
    return this.request<Banner>('/api/v1/platform/vendor/banners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBanner(id: string, payload: Partial<Banner>): Promise<Banner> {
    if (this.isDemoMode()) return demoSandbox.updateBanner(id, payload);
    return this.request<Banner>(`/api/v1/platform/vendor/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteBanner(id: string): Promise<{ message: string }> {
    if (this.isDemoMode()) return demoSandbox.deleteBanner(id);
    return this.request<{ message: string }>(`/api/v1/platform/vendor/banners/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrders(statusFilter?: string): Promise<Order[]> {
    if (this.isDemoMode()) return demoSandbox.getOrders(statusFilter);
    const qs = statusFilter ? `?status_filter=${statusFilter}` : '';
    return this.request<Order[]>(`/api/v1/platform/vendor/orders${qs}`);
  }

  async getOrder(orderId: string): Promise<Order> {
    if (this.isDemoMode()) {
      const ord = demoSandbox.getOrder(orderId);
      if (ord) return ord;
      return demoSandbox.getOrders()[0];
    }
    return this.request<Order>(`/api/v1/platform/vendor/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, payload: {
    order_status?: string;
    payment_status?: string;
    courier_name?: string;
    tracking_number?: string;
    tracking_url?: string;
    notes?: string;
  }): Promise<any> {
    if (this.isDemoMode()) return demoSandbox.updateOrderStatus(orderId, payload);
    return this.request(`/api/v1/platform/vendor/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getCustomers(): Promise<Customer[]> {
    if (this.isDemoMode()) return demoSandbox.getCustomers();
    return this.request<Customer[]>('/api/v1/platform/vendor/customers');
  }

  async getSubscriptionInfo(): Promise<any> {
    if (this.isDemoMode()) return demoSandbox.getSubscriptionInfo();
    return this.request('/api/v1/platform/vendor/subscription');
  }

  async uploadFile(file: File, folder = 'products'): Promise<{ url: string; size_bytes: number; filename: string }> {
    if (this.isDemoMode()) {
      return {
        url: URL.createObjectURL(file),
        size_bytes: file.size,
        filename: file.name,
      };
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dgs_platform_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getPlatformBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/platform/vendor/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  }

  // ──────────────────────────────────────────────
  // Super Admin APIs
  // ──────────────────────────────────────────────
  async getSuperAdminOverview(): Promise<SuperAdminOverview> {
    return this.request<SuperAdminOverview>('/api/v1/platform/admin/overview');
  }

  async getAdminDetailedAnalytics(dateRange: string = '30d'): Promise<AdminDetailedAnalytics> {
    return this.request<AdminDetailedAnalytics>(`/api/v1/platform/admin/analytics?date_range=${encodeURIComponent(dateRange)}`);
  }

  async getAdminVendors(search?: string, statusFilter?: string): Promise<VendorListItem[]> {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (statusFilter) q.set('status_filter', statusFilter);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<VendorListItem[]>(`/api/v1/platform/admin/vendors${qs}`);
  }

  async getAdminVendorDetail(id: string): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}`);
  }

  async updateVendorStatus(id: string, status: string): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async grantVendorAccessMonths(id: string, months: number): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}/grant-access`, {
      method: 'POST',
      body: JSON.stringify({ months }),
    });
  }

  async updateVendorSubdomain(id: string, storeSlug: string): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}/subdomain`, {
      method: 'PATCH',
      body: JSON.stringify({ store_slug: storeSlug }),
    });
  }

  async updateVendorDetailsByAdmin(id: string, payload: any): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}/details`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteVendor(id: string): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}`, {
      method: 'DELETE',
    });
  }

  async updateVendorAppConfigByAdmin(id: string, payload: any): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}/app-config`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updateVendorStorageLimit(id: string, storage_limit_mb: number): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${id}/storage-limit`, {
      method: 'PATCH',
      body: JSON.stringify({ storage_limit_mb }),
    });
  }

  async getAdminPlans(): Promise<Plan[]> {
    return this.request<Plan[]>('/api/v1/platform/admin/plans');
  }

  async createAdminPlan(payload: Partial<Plan>): Promise<Plan> {
    return this.request<Plan>('/api/v1/platform/admin/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAdminPlan(id: string, payload: Partial<Plan>): Promise<Plan> {
    return this.request<Plan>(`/api/v1/platform/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteAdminPlan(id: string): Promise<any> {
    return this.request<any>(`/api/v1/platform/admin/plans/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdminAddons(): Promise<Addon[]> {
    return this.request<Addon[]>('/api/v1/platform/admin/addons');
  }

  async createAdminAddon(payload: Partial<Addon>): Promise<Addon> {
    return this.request<Addon>('/api/v1/platform/admin/addons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAdminAddon(id: string, payload: Partial<Addon>): Promise<Addon> {
    return this.request<Addon>(`/api/v1/platform/admin/addons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteAdminAddon(id: string): Promise<any> {
    return this.request<any>(`/api/v1/platform/admin/addons/${id}`, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/api/v1/platform/admin/audit-logs');
  }

  // ──────────────────────────────────────────────
  // Public Store & Android App APIs
  // ──────────────────────────────────────────────
  async getPublicStoreConfig(slug: string): Promise<any> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      const s = demoSandbox.getStore();
      return {
        store_name: s.store_name,
        store_slug: s.store_slug,
        subdomain: s.subdomain,
        description: s.description,
        primary_color: s.primary_color,
        secondary_color: s.secondary_color,
        logo_url: s.logo_url,
        banner_url: s.banner_url,
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
        business_address: s.business_address,
        opening_hours: s.opening_hours,
        cod_enabled: s.cod_enabled,
        razorpay_enabled: false,
        razorpay_key_id: undefined,
        app_version: "1.0.0",
        shipping_enabled: s.shipping_enabled ?? true,
        shipping_charge: s.shipping_charge ?? 0,
        free_shipping_min_order: s.free_shipping_min_order ?? 999,
        cod_charge: s.cod_charge ?? 0,
        estimated_delivery_days: s.estimated_delivery_days ?? "3-5 Business Days",
        allowed_countries: s.allowed_countries ?? "India",
        serviceable_pincodes_type: s.serviceable_pincodes_type ?? "all",
        serviceable_pincodes: s.serviceable_pincodes,
      };
    }
    return this.request(`/api/store/${slug}/config`);
  }

  async getPublicStoreProducts(slug: string, categoryId?: string): Promise<any[]> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      const prods = demoSandbox.getProducts(categoryId);
      return prods.map((p) => ({
        ...p,
        effective_price: p.sale_price && p.sale_price > 0 ? p.sale_price : p.regular_price,
        in_stock: p.stock_quantity > 0 && p.status === 'active',
      }));
    }
    const qs = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/api/store/${slug}/products${qs}`);
  }

  async getPublicStoreProduct(slug: string, productId: string): Promise<any> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      const prod = demoSandbox.getProduct(productId);
      if (prod) {
        return {
          ...prod,
          effective_price: prod.sale_price && prod.sale_price > 0 ? prod.sale_price : prod.regular_price,
          in_stock: prod.stock_quantity > 0 && prod.status === 'active',
        };
      }
      const first = demoSandbox.getProducts()[0];
      return {
        ...first,
        effective_price: first.sale_price && first.sale_price > 0 ? first.sale_price : first.regular_price,
        in_stock: first.stock_quantity > 0 && first.status === 'active',
      };
    }
    return this.request(`/api/store/${slug}/products/${productId}`);
  }

  async getPublicStoreCategories(slug: string): Promise<any[]> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return demoSandbox.getCategories();
    }
    return this.request(`/api/store/${slug}/categories`);
  }

  async getPublicStoreBanners(slug: string): Promise<any[]> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return demoSandbox.getBanners();
    }
    return this.request(`/api/store/${slug}/banners`);
  }

  async createPublicOrder(slug: string, payload: any): Promise<any> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return demoSandbox.createPublicOrder(payload);
    }
    return this.request(`/api/store/${slug}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async confirmPublicOrderPayment(slug: string, orderId: string, payload: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }): Promise<any> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return { status: 'success', payment_status: 'PAID' };
    }
    return this.request(`/api/store/${slug}/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPublicStoreOrder(slug: string, orderId: string): Promise<any> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      const ord = demoSandbox.getOrder(orderId);
      if (ord) return ord;
      return demoSandbox.getOrders()[0];
    }
    return this.request(`/api/store/${slug}/orders/${orderId}`);
  }

  async getPublicCustomerOrders(slug: string, phone: string): Promise<any[]> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return demoSandbox.getCustomerOrders(phone);
    }
    return this.request(`/api/store/${slug}/customer-orders?phone=${encodeURIComponent(phone)}`);
  }

  async customerAuth(slug: string, payload: {
    action: 'login' | 'register' | 'otp_request' | 'otp_verify';
    phone: string;
    name?: string;
    email?: string;
    password?: string;
    otp?: string;
  }): Promise<any> {
    if (this.isDemoMode() || slug === 'demo' || slug === 'demo-store') {
      return {
        success: true,
        message: 'Logged in successfully',
        customer: {
          id: 'demo-customer-1',
          name: payload.name || 'Valued Customer',
          phone: payload.phone,
          email: payload.email || 'customer@example.com',
          total_orders: 1,
        },
        token: 'demo-token',
      };
    }
    return this.request(`/api/store/${slug}/customer/auth`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async customerForgotPassword(slug: string, identifier: string): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: "6-digit verification code sent to your registered email.", masked_email: "d***@example.com" };
    }
    return this.request<any>(`/api/store/${slug}/customer/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  async customerResetPassword(slug: string, payload: { identifier: string; otp: string; new_password: string }): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: "Password reset successfully!" };
    }
    return this.request<any>(`/api/store/${slug}/customer/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async customerGoogleAuth(slug: string, payload: { email: string; name?: string; google_id?: string; id_token?: string; phone?: string }): Promise<any> {
    if (this.isDemoMode()) {
      return {
        success: true,
        customer: { id: "demo-cust-google", name: payload.name || "Google User", phone: payload.phone || "9876543210", email: payload.email, total_orders: 0 },
        token: "demo-google-token",
      };
    }
    return this.request<any>(`/api/store/${slug}/customer/google-auth`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ──────────────────────────────────────────────
  // Platform Payments & Razorpay
  // ──────────────────────────────────────────────
  async getSetupFeeQuote(): Promise<SetupFeeQuote> {
    if (this.isDemoMode()) {
      return {
        plan_name: "Starter Store Plan",
        base_price_inr: 2000,
        sale_price_inr: 999,
        final_price_inr: 999,
        setup_fee_paid: true,
        setup_fee_waived: false,
        setup_fee_cleared: true,
        key_id: "rzp_test_platform_mock",
        currency: "INR",
        features: [
          "Official Android Mobile Shopping App compilation & Play Store setup",
          "Dedicated secure store subdomain (.digitalgrowthstudio.in)",
          "Unlimited product catalog with variant & image gallery hosting",
          "1GB High-Speed Cloud Storage CDN",
          "Real-time order tracking & customer order management",
        ],
      };
    }
    return this.request<SetupFeeQuote>('/api/v1/platform/payments/setup-fee-quote');
  }

  async validateCoupon(code: string): Promise<CouponValidation> {
    if (this.isDemoMode()) {
      const is50 = code.toUpperCase().includes('50');
      const discount = is50 ? 500 : 200;
      return {
        valid: true,
        code: code.toUpperCase(),
        discount_type: 'FIXED_INR',
        discount_value: discount,
        discount_inr: discount,
        new_total_inr: Math.max(0, 999 - discount),
        message: `Coupon '${code.toUpperCase()}' applied! You save ₹${discount}.`,
      };
    }
    return this.request<CouponValidation>('/api/v1/platform/payments/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async createSetupFeeOrder(couponCode?: string): Promise<any> {
    if (this.isDemoMode()) {
      return {
        order_id: 'order_mock_setup_demo',
        amount: 99900,
        currency: 'INR',
        key_id: 'rzp_test_platform_mock',
        is_mock: true,
      };
    }
    return this.request('/api/v1/platform/payments/create-setup-fee-order', {
      method: 'POST',
      body: JSON.stringify({ coupon_code: couponCode }),
    });
  }

  async verifySetupFeePayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    coupon_code?: string;
  }): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: "Setup fee paid! Welcome to your dashboard.", setup_fee_cleared: true };
    }
    return this.request('/api/v1/platform/payments/verify-setup-fee', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async validateAddonCoupon(addonId: string, couponCode: string): Promise<any> {
    if (this.isDemoMode()) {
      return {
        valid: true,
        coupon_code: couponCode,
        discount_type: "FIXED_INR",
        discount_value: 999,
        discount_inr: 999,
        original_price_inr: 999,
        final_price_inr: 0,
        is_free: true,
        message: `🎉 Coupon '${couponCode}' applied! 100% Free activation.`,
      };
    }
    return this.request('/api/v1/platform/payments/validate-addon-coupon', {
      method: 'POST',
      body: JSON.stringify({ addon_id: addonId, coupon_code: couponCode }),
    });
  }

  async createAddonOrder(addonId: string, couponCode?: string): Promise<any> {
    if (this.isDemoMode()) {
      if (couponCode) {
        return {
          order_id: `free_coupon_${couponCode}`,
          amount: 0,
          currency: 'INR',
          key_id: 'rzp_test_platform_mock',
          is_mock: false,
          is_free: true,
          message: "Unlocked with promo code!",
        };
      }
      return {
        order_id: `order_mock_addon_${addonId.slice(0, 6)}`,
        amount: 49900,
        currency: 'INR',
        key_id: 'rzp_test_platform_mock',
        is_mock: true,
        is_free: false,
      };
    }
    return this.request('/api/v1/platform/payments/create-addon-order', {
      method: 'POST',
      body: JSON.stringify({ addon_id: addonId, coupon_code: couponCode }),
    });
  }

  async verifyAddonPayment(payload: {
    addon_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    coupon_code?: string;
  }): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: "Add-on activated successfully in demo sandbox!" };
    }
    return this.request('/api/v1/platform/payments/verify-addon-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async approveApkAndActivateSubscription(): Promise<any> {
    if (this.isDemoMode()) {
      demoSandbox.updateAppConfig({ apk_user_approved: true, subscription_auto_debit_active: true });
      return { success: true, message: "APK approved! Monthly subscription started in demo sandbox." };
    }
    return this.request('/api/v1/platform/payments/approve-apk-and-activate-subscription', {
      method: 'POST',
    });
  }

  async createSubscriptionOrder(): Promise<{
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    is_mock: boolean;
    plan_name: string;
    monthly_price_inr: number;
  }> {
    if (this.isDemoMode()) {
      return {
        order_id: `order_mock_sub_${Date.now()}`,
        amount: 49900,
        currency: 'INR',
        key_id: 'rzp_test_platform_mock',
        is_mock: true,
        plan_name: 'Starter Store Plan',
        monthly_price_inr: 499,
      };
    }
    return this.request('/api/v1/platform/payments/create-subscription-order', {
      method: 'POST',
    });
  }

  async verifySubscriptionPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<any> {
    if (this.isDemoMode()) {
      return { success: true, message: "Subscription renewed successfully in demo sandbox!", status: "active" };
    }
    return this.request('/api/v1/platform/payments/verify-subscription-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin Setup Fee & Pricing controls
  async updateVendorSetupFeeByAdmin(vendorId: string, payload: { waive_fee?: boolean; custom_price_inr?: number }): Promise<any> {
    return this.request(`/api/v1/platform/admin/vendors/${vendorId}/setup-fee`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updatePlanPricingByAdmin(planId: string, payload: { monthly_price_inr?: number; setup_fee_inr?: number; setup_fee_sale_price_inr?: number }): Promise<any> {
    return this.request(`/api/v1/platform/admin/plans/${planId}/pricing`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getAdminCoupons(): Promise<PlatformCouponItem[]> {
    return this.request<PlatformCouponItem[]>('/api/v1/platform/admin/coupons');
  }

  async createAdminCoupon(payload: {
    code: string;
    discount_type: string;
    discount_value: number;
    applicable_to?: string;
    vendor_id?: string;
    max_uses?: number;
    valid_days?: number;
  }): Promise<PlatformCouponItem> {
    return this.request<PlatformCouponItem>('/api/v1/platform/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteAdminCoupon(couponId: string): Promise<any> {
    return this.request(`/api/v1/platform/admin/coupons/${couponId}`, {
      method: 'DELETE',
    });
  }

  // ──────────────────────────────────────────────
  // Vendor Pixel & Analytics APIs
  // ──────────────────────────────────────────────
  async getVendorPixelConfig(): Promise<VendorPixelConfig> {
    if (this.isDemoMode()) {
      return {
        meta_pixel_id: "123456789012345",
        gtm_id: "GTM-DEMO123",
        ga4_id: "G-DEMO12345",
        tracking_enabled: true,
      };
    }
    return this.request<VendorPixelConfig>('/api/v1/platform/vendor/pixels');
  }

  async updateVendorPixelConfig(payload: Partial<VendorPixelConfig>): Promise<VendorPixelConfig> {
    if (this.isDemoMode()) {
      return {
        meta_pixel_id: payload.meta_pixel_id ?? "",
        gtm_id: payload.gtm_id ?? "",
        ga4_id: payload.ga4_id ?? "",
        tracking_enabled: payload.tracking_enabled ?? true,
      };
    }
    return this.request<VendorPixelConfig>('/api/v1/platform/vendor/pixels', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getVendorAnalytics(dateRange: string = '30d'): Promise<VendorAnalyticsSummary> {
    if (this.isDemoMode()) {
      return {
        date_range: dateRange,
        gross_revenue: 148500,
        net_revenue: 139200,
        total_orders: 42,
        total_units_sold: 58,
        average_order_value: 3535,
        store_visits: 1240,
        unique_visitors: 890,
        product_views: 3120,
        add_to_cart_count: 215,
        checkout_count: 84,
        whatsapp_clicks: 76,
        conversion_rate: 3.38,
        add_to_cart_rate: 17.33,
        checkout_rate: 6.77,
        sales_trend: [
          { date: "2026-10-05", sales: 7400, orders: 2, visits: 38 },
          { date: "2026-10-10", sales: 12500, orders: 3, visits: 62 },
          { date: "2026-10-15", sales: 18900, orders: 5, visits: 85 },
          { date: "2026-10-20", sales: 24200, orders: 7, visits: 110 },
          { date: "2026-10-25", sales: 38100, orders: 11, visits: 165 },
          { date: "2026-10-30", sales: 47400, orders: 14, visits: 195 },
        ],
        funnel_steps: [
          { stage: "Store Visits", count: 1240, percentage: 100 },
          { stage: "Product Views", count: 3120, percentage: 82 },
          { stage: "Add To Cart", count: 215, percentage: 17.3 },
          { stage: "Initiate Checkout", count: 84, percentage: 6.8 },
          { stage: "Purchases", count: 42, percentage: 3.4 },
        ],
        top_products: [
          { id: "1", name: "Royal Peacock Heavy Zardosi Handcrafted Bridal Blouse", units_sold: 18, revenue: 89100, views: 940, conversion_rate: 1.9 },
          { id: "2", name: "Heritage Bridal Golden Zari Full-Sleeve Silk Blouse", units_sold: 14, revenue: 72800, views: 680, conversion_rate: 2.1 },
          { id: "3", name: "Classic Floral Maggam Work Semi-Bridal Raw Silk Blouse", units_sold: 10, revenue: 34500, views: 510, conversion_rate: 2.0 },
        ],
        traffic_sources: [
          { source: "Instagram / Meta Ads", visits: 680, orders: 26, percentage: 54.8 },
          { source: "WhatsApp Direct", visits: 310, orders: 11, percentage: 25.0 },
          { source: "Direct / Organic Search", visits: 180, orders: 4, percentage: 14.5 },
          { source: "Google Ads / Referrals", visits: 70, orders: 1, percentage: 5.7 },
        ],
        device_breakdown: [
          { device: "Mobile (Android / iOS)", visits: 1054, percentage: 85.0 },
          { device: "Desktop / PC", visits: 161, percentage: 13.0 },
          { device: "Tablet", visits: 25, percentage: 2.0 },
        ],
        customer_locations: [
          { city: "Pune", orders: 18, revenue: 64200 },
          { city: "Mumbai", orders: 12, revenue: 42600 },
          { city: "Bangalore", orders: 6, revenue: 21300 },
          { city: "Hyderabad", orders: 4, revenue: 14200 },
          { city: "Chennai", orders: 2, revenue: 6200 },
        ],
        pixel_status: {
          meta_active: true,
          meta_pixel_id: "123456789012345",
          gtm_active: true,
          gtm_id: "GTM-DEMO123",
          ga4_active: true,
          ga4_id: "G-DEMO12345",
          tracking_enabled: true,
        },
      };
    }
    return this.request<VendorAnalyticsSummary>(`/api/v1/platform/vendor/analytics?date_range=${encodeURIComponent(dateRange)}`);
  }

  async trackStoreEvent(slug: string, payload: {
    event_type: string;
    product_id?: string;
    product_name?: string;
    value?: number;
    source?: string;
    device?: string;
    visitor_id?: string;
    city?: string;
    url_path?: string;
  }): Promise<any> {
    try {
      return await this.request(`/api/store/${slug}/events`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Event tracking is background telemetry, fail gracefully without disrupting UI
      return null;
    }
  }
}

export const platformApi = new PlatformApiClient();

