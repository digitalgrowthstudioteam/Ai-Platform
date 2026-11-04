import React, { Suspense } from "react";
import CategoryBrowseClient from "./CategoryBrowseClient";

export function generateStaticParams() {
  return [
    { slug: "placeholder" },
    { slug: "abc" },
    { slug: "xyz" },
    { slug: "myshoppartner" },
    { slug: "kcaariwork" },
  ];
}

export default function CategoryBrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CategoryBrowseClient />
    </Suspense>
  );
}

