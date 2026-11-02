"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProductForm from "@/components/app-platform/products/ProductForm";

export default function EditProductClient() {
  const params = useParams();
  const [productId, setProductId] = useState<string>(() => {
    let pId = (params?.id as string) || "";
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const parts = pathname.split("/").filter(Boolean);
      const prodIdx = parts.indexOf("products");
      if (prodIdx !== -1 && parts.length > prodIdx + 1) {
        const fromPath = decodeURIComponent(parts[prodIdx + 1]);
        if (fromPath && fromPath !== "placeholder" && fromPath !== "new") {
          pId = fromPath;
        }
      }
    }
    return pId;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const parts = pathname.split("/").filter(Boolean);
      const prodIdx = parts.indexOf("products");
      if (prodIdx !== -1 && parts.length > prodIdx + 1) {
        const fromPath = decodeURIComponent(parts[prodIdx + 1]);
        if (fromPath && fromPath !== "placeholder" && fromPath !== "new") {
          setProductId(fromPath);
        }
      }
    }
  }, [params]);

  return <ProductForm productId={productId} />;
}

