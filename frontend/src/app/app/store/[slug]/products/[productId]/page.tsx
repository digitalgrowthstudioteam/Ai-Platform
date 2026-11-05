import ProductDetailClient from "./ProductDetailClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder", productId: "sample" },
    { slug: "abc", productId: "sample" },
    { slug: "xyz", productId: "sample" },
    { slug: "myshoppartner", productId: "sample" },
    { slug: "kcaariwork", productId: "sample" },
    { slug: "glam-stree-nails", productId: "sample" },
    { slug: "glam-stree-nails", productId: "gs-burgundy-glossy" },
    { slug: "glam-stree-nails", productId: "gs-french-nude" },
    { slug: "glam-stree-nails", productId: "gs-royal-navy" },
    { slug: "glam-stree-nails", productId: "gs-emerald-green" },
    { slug: "glam-stree-nails", productId: "gs-mocha-swirls" },
    { slug: "glam-stree-nails", productId: "gs-rose-glitter" },
    { slug: "glam-stree-nails", productId: "gs-glazed-pearl" },
    { slug: "glam-stree-nails", productId: "gs-sage-minimal" },
  ];
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}

