/**
 * Digital Growth Studio — Glam Stree Nails Brand Theme Resources
 * Contains catalog items, reviews, FAQs, sizing guides, and brand constants.
 */

export interface GlamNailProduct {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category_name: string;
  regular_price: number;
  sale_price: number;
  effective_price: number;
  discount_percentage: number;
  thumbnail_url: string;
  images: string[];
  rating: number;
  review_count: number;
  description: string;
  shape: string;
  finish: string;
  in_stock: boolean;
  stock_quantity: number;
  featured?: boolean;
}

export const GLAM_STREE_PRODUCTS: GlamNailProduct[] = [
  {
    id: "gs-burgundy-glossy",
    name: "Deep Red Burgundy - Glossy Press On Nails",
    slug: "deep-red-burgundy-glossy-press-on-nails",
    category_id: "cat-bestsellers",
    category_name: "Bestsellers",
    regular_price: 1299,
    sale_price: 499,
    effective_price: 499,
    discount_percentage: 62,
    thumbnail_url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 48,
    description: "Rich, sultry wine burgundy nails crafted with 5 coats of ultra-glossy salon UV gel. Perfect for festive weddings, cocktail parties, or elevating your daily signature look.",
    shape: "Almond",
    finish: "High Gloss",
    in_stock: true,
    stock_quantity: 45,
    featured: true,
  },
  {
    id: "gs-french-nude",
    name: "Classic French Nude Almond - Press On Nails",
    slug: "classic-french-nude-almond-press-on-nails",
    category_id: "cat-french-nude",
    category_name: "French & Nude",
    regular_price: 1299,
    sale_price: 499,
    effective_price: 499,
    discount_percentage: 62,
    thumbnail_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 36,
    description: "The timeless Parisian French manicure with an ultra-natural translucent pink base and crisp white smile line. Chic, minimal, and ideal for office and boardroom elegance.",
    shape: "Almond",
    finish: "Glossy Gel",
    in_stock: true,
    stock_quantity: 60,
    featured: true,
  },
  {
    id: "gs-royal-navy",
    name: "Royal Navy Blue Shimmer - Coffin Nails",
    slug: "royal-navy-blue-shimmer-coffin-nails",
    category_id: "cat-bestsellers",
    category_name: "Bestsellers",
    regular_price: 1399,
    sale_price: 549,
    effective_price: 549,
    discount_percentage: 61,
    thumbnail_url: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 29,
    description: "Midnight royal navy blue with micro-diamond holographic shimmer that catches the light with every move. A showstopping evening statement.",
    shape: "Coffin",
    finish: "Glitter Shimmer",
    in_stock: true,
    stock_quantity: 32,
    featured: true,
  },
  {
    id: "gs-emerald-green",
    name: "Velvet Emerald Forest - Matte Press On Nails",
    slug: "velvet-emerald-forest-matte-press-on-nails",
    category_id: "cat-party",
    category_name: "Party & Bridal",
    regular_price: 1399,
    sale_price: 549,
    effective_price: 549,
    discount_percentage: 61,
    thumbnail_url: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
      "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 22,
    description: "Deep opulent forest green coated in a smooth velvet matte texture with hand-painted 18k gold chrome accents along the cuticle line.",
    shape: "Almond",
    finish: "Velvet Matte",
    in_stock: true,
    stock_quantity: 28,
    featured: true,
  },
  {
    id: "gs-mocha-swirls",
    name: "Mocha Coffee Swirls - Glossy Press On Nails",
    slug: "mocha-coffee-swirls-glossy-press-on-nails",
    category_id: "cat-daily",
    category_name: "Daily Minimal",
    regular_price: 1299,
    sale_price: 499,
    effective_price: 499,
    discount_percentage: 62,
    thumbnail_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 19,
    description: "Modern abstract coffee and warm chocolate swirls over a soft caramel nude translucent base. Contemporary and versatile for daily styling.",
    shape: "Oval/Round",
    finish: "Glossy Gel",
    in_stock: true,
    stock_quantity: 40,
    featured: false,
  },
  {
    id: "gs-rose-glitter",
    name: "Rose Gold Glitter Ombre - Bridal Nails",
    slug: "rose-gold-glitter-ombre-bridal-nails",
    category_id: "cat-party",
    category_name: "Party & Bridal",
    regular_price: 1499,
    sale_price: 599,
    effective_price: 599,
    discount_percentage: 60,
    thumbnail_url: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 31,
    description: "Cascading rose gold glitter fading gracefully into blush pink. Specially crafted for brides, bridesmaids, and cocktail celebrations.",
    shape: "Coffin",
    finish: "Glitter Ombre",
    in_stock: true,
    stock_quantity: 25,
    featured: true,
  },
  {
    id: "gs-glazed-pearl",
    name: "Glazed Donut Pearl Chrome - Press On Nails",
    slug: "glazed-donut-pearl-chrome-press-on-nails",
    category_id: "cat-bestsellers",
    category_name: "Bestsellers",
    regular_price: 1399,
    sale_price: 549,
    effective_price: 549,
    discount_percentage: 61,
    thumbnail_url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 44,
    description: "The viral glazed donut iridescent pearl chrome effect over clean milky white. Luminous, angelic, and mesmerising under daylight.",
    shape: "Almond",
    finish: "Pearl Chrome",
    in_stock: true,
    stock_quantity: 50,
    featured: true,
  },
  {
    id: "gs-sage-minimal",
    name: "Sage Green & Gold Leaf - Minimalist Nails",
    slug: "sage-green-gold-leaf-minimalist-nails",
    category_id: "cat-daily",
    category_name: "Daily Minimal",
    regular_price: 1299,
    sale_price: 499,
    effective_price: 499,
    discount_percentage: 62,
    thumbnail_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
    ],
    rating: 5.0,
    review_count: 17,
    description: "Earthy pastel sage green accented with delicate 24k metallic gold leaf flakes. Subtle luxury designed for everyday wear.",
    shape: "Square",
    finish: "Soft Satin",
    in_stock: true,
    stock_quantity: 35,
    featured: false,
  },
];

