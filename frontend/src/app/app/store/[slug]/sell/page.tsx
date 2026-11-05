import React, { Suspense } from "react";
import SellOnStoreClient from "./SellOnStoreClient";

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

export default function SellOnStorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SellOnStoreClient />
    </Suspense>
  );
}

