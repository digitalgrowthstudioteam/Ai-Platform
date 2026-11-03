import React from "react";
import StorePolicyClient from "./StorePolicyClient";

export function generateStaticParams() {
  const slugs = ["placeholder", "abc", "xyz", "kcaariwork"];
  const types = ["terms", "privacy", "shipping", "refund"];
  const params: { slug: string; type: string }[] = [];

  for (const slug of slugs) {
    for (const type of types) {
      params.push({ slug, type });
    }
  }

  return params;
}

export default function StorePolicyPage() {
  return <StorePolicyClient />;
}

