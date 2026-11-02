import CartClient from "./CartClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder" },
    { slug: "abc" },
    { slug: "xyz" },
  ];
}

export default function CartPage() {
  return <CartClient />;
}

