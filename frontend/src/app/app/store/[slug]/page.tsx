import StorePreviewClient from "./StorePreviewClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder" },
    { slug: "abc" },
    { slug: "xyz" },
  ];
}

export default function StorePreviewPage() {
  return <StorePreviewClient />;
}

