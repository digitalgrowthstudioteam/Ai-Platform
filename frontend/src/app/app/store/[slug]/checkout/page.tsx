import CheckoutClient from "./CheckoutClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder" },
    { slug: "abc" },
    { slug: "xyz" },
  ];
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}

