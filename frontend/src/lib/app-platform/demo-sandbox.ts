/**
 * Digital Growth Studio — Interactive Demo Store Sandbox
 * Isolated in-memory state that never writes to the real database.
 * Resets on reload or when the user clicks 'Reset Sandbox'.
 */

import {
  PlatformUser,
  VendorOverview,
  Product,
  Category,
  Banner,
  Order,
  OrderItem,
  Customer,
  StoreSettings,
  VendorProfile,
  AppConfig,
} from './types';

export const DEMO_USER: PlatformUser = {
  user_id: "demo-vendor-sandbox",
  email: "demo@digitalgrowthstudio.in",
  name: "Demo Store Sandbox",
  role: "VENDOR_ADMIN",
  vendor_code: "DEMO0001",
  store_name: "Glow & Style Demo Store",
  store_slug: "xyz",
  status: "active",
};

const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-1",
    vendor_id: "demo-vendor-sandbox",
    name: "Dresses & Apparel",
    slug: "dresses-apparel",
    sort_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cat-2",
    vendor_id: "demo-vendor-sandbox",
    name: "Outerwear & Jackets",
    slug: "outerwear-jackets",
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cat-3",
    vendor_id: "demo-vendor-sandbox",
    name: "Skincare & Wellness",
    slug: "skincare-wellness",
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "demo-prod-1",
    vendor_id: "demo-vendor-sandbox",
    category_id: "cat-1",
    category_name: "Dresses & Apparel",
    name: "Classic Floral Summer Dress",
    slug: "classic-floral-summer-dress",
    description: "Breathable pure linen summer dress with hand-printed botanical floral patterns.",
    regular_price: 1999.0,
    sale_price: 1499.0,
    sku: "DEMO-DRS-001",
    stock_quantity: 45,
    status: "active",
    is_featured: true,
    has_variants: true,
    thumbnail_url: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
    images: [
      {
        id: "img-1",
        image_url: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
        sort_order: 0,
        is_thumbnail: true,
      },
      {
        id: "img-2",
        image_url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80",
        sort_order: 1,
        is_thumbnail: false,
      },
      {
        id: "img-3",
        image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500&q=80",
        sort_order: 2,
        is_thumbnail: false,
      },
    ],
    variants: [
      {
        id: "var-1",
        name: "Small / Rose Pink",
        sku: "DEMO-DRS-001-SM",
        price: 1499.0,
        stock_quantity: 15,
        images: [
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
          "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80",
        ],
        sort_order: 0,
        is_active: true,
      },
      {
        id: "var-2",
        name: "Medium / Emerald Flora",
        sku: "DEMO-DRS-001-MD",
        price: 1499.0,
        stock_quantity: 20,
        images: [
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500&q=80",
        ],
        sort_order: 1,
        is_active: true,
      },
      {
        id: "var-3",
        name: "Large / Ocean Navy",
        sku: "DEMO-DRS-001-LG",
        price: 1699.0,
        stock_quantity: 10,
        images: [
          "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&q=80",
        ],
        sort_order: 2,
        is_active: true,
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-prod-2",
    vendor_id: "demo-vendor-sandbox",
    category_id: "cat-2",
    category_name: "Outerwear & Jackets",
    name: "Urban Denim Trucker Jacket",
    slug: "urban-denim-trucker-jacket",
    description: "Classic vintage wash denim jacket made from 100% durable heavyweight ring-spun cotton.",
    regular_price: 3499.0,
    sale_price: 2799.0,
    sku: "DEMO-JKT-002",
    stock_quantity: 18,
    status: "active",
    is_featured: true,
    thumbnail_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
    images: [
      {
        id: "img-4",
        image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
        sort_order: 0,
        is_thumbnail: true,
      },
      {
        id: "img-5",
        image_url: "https://images.unsplash.com/photo-1544441893-675973e31985?w=500&q=80",
        sort_order: 1,
        is_thumbnail: false,
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-prod-3",
    vendor_id: "demo-vendor-sandbox",
    category_id: "cat-3",
    category_name: "Skincare & Wellness",
    name: "Minimalist Botanical Face Cleanser",
    slug: "minimalist-botanical-face-cleanser",
    description: "Gentle purifying gel cleanser infused with green tea and rosehip extracts.",
    regular_price: 699.0,
    sale_price: 549.0,
    sku: "DEMO-SKN-003",
    stock_quantity: 30,
    status: "active",
    is_featured: false,
    thumbnail_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80",
    images: [
      {
        id: "img-6",
        image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80",
        sort_order: 0,
        is_thumbnail: true,
      },
    ],
    created_at: new Date().toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: "demo-ord-1",
    vendor_id: "demo-vendor-sandbox",
    order_number: "ORD-DEMO-1001",
    customer_name: "Priya Sharma",
    customer_phone: "+91 98765 43210",
    customer_email: "priya.sharma@example.com",
    shipping_address: "Flat 402, Lotus Apartments, Indiranagar, Bangalore 560038",
    payment_method: "ONLINE",
    payment_status: "PAID",
    order_status: "PROCESSING",
    total_amount: 1499.0,
    items: [
      {
        id: "item-1",
        product_name: "Classic Floral Summer Dress",
        product_sku: "DEMO-DRS-001",
        price: 1499.0,
        quantity: 1,
        total: 1499.0,
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "demo-ord-2",
    vendor_id: "demo-vendor-sandbox",
    order_number: "ORD-DEMO-1002",
    customer_name: "Rahul Verma",
    customer_phone: "+91 99887 76655",
    customer_email: "rahul.v@example.com",
    shipping_address: "14 Sector 22, Chandigarh 160022",
    payment_method: "COD",
    payment_status: "PENDING",
    order_status: "SHIPPED",
    total_amount: 2799.0,
    items: [
      {
        id: "item-2",
        product_name: "Urban Denim Trucker Jacket",
        product_sku: "DEMO-JKT-002",
        price: 2799.0,
        quantity: 1,
        total: 2799.0,
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: "demo-ord-3",
    vendor_id: "demo-vendor-sandbox",
    order_number: "ORD-DEMO-1003",
    customer_name: "Ananya Deshmukh",
    customer_phone: "+91 91234 56789",
    customer_email: "ananya.d@example.com",
    shipping_address: "502 Hill Road, Bandra West, Mumbai 400050",
    payment_method: "ONLINE",
    payment_status: "PAID",
    order_status: "DELIVERED",
    total_amount: 2048.0,
    items: [
      {
        id: "item-3",
        product_name: "Minimalist Botanical Face Cleanser",
        product_sku: "DEMO-SKN-003",
        price: 549.0,
        quantity: 1,
        total: 549.0,
      },
      {
        id: "item-4",
        product_name: "Classic Floral Summer Dress",
        product_sku: "DEMO-DRS-001",
        price: 1499.0,
        quantity: 1,
        total: 1499.0,
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const INITIAL_BANNERS: Banner[] = [
  {
    id: "demo-banner-1",
    vendor_id: "demo-vendor-sandbox",
    title: "Summer Collection Launch",
    description: "Discover effortless silhouettes crafted from sustainable organic linen.",
    promo_offer: "FLAT 30% OFF",
    image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
    link_url: "",
    sort_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_STORE: StoreSettings = {
  id: "demo-store-1",
  vendor_id: "demo-vendor-sandbox",
  store_name: "Glow & Style Online",
  store_slug: "xyz",
  subdomain: "xyz.digitalgrowthstudio.in",
  description: "Interactive demonstration storefront showcasing catalog management, cart workflows, and mobile app integration.",
  primary_color: "#2563EB",
  secondary_color: "#1E293B",
  logo_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=80",
  banner_url: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80",
  contact_email: "support@glowandstyle.demo",
  contact_phone: "+91 98765 00000",
  business_address: "Demonstration Suite 101, Tech Park, Bangalore",
  opening_hours: "Mon - Sat: 9:00 AM - 9:00 PM",
  status: "active",
  cod_enabled: true,
  razorpay_enabled: false,
  razorpay_key_id: undefined,
  shipping_enabled: true,
  shipping_charge: 70,
  free_shipping_min_order: 999,
  cod_charge: 40,
  estimated_delivery_days: "3-5 Business Days",
  allowed_countries: "India",
  serviceable_pincodes_type: "all",
  serviceable_pincodes: "",
  shiprocket_enabled: false,
  shiprocket_email: "",
  shiprocket_password: "",
  shiprocket_auto_fulfill: false,
};

const INITIAL_APP_CONFIG: AppConfig = {
  id: "demo-app-1",
  vendor_id: "demo-vendor-sandbox",
  app_name: "Glow & Style Store",
  app_logo_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=512&q=80",
  splash_screen_url: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1080&q=80",
  primary_color: "#2563EB",
  secondary_color: "#1E293B",
  package_id: "in.digitalgrowthstudio.glowstyle",
  app_build_status: "BUILT",
  app_version: "1.0.0",
  playstore_url: "https://play.google.com/store/apps/details?id=in.digitalgrowthstudio.glowstyle",
  publication_status: "PENDING_REVIEW",
  is_locked: true,
};

/**
 * In-memory sandbox storage that resets whenever the page is hard refreshed.
 */
class DemoSandboxStore {
  private products: Product[] = [];
  private categories: Category[] = [];
  private orders: Order[] = [];
  private banners: Banner[] = [];
  private storeSettings: StoreSettings = { ...INITIAL_STORE };
  private appConfig: AppConfig = { ...INITIAL_APP_CONFIG };

  constructor() {
    this.reset();
  }

  reset() {
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.categories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    this.orders = JSON.parse(JSON.stringify(INITIAL_ORDERS));
    this.banners = JSON.parse(JSON.stringify(INITIAL_BANNERS));
    this.storeSettings = JSON.parse(JSON.stringify(INITIAL_STORE));
    this.appConfig = JSON.parse(JSON.stringify(INITIAL_APP_CONFIG));
  }

  getOverview(): VendorOverview {
    const totalSales = this.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    return {
      vendor_code: "DEMO0001",
      store_name: this.storeSettings.store_name,
      store_slug: this.storeSettings.store_slug,
      subdomain: this.storeSettings.subdomain,
      status: "active",
      total_products: this.products.length,
      active_products: this.products.filter((p) => p.status === 'active').length,
      out_of_stock_products: this.products.filter((p) => p.stock_quantity <= 0).length,
      total_orders: this.orders.length,
      pending_orders: this.orders.filter((o) => o.order_status === 'NEW' || o.order_status === 'CONFIRMED').length,
      processing_orders: this.orders.filter((o) => o.order_status === 'PROCESSING').length,
      completed_orders: this.orders.filter((o) => o.order_status === 'DELIVERED').length,
      cancelled_orders: this.orders.filter((o) => o.order_status === 'CANCELLED').length,
      total_sales_inr: totalSales,
      total_customers: 2,
      storage_used_bytes: 35 * 1024 * 1024,
      storage_limit_bytes: 1024 * 1024 * 1024,
      storage_percentage: 3.4,
      subscription_plan: "Starter Store (Sandbox)",
      subscription_status: "active",
      subscription_renewal_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
  }

  // Store
  getStore(): StoreSettings {
    return { ...this.storeSettings };
  }
  updateStore(payload: Partial<StoreSettings>): StoreSettings {
    this.storeSettings = { ...this.storeSettings, ...payload };
    return { ...this.storeSettings };
  }

  // Profile
  getProfile(): VendorProfile {
    return {
      business_name: this.storeSettings.store_name,
      owner_name: "Demo Store Owner",
      email: "demo@digitalgrowthstudio.in",
      phone: "+91 9876543210",
      category: "Dresses & Apparel",
      brand_name: "Glow & Style",
      brand_name_locked: true,
      whatsapp_number: "+91 9876543210",
      whatsapp_business_name: "Glow & Style Official",
      business_phone: "+91 9876543210",
      has_payment_gateway: "Yes",
      needs_delivery_help: "No",
      address: "123 Fashion Blvd, Suite 400, Mumbai, Maharashtra 400001",
      description: this.storeSettings.description,
      logo_url: this.storeSettings.logo_url,
    };
  }

  updateProfile(payload: Partial<VendorProfile>): VendorProfile {
    return { ...this.getProfile(), ...payload };
  }

  // App Config
  getAppConfig(): AppConfig {
    return { ...this.appConfig };
  }
  updateAppConfig(payload: Partial<AppConfig>): AppConfig {
    this.appConfig = { ...this.appConfig, ...payload };
    if (payload.app_logo_url) {
      this.storeSettings.logo_url = payload.app_logo_url;
    }
    return { ...this.appConfig };
  }

  // Products
  getProduct(id: string): Product | undefined {
    return this.products.find((p) => p.id === id || p.slug === id);
  }

  getProducts(catId?: string, statusFilter?: string): Product[] {
    return this.products.filter((p) => {
      if (catId && p.category_id !== catId) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }
  createProduct(payload: any): Product {
    const images = (payload.image_urls || []).map((url: string, idx: number) => ({
      id: `img-${Date.now()}-${idx}`,
      image_url: url,
      sort_order: idx,
      is_thumbnail: idx === 0,
    }));
    const variants = (payload.variants || []).map((v: any, idx: number) => ({
      id: v.id || `var-${Date.now()}-${idx}`,
      name: v.name,
      sku: v.sku || `${payload.sku || "SKU"}-${idx + 1}`,
      price: v.price ? Number(v.price) : undefined,
      stock_quantity: Number(v.stock_quantity) || 0,
      images: v.images || [],
      sort_order: v.sort_order ?? idx,
      is_active: v.is_active !== false,
    }));
    const hasVariants = variants.length > 0;
    const stockQty = hasVariants ? variants.reduce((acc: number, cur: any) => acc + cur.stock_quantity, 0) : Number(payload.stock_quantity) || 0;

    const newProd: Product = {
      id: `demo-prod-${Date.now()}`,
      vendor_id: "demo-vendor-sandbox",
      category_id: payload.category_id || undefined,
      category_name: this.categories.find((c) => c.id === payload.category_id)?.name,
      name: payload.name,
      slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: payload.description || "",
      regular_price: Number(payload.regular_price) || 0,
      sale_price: payload.sale_price ? Number(payload.sale_price) : undefined,
      sku: payload.sku || `SKU-${Date.now().toString().slice(-4)}`,
      stock_quantity: stockQty,
      status: payload.status || "active",
      is_featured: Boolean(payload.is_featured),
      has_variants: hasVariants,
      thumbnail_url: images.length > 0 ? images[0].image_url : undefined,
      images,
      variants,
      created_at: new Date().toISOString(),
    };
    this.products.unshift(newProd);
    return newProd;
  }
  updateProduct(id: string, payload: any): Product {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const existing = this.products[idx];
      let updatedImages = existing.images;
      if (payload.image_urls) {
        updatedImages = payload.image_urls.map((url: string, i: number) => ({
          id: `img-${Date.now()}-${i}`,
          image_url: url,
          sort_order: i,
          is_thumbnail: i === 0,
        }));
      }
      let variants = existing.variants || [];
      let hasVariants = existing.has_variants;
      let stockQty = payload.stock_quantity !== undefined ? Number(payload.stock_quantity) : existing.stock_quantity;
      if (payload.variants !== undefined) {
        variants = (payload.variants || []).map((v: any, i: number) => ({
          id: v.id || `var-${Date.now()}-${i}`,
          name: v.name,
          sku: v.sku || `${existing.sku}-${i + 1}`,
          price: v.price ? Number(v.price) : undefined,
          stock_quantity: Number(v.stock_quantity) || 0,
          images: v.images || [],
          sort_order: v.sort_order ?? i,
          is_active: v.is_active !== false,
        }));
        hasVariants = variants.length > 0;
        if (hasVariants) {
          stockQty = variants.reduce((acc: number, cur: any) => acc + cur.stock_quantity, 0);
        }
      }
      this.products[idx] = {
        ...existing,
        ...payload,
        stock_quantity: stockQty,
        has_variants: hasVariants,
        variants,
        images: updatedImages,
        thumbnail_url: updatedImages.length > 0 ? updatedImages[0].image_url : existing.thumbnail_url,
      };
      return this.products[idx];
    }
    throw new Error("Product not found");
  }
  deleteProduct(id: string): { message: string } {
    this.products = this.products.filter((p) => p.id !== id);
    return { message: "Product deleted" };
  }

  // Categories
  getCategories(): Category[] {
    return [...this.categories];
  }
  createCategory(payload: any): Category {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      vendor_id: "demo-vendor-sandbox",
      name: payload.name,
      slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      image_url: payload.image_url,
      sort_order: payload.sort_order || this.categories.length,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_at: new Date().toISOString(),
    };
    this.categories.push(newCat);
    return newCat;
  }
  updateCategory(id: string, payload: any): Category {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.categories[idx] = { ...this.categories[idx], ...payload };
      return this.categories[idx];
    }
    throw new Error("Category not found");
  }
  deleteCategory(id: string): { message: string } {
    this.categories = this.categories.filter((c) => c.id !== id);
    return { message: "Category deleted" };
  }

  // Banners
  getBanners(): Banner[] {
    return [...this.banners];
  }
  createBanner(payload: any): Banner {
    const newBan: Banner = {
      id: `ban-${Date.now()}`,
      vendor_id: "demo-vendor-sandbox",
      title: payload.title,
      description: payload.description,
      promo_offer: payload.promo_offer,
      image_url: payload.image_url,
      link_url: payload.link_url,
      sort_order: payload.sort_order || this.banners.length,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_at: new Date().toISOString(),
    };
    this.banners.push(newBan);
    return newBan;
  }
  updateBanner(id: string, payload: any): Banner {
    const idx = this.banners.findIndex((b) => b.id === id);
    if (idx !== -1) {
      this.banners[idx] = { ...this.banners[idx], ...payload };
      return this.banners[idx];
    }
    throw new Error("Banner not found");
  }
  deleteBanner(id: string): { message: string } {
    this.banners = this.banners.filter((b) => b.id !== id);
    return { message: "Banner deleted" };
  }

  // Orders
  getOrders(statusFilter?: string): Order[] {
    if (statusFilter) {
      return this.orders.filter((o) => o.order_status === statusFilter);
    }
    return [...this.orders];
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.find((o) => o.id === orderId || o.order_number === orderId);
  }

  updateOrderStatus(orderId: string, payload: any): Order {
    const idx = this.orders.findIndex((o) => o.id === orderId || o.order_number === orderId);
    if (idx !== -1) {
      this.orders[idx] = { ...this.orders[idx], ...payload };
      return this.orders[idx];
    }
    throw new Error("Order not found");
  }

  createPublicOrder(payload: any): Order {
    const orderItems: OrderItem[] = (payload.items || []).map((it: any, index: number) => {
      const prod = this.products.find((p) => p.id === it.product_id);
      const unitPrice = prod
        ? prod.sale_price && prod.sale_price > 0
          ? prod.sale_price
          : prod.regular_price
        : 999;
      return {
        id: `demo-item-${Date.now()}-${index}`,
        product_id: it.product_id,
        product_name: prod ? prod.name : "Demo Product",
        product_sku: prod ? prod.sku : "SKU-DEMO",
        price: unitPrice,
        quantity: it.quantity || 1,
        total: unitPrice * (it.quantity || 1),
      };
    });

    const subtotal = orderItems.reduce((acc, it) => acc + it.total, 0);
    const shippingFee =
      this.storeSettings.shipping_enabled !== false
        ? this.storeSettings.free_shipping_min_order &&
          subtotal >= this.storeSettings.free_shipping_min_order
          ? 0
          : this.storeSettings.shipping_charge || 0
        : 0;
    const codFee =
      payload.payment_method?.toUpperCase() === "COD"
        ? this.storeSettings.cod_charge || 0
        : 0;
    const finalTotal = subtotal + shippingFee + codFee;

    const newOrder: Order = {
      id: `demo-ord-${Date.now()}`,
      vendor_id: "demo-vendor-sandbox",
      order_number: `ORD-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email || "customer@example.com",
      shipping_address: payload.shipping_address,
      total_amount: finalTotal,
      payment_method: payload.payment_method || "COD",
      payment_status: "PENDING",
      order_status: "NEW",
      notes: payload.notes || "Placed via Sandbox Storefront",
      created_at: new Date().toISOString(),
      items: orderItems,
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }

  getCustomerOrders(phone: string): Order[] {
    const clean = phone.replace(/\D/g, "");
    return this.orders.filter((o) =>
      o.customer_phone.replace(/\D/g, "").includes(clean)
    );
  }

  // Customers
  getCustomers(): Customer[] {
    return [
      {
        id: "cust-1",
        vendor_id: "demo-vendor-sandbox",
        name: "Priya Sharma",
        email: "priya.sharma@example.com",
        phone: "+91 98765 43210",
        total_orders: 4,
        total_spent: 6996.0,
        last_order_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: "cust-2",
        vendor_id: "demo-vendor-sandbox",
        name: "Rahul Verma",
        email: "rahul.v@example.com",
        phone: "+91 99887 76655",
        total_orders: 2,
        total_spent: 4298.0,
        last_order_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
    ];
  }

  getSubscriptionInfo(): any {
    return {
      subscription: {
        plan_id: "demo-plan",
        plan: {
          name: "Starter Store (Demo Sandbox)",
          monthly_price_inr: 499,
          storage_limit_mb: 1024,
        },
        status: "active",
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      available_addons: [
        { id: "addon-1", name: "Additional 5GB Cloud Storage", price_inr: 299, type: "MONTHLY" },
        { id: "addon-2", name: "Custom Domain Mapping", price_inr: 499, type: "ONE_TIME" },
      ],
      active_addons: [],
      storage: {
        total_bytes_used: 35 * 1024 * 1024,
        image_bytes_used: 35 * 1024 * 1024,
        limit_bytes: 1024 * 1024 * 1024,
        product_count: this.products.length,
      },
    };
  }
}

export const demoSandbox = new DemoSandboxStore();

