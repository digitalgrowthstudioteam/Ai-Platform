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
  AppConfig,
  SuperAdminOverview,
  VendorListItem,
  Plan,
  Addon,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://digital-growth-studio-api.onrender.com';

class PlatformApiClient {
  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('dgs_platform_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
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

  async getMe(): Promise<PlatformUser> {
    return this.request<PlatformUser>('/api/v1/platform/auth/me');
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dgs_platform_token');
    }
  }

  // ──────────────────────────────────────────────
  // Vendor Dashboard APIs
  // ──────────────────────────────────────────────
  async getVendorOverview(): Promise<VendorOverview> {
    return this.request<VendorOverview>('/api/v1/platform/vendor/overview');
  }

  async getVendorStore(): Promise<StoreSettings> {
    return this.request<StoreSettings>('/api/v1/platform/vendor/store');
  }

  async updateVendorStore(payload: Partial<StoreSettings>): Promise<StoreSettings> {
    return this.request<StoreSettings>('/api/v1/platform/vendor/store', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getVendorAppConfig(): Promise<AppConfig> {
    return this.request<AppConfig>('/api/v1/platform/vendor/app-config');
  }

  async updateVendorAppConfig(payload: Partial<AppConfig>): Promise<AppConfig> {
    return this.request<AppConfig>('/api/v1/platform/vendor/app-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getProducts(params?: { category_id?: string; status?: string }): Promise<Product[]> {
    const q = new URLSearchParams();
    if (params?.category_id) q.set('category_id', params.category_id);
    if (params?.status) q.set('status_filter', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<Product[]>(`/api/v1/platform/vendor/products${qs}`);
  }

  async createProduct(payload: Partial<Product> & { image_urls?: string[] }): Promise<Product> {
    return this.request<Product>('/api/v1/platform/vendor/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(id: string, payload: Partial<Product> & { image_urls?: string[] }): Promise<Product> {
    return this.request<Product>(`/api/v1/platform/vendor/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/platform/vendor/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/api/v1/platform/vendor/categories');
  }

  async createCategory(payload: Partial<Category>): Promise<Category> {
    return this.request<Category>('/api/v1/platform/vendor/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCategory(id: string, payload: Partial<Category>): Promise<Category> {
    return this.request<Category>(`/api/v1/platform/vendor/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/platform/vendor/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getBanners(): Promise<Banner[]> {
    return this.request<Banner[]>('/api/v1/platform/vendor/banners');
  }

  async createBanner(payload: Partial<Banner>): Promise<Banner> {
    return this.request<Banner>('/api/v1/platform/vendor/banners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBanner(id: string, payload: Partial<Banner>): Promise<Banner> {
    return this.request<Banner>(`/api/v1/platform/vendor/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteBanner(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/platform/vendor/banners/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrders(statusFilter?: string): Promise<Order[]> {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : '';
    return this.request<Order[]>(`/api/v1/platform/vendor/orders${qs}`);
  }

  async updateOrderStatus(orderId: string, payload: { order_status?: string; payment_status?: string }): Promise<any> {
    return this.request(`/api/v1/platform/vendor/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/api/v1/platform/vendor/customers');
  }

  async getSubscriptionInfo(): Promise<any> {
    return this.request('/api/v1/platform/vendor/subscription');
  }

  async uploadFile(file: File, folder = 'products'): Promise<{ url: string; size_bytes: number; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dgs_platform_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/v1/platform/vendor/upload`, {
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

  async getAdminAddons(): Promise<Addon[]> {
    return this.request<Addon[]>('/api/v1/platform/admin/addons');
  }

  async createAdminAddon(payload: Partial<Addon>): Promise<Addon> {
    return this.request<Addon>('/api/v1/platform/admin/addons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/api/v1/platform/admin/audit-logs');
  }

  // ──────────────────────────────────────────────
  // Public Store & Android App APIs
  // ──────────────────────────────────────────────
  async getPublicStoreConfig(slug: string): Promise<any> {
    return this.request(`/api/store/${slug}/config`);
  }

  async getPublicStoreProducts(slug: string, categoryId?: string): Promise<any[]> {
    const qs = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/api/store/${slug}/products${qs}`);
  }

  async getPublicStoreCategories(slug: string): Promise<any[]> {
    return this.request(`/api/store/${slug}/categories`);
  }

  async getPublicStoreBanners(slug: string): Promise<any[]> {
    return this.request(`/api/store/${slug}/banners`);
  }

  async createPublicOrder(slug: string, payload: any): Promise<any> {
    return this.request(`/api/store/${slug}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const platformApi = new PlatformApiClient();

