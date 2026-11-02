/**
 * Digital Growth Studio — Vendor-Isolated Store Cart State Manager
 * Each vendor has its own independent cart in localStorage (`dgs_store_cart_${slug}`).
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export interface StoreCartItem {
  id: string; // product id
  product_id: string;
  name: string;
  slug?: string;
  sku?: string;
  price: number;
  effective_price: number;
  thumbnail_url?: string;
  quantity: number;
  stock_quantity?: number;
}

const CART_EVENT_PREFIX = "dgs-cart-updated-";

function getStorageKey(slug: string): string {
  return `dgs_store_cart_${slug}`;
}

export function getStoreCart(slug: string): StoreCartItem[] {
  if (typeof window === "undefined" || !slug) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read cart from localStorage:", e);
    return [];
  }
}

export function saveStoreCart(slug: string, items: StoreCartItem[]): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(`${CART_EVENT_PREFIX}${slug}`, { detail: items }));
  } catch (e) {
    console.error("Failed to save cart to localStorage:", e);
  }
}

export function addStoreCartItem(slug: string, item: Omit<StoreCartItem, "quantity"> & { quantity?: number }): StoreCartItem[] {
  const current = getStoreCart(slug);
  const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
  const existingIdx = current.findIndex((i) => i.product_id === item.product_id);

  let updated: StoreCartItem[];
  if (existingIdx !== -1) {
    updated = [...current];
    const newQty = updated[existingIdx].quantity + qtyToAdd;
    const max = item.stock_quantity ?? 99;
    updated[existingIdx] = {
      ...updated[existingIdx],
      quantity: Math.min(newQty, max),
    };
  } else {
    updated = [
      ...current,
      {
        ...item,
        quantity: qtyToAdd,
      },
    ];
  }

  saveStoreCart(slug, updated);
  return updated;
}

export function updateStoreCartItemQty(slug: string, productId: string, quantity: number): StoreCartItem[] {
  const current = getStoreCart(slug);
  if (quantity <= 0) {
    return removeStoreCartItem(slug, productId);
  }
  const updated = current.map((item) => {
    if (item.product_id === productId) {
      const max = item.stock_quantity ?? 99;
      return { ...item, quantity: Math.min(quantity, max) };
    }
    return item;
  });
  saveStoreCart(slug, updated);
  return updated;
}

export function removeStoreCartItem(slug: string, productId: string): StoreCartItem[] {
  const current = getStoreCart(slug);
  const updated = current.filter((item) => item.product_id !== productId);
  saveStoreCart(slug, updated);
  return updated;
}

export function clearStoreCart(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  localStorage.removeItem(getStorageKey(slug));
  window.dispatchEvent(new CustomEvent(`${CART_EVENT_PREFIX}${slug}`, { detail: [] }));
}

/**
 * React hook to subscribe to and manage the cart for a specific vendor store.
 */
export function useVendorCart(slug: string) {
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setItems(getStoreCart(slug));
    setIsLoaded(true);

    const handleUpdate = () => {
      setItems(getStoreCart(slug));
    };

    const eventName = `${CART_EVENT_PREFIX}${slug}`;
    window.addEventListener(eventName, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(eventName, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [slug]);

  const addItem = useCallback(
    (item: Omit<StoreCartItem, "quantity"> & { quantity?: number }) => {
      return addStoreCartItem(slug, item);
    },
    [slug]
  );

  const updateQty = useCallback(
    (productId: string, qty: number) => {
      return updateStoreCartItemQty(slug, productId, qty);
    },
    [slug]
  );

  const removeItem = useCallback(
    (productId: string) => {
      return removeStoreCartItem(slug, productId);
    },
    [slug]
  );

  const clear = useCallback(() => {
    clearStoreCart(slug);
  }, [slug]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.effective_price * i.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    isLoaded,
    addItem,
    updateQty,
    removeItem,
    clearCart: clear,
  };
}

