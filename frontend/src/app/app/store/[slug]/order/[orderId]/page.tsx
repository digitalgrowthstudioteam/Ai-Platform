import OrderDetailClient from "./OrderDetailClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder", orderId: "sample" },
    { slug: "abc", orderId: "sample" },
    { slug: "xyz", orderId: "sample" },
    { slug: "myshoppartner", orderId: "sample" },
    { slug: "kcaariwork", orderId: "sample" },
    { slug: "glam-stree-nails", orderId: "sample" },
    { slug: "glamstree", orderId: "sample" },
  ];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}

