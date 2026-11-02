import AccountClient from "./AccountClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder" },
    { slug: "abc" },
    { slug: "xyz" },
  ];
}

export default function AccountPage() {
  return <AccountClient />;
}

