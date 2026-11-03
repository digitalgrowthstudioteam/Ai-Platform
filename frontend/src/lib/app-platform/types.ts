/**
 * Digital Growth Studio — Multi-Vendor E-Commerce Platform Types
 */

export interface PlatformUser {
  user_id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'VENDOR_ADMIN';
  vendor_id?: string;
  vendor_code?: string;
  store_slug?: string;
  store_name?: string;
  status: string;
  setup_fee_cleared?: boolean;
  setup_fee_paid?: boolean;
  setup_fee_waived?: boolean;
  subscription_status?: string;
  apk_user_approved?: boolean;
}

export interface PlatformTokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'VENDOR_ADMIN';
  vendor_id?: string;
  vendor_code?: string;
  store_slug?: string;
}

export interface VendorOverview {
  vendor_code: string;
  store_name: string;
  store_slug: string;
  subdomain: string;
  status: string;
  total_products: number;
  active_products: number;
  out_of_stock_products: number;
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_sales_inr: number;
  total_customers: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  storage_percentage: number;
  subscription_plan: string;
  subscription_status: string;
  subscription_renewal_date?: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
  is_thumbnail: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price?: number;
  stock_quantity: number;
  images: string[];
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  slug: string;
  description?: string;
  regular_price: number;
  sale_price?: number;
  sku: string;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  is_featured: boolean;
  has_variants?: boolean;
  thumbnail_url?: string;
  images: ProductImage[];
  variants?: ProductVariant[];
  created_at: string;
}

export interface Category {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  vendor_id: string;
  title: string;
  description?: string;
  promo_offer?: string;
  image_url: string;
  link_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id?: string;
  product_name: string;
  product_sku?: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  vendor_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: 'NEW' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  courier_name?: string;
  tracking_number?: string;
  tracking_url?: string;
  shipped_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  items: OrderItem[];
}

export interface Customer {
  id: string;
  vendor_id: string;
  name: string;
  phone: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order_at?: string;
  created_at: string;
}

export interface VendorProfile {
  id?: string;
  vendor_id?: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  category: string;
  address?: string;
  description?: string;
  gst_number?: string;
  logo_url?: string;
  website?: string;
  brand_name?: string;
  brand_name_locked?: boolean;
  whatsapp_number?: string;
  whatsapp_business_name?: string;
  business_phone?: string;
  has_payment_gateway?: string;
  needs_delivery_help?: string;
}

export interface StoreSettings {
  id: string;
  vendor_id: string;
  store_name: string;
  store_slug: string;
  subdomain: string;
  status: string;
  primary_color: string;
  secondary_color: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  contact_email?: string;
  contact_phone?: string;
  business_address?: string;
  opening_hours: string;
  cod_enabled: boolean;
  razorpay_enabled: boolean;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_verified?: boolean;
  shipping_enabled?: boolean;
  shipping_charge?: number;
  free_shipping_min_order?: number;
  cod_charge?: number;
  estimated_delivery_days?: string;
  allowed_countries?: string;
  serviceable_pincodes_type?: string;
  serviceable_pincodes?: string;
  shiprocket_enabled?: boolean;
  shiprocket_email?: string;
  shiprocket_password?: string;
  shiprocket_auto_fulfill?: boolean;
}

export interface AppConfig {
  id: string;
  vendor_id: string;
  app_name: string;
  app_logo_url?: string;
  splash_screen_url?: string;
  primary_color: string;
  secondary_color: string;
  package_id: string;
  app_build_status: 'NOT_REQUESTED' | 'QUEUED' | 'IN_DEVELOPMENT' | 'BUILT' | 'FAILED';
  app_version: string;
  playstore_url?: string;
  publication_status: 'UNPUBLISHED' | 'PENDING_REVIEW' | 'PUBLISHED';
  is_locked?: boolean;
  apk_download_url?: string;
  apk_submitted_at?: string;
  apk_user_approved?: boolean;
  apk_user_approved_at?: string;
  subscription_auto_debit_active?: boolean;
}

export interface SetupFeeQuote {
  plan_name: string;
  base_price_inr: number;
  sale_price_inr: number;
  custom_price_inr?: number;
  final_price_inr: number;
  setup_fee_paid: boolean;
  setup_fee_waived: boolean;
  setup_fee_cleared: boolean;
  key_id: string;
  currency: string;
  features: string[];
}

export interface CouponValidation {
  valid: boolean;
  code: string;
  discount_type: string;
  discount_value: number;
  discount_inr: number;
  new_total_inr: number;
  message: string;
}

export interface PlatformCouponItem {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  applicable_to: string;
  vendor_id?: string;
  max_uses: number;
  used_count: number;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export interface SuperAdminOverview {
  total_vendors: number;
  active_vendors: number;
  inactive_vendors: number;
  trial_vendors: number;
  expired_subscriptions: number;
  total_mrr_inr: number;
  total_razorpay_funds_inr?: number;
  total_payments_count?: number;
  total_orders_all_vendors: number;
  total_products_all_vendors: number;
  new_registrations_this_month: number;
  total_storage_used_mb: number;
}

export interface VendorListItem {
  id: string;
  vendor_code: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  store_slug: string;
  subdomain: string;
  status: string;
  plan_name: string;
  subscription_status: string;
  total_products: number;
  total_orders: number;
  app_build_status: string;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  monthly_price_inr: number;
  setup_fee_inr: number;
  setup_fee_sale_price_inr?: number;
  storage_limit_mb: number;
  max_products: number;
  is_active: boolean;
  features_json: string;
  created_at: string;
}

export interface VendorDetailFull {
  id: string;
  vendor_code: string;
  status: string;
  created_at: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  category: string;
  address?: string;
  description?: string;
  gst_number?: string;
  logo_url?: string;
  website?: string;
  store_slug: string;
  subdomain: string;
  store_status: string;
  store_created_at: string;
  primary_color: string;
  secondary_color: string;
  cod_enabled: boolean;
  razorpay_enabled: boolean;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_verified?: boolean;
  app_name: string;
  app_logo_url?: string;
  splash_screen_url?: string;
  app_primary_color: string;
  app_secondary_color: string;
  package_id: string;
  app_build_status: string;
  app_version: string;
  playstore_url?: string;
  publication_status: string;
  total_products: number;
  total_orders: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  plan_name?: string;
  subscription_status?: string;
  renewal_date?: string;
  setup_fee_paid: boolean;
  setup_fee_waived: boolean;
  setup_fee_custom_price_inr?: number;
  apk_user_approved: boolean;
  apk_download_url?: string;
}

export interface Addon {
  id: string;
  name: string;
  code: string;
  description?: string;
  price_inr: number;
  billing_type: 'ONE_TIME' | 'MONTHLY';
  is_active: boolean;
  created_at: string;
}