export const GLAM_STREE_CATEGORIES = [
  { id: "cat-all", name: "All Press On Nails", slug: "all", count: 8 },
  { id: "cat-bestsellers", name: "Bestsellers", slug: "bestsellers", count: 4 },
  { id: "cat-french-nude", name: "French & Nude", slug: "french-nude", count: 2 },
  { id: "cat-party", name: "Party & Bridal", slug: "party-bridal", count: 3 },
  { id: "cat-daily", name: "Daily Minimal", slug: "daily-minimal", count: 3 },
];

export const GLAM_STREE_SIZES = [
  { key: "XS", label: "XS (14, 11, 12, 11, 8 mm)", desc: "Petite nail beds" },
  { key: "S", label: "S (15, 12, 13, 12, 9 mm)", desc: "Small to medium hands" },
  { key: "M", label: "M (16, 13, 14, 13, 10 mm)", desc: "Most popular universal fit" },
  { key: "L", label: "L (17, 14, 15, 14, 11 mm)", desc: "Wide / broad nail beds" },
  { key: "Custom", label: "Custom Sizing", desc: "Share thumb to pinky mm measurements" },
];

export const GLAM_STREE_SHAPES = [
  { name: "Almond", desc: "Elongates fingers, feminine & graceful" },
  { name: "Coffin", desc: "Trendy tapered tip with flat square edge" },
  { name: "Oval/Round", desc: "Natural classic daily wear" },
  { name: "Square", desc: "Modern sharp edges with strong apex" },
  { name: "Stiletto", desc: "Dramatic pointed bold silhouette" },
];

