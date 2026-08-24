import PayQuotationClient from "./PayQuotationClient";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function PayQuotationPage() {
  return <PayQuotationClient />;
}
