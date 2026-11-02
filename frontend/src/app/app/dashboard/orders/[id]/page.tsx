import OrderDetailClient from "./OrderDetailClient";

export function generateStaticParams() {
  return [
    { id: "placeholder" },
  ];
}

export default function VendorOrderDetailPage() {
  return <OrderDetailClient />;
}

