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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getPlatformBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (netErr: any) {
      if (netErr?.message === 'Failed to fetch' || netErr?.name === 'TypeError') {
        throw new Error('Unable to connect to platform server. Please check your internet or retry in a few moments.');
      }
      throw netErr;
    }
    if (!res.ok) {
      let errorMsg = 'An error occurred';
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errJson.message || errorMsg;
      } catch {
        errorMsg = await res.text() || res.statusText;
      }
      throw new Error(errorMsg);
    }
    return res.json();
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
    password: string;
    owner_name: string;
    business_name: string;
    phone: string;
    category?: string;
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
          "Direct WhatsApp order alerts & automated notifications",
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

  async createAddonOrder(addonId: string): Promise<any> {
    if (this.isDemoMode()) {
      return {
        order_id: `order_mock_addon_${addonId.slice(0, 6)}`,
        amount: 49900,
        currency: 'INR',
        key_id: 'rzp_test_platform_mock',
        is_mock: true,
      };
    }
    return this.request('/api/v1/platform/payments/create-addon-order', {
      method: 'POST',
      body: JSON.stringify({ addon_id: addonId }),
    });
  }

  async verifyAddonPayment(payload: {
    addon_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
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
}

export const platformApi = new PlatformApiClient();

