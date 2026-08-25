import AdminQuotationDetailClient from "./AdminQuotationDetailClient";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function AdminQuotationDetailPage() {
  return <AdminQuotationDetailClient />;
}
