import CheckoutClient from "./CheckoutClient";

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

export default function CheckoutPage() {
  return <CheckoutClient />;
}

