import OrderDetailClient from "./OrderDetailClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder", orderId: "sample" },
    { slug: "abc", orderId: "sample" },
    { slug: "xyz", orderId: "sample" },
  ];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}