export const GLAM_STREE_REVIEWS = [
  {
    name: "Priya Sharma",
    city: "Mumbai",
    rating: 5,
    date: "2 days ago",
    verified: true,
    review: "Looks like a ₹2,500 salon gel extension! Applied them in 10 minutes with the glue and they stayed rock solid for 14 days straight without a single lift.",
    photo_url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80",
    product_title: "Deep Red Burgundy - Glossy Press On Nails",
  },
  {
    name: "Sneha Kulkarni",
    city: "Pune",
    rating: 5,
    date: "1 week ago",
    verified: true,
    review: "I got so many compliments at my cousin's wedding! Everyone thought I spent 3 hours in a nail studio. Removing them in warm water was totally painless.",
    photo_url: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&q=80",
    product_title: "Classic French Nude Almond Nails",
  },
  {
    name: "Ananya Roy",
    city: "Bengaluru",
    rating: 5,
    date: "2 weeks ago",
    verified: true,
    review: "The sizing guide is 100% accurate! Size M fit my cuticles seamlessly. The prep kit included everything: file, glue, tabs, buffer. Already placing my 2nd order!",
    photo_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&q=80",
    product_title: "Royal Navy Blue Shimmer Coffin Nails",
  },
];

export const GLAM_STREE_FAQS = [
  {
    q: "What comes inside every Glam Stree Nails kit?",
    a: "Every single set includes 10 custom handcrafted press-on nails plus our Complete Salon Application Kit for free: 1 Professional Liquid Nail Glue (lasts 2–3 weeks), 24 Gel Adhesive Tabs (lasts 3–5 days for short events), 1 Double-Sided Nail File, 1 Cuticle Pusher, 1 Buffer, and 2 Cleansing Alcohol Prep Wipes.",
  },
  {
    q: "How long do the press-on nails stay on?",
    a: "Using the included Professional Liquid Glue, nails stay on securely for 2 to 3 weeks with proper cuticle prep. If you use the Gel Adhesive Tabs, they stay for 3 to 7 days, which is ideal for weekends, parties, or photoshoots.",
  },
  {
    q: "Are Glam Stree Press-On Nails reusable?",
    a: "Yes, 100% reusable up to 5 times! Because our nails are built with multi-layered cured salon gel rather than flimsy printed plastic, they do not bend, fade, or snap. When removing with warm soapy water and oil, gently buff away excess glue and store them in the box for next wear.",
  },
  {
    q: "How do I measure my nail size accurately?",
    a: "Place a piece of clear transparent tape horizontally across the widest part of your natural nail bed. Mark the edges with a pen, peel the tape off, and measure between the marks using a millimeter (mm) ruler. Compare your thumb-to-pinky mm values with our XS, S, M, L size chart, or choose Custom Size.",
  },
  {
    q: "Can I wash dishes, shower, or workout with press-on nails?",
    a: "Yes! Our nails are 100% waterproof and chip-resistant. Just avoid soaking your hands in very hot water for the first 2 hours right after application so the adhesive bonds fully.",
  },
  {
    q: "Do press-on nails damage natural nails?",
    a: "No! Unlike acrylic extensions or electric drill refills that thin out your nail bed, press-on nails are completely damage-free. Removal requires soaking your hands in warm water with a few drops of baby oil or soap for 10-15 minutes, allowing the nails to slide off gently.",
  },
];

/**
 * Utility helper to determine if the active store is Glam Stree Nails.
 */
export function isGlamStreeStore(slug?: string, config?: any): boolean {
  if (!slug && !config) return false;
  const s = (slug || "").toLowerCase();
  const storeSlug = (config?.store_slug || "").toLowerCase();
  const sub = (config?.subdomain || "").toLowerCase();
  const name = (config?.store_name || "").toLowerCase();
  return (
    s.includes("glam-stree") ||
    s.includes("glamstree") ||
    storeSlug.includes("glam-stree") ||
    storeSlug.includes("glamstree") ||
    sub.includes("glam-stree") ||
    sub.includes("glamstree") ||
    name.includes("glam stree")
  );
}

