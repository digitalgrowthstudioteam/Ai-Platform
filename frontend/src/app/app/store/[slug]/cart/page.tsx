import CartClient from "./CartClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder" },
    { slug: "abc" },
    { slug: "xyz" },
    { slug: "myshoppartner" },
    { slug: "kcaariwork" },
    { slug: "glam-stree-nails" },
    { slug: "glamstree" },
  ];
}

export default function CartPage() {
  return <CartClient />;
}

