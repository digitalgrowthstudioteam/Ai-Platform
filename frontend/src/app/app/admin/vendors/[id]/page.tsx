import VendorDetailClient from "./VendorDetailClient";

export function generateStaticParams() {
  return [
    { id: "placeholder" },
  ];
}

export default function AdminVendorDetailPage() {
  return <VendorDetailClient />;
}
