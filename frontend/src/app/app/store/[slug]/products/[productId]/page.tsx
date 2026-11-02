import ProductDetailClient from "./ProductDetailClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder", productId: "sample" },
    { slug: "abc", productId: "sample" },
    { slug: "xyz", productId: "sample" },
  ];
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}

