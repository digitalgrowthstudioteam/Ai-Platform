import EditProductClient from "./EditProductClient";

export function generateStaticParams() {
  return [
    { id: "placeholder" },
  ];
}

export default function EditProductPage() {
  return <EditProductClient />;
}
