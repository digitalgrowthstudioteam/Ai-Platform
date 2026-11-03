/**
 * Digital Growth Studio — Vendor-Isolated Store Wishlist State Manager
 * Each vendor store has its own independent wishlist in localStorage (`dgs_store_wishlist_${slug}`).
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export interface StoreWishlistItem {
  id: string; // product_id
  product_id: string;
  name: string;
  slug?: string;
  regular_price: number;
  effective_price: number;
  sale_price?: number;
  thumbnail_url?: string;
  category_name?: string;
  in_stock?: boolean;
  added_at: string;
}

const WISHLIST_EVENT_PREFIX = "dgs-wishlist-updated-";

function getStorageKey(slug: string): string {
  return `dgs_store_wishlist_${slug}`;
}

export function getStoreWishlist(slug: string): StoreWishlistItem[] {
  if (typeof window === "undefined" || !slug) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read wishlist from localStorage:", e);
    return [];
  }
}

export function saveStoreWishlist(slug: string, items: StoreWishlistItem[]): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(`${WISHLIST_EVENT_PREFIX}${slug}`, { detail: items }));
  } catch (e) {
    console.error("Failed to save wishlist to localStorage:", e);
  }
}

export function isItemInWishlist(slug: string, productId: string): boolean {
  if (!slug || !productId) return false;
  const items = getStoreWishlist(slug);
  return items.some((i) => i.product_id === productId || i.id === productId);
}

export function toggleStoreWishlistItem(slug: string, item: Omit<StoreWishlistItem, "added_at">): { isAdded: boolean; items: StoreWishlistItem[] } {
  const current = getStoreWishlist(slug);
  const existingIdx = current.findIndex((i) => i.product_id === item.product_id || i.id === item.id);

  let updated: StoreWishlistItem[];
  let isAdded = false;

  if (existingIdx !== -1) {
    // Remove from wishlist
    updated = current.filter((_, idx) => idx !== existingIdx);
    isAdded = false;
  } else {
    // Add to wishlist
    const newItem: StoreWishlistItem = {
      ...item,
      id: item.product_id,
      added_at: new Date().toISOString(),
    };
    updated = [newItem, ...current];
    isAdded = true;
  }

  saveStoreWishlist(slug, updated);
  return { isAdded, items: updated };
}

export function removeStoreWishlistItem(slug: string, productId: string): StoreWishlistItem[] {
  const current = getStoreWishlist(slug);
  const updated = current.filter((i) => i.product_id !== productId && i.id !== productId);
  saveStoreWishlist(slug, updated);
  return updated;
}

export function clearStoreWishlist(slug: string): void {
  saveStoreWishlist(slug, []);
}

/**
 * React hook to bind any component reactively to the vendor's wishlist.
 */
export function useVendorWishlist(slug: string) {
  const [items, setItems] = useState<StoreWishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setItems(getStoreWishlist(slug));
    setIsLoaded(true);

    const handleUpdate = (e: CustomEvent<StoreWishlistItem[]>) => {
      setItems(e.detail || []);
    };

    const eventName = `${WISHLIST_EVENT_PREFIX}${slug}`;
    window.addEventListener(eventName as any, handleUpdate);
    return () => {
      window.removeEventListener(eventName as any, handleUpdate);
    };
  }, [slug]);

  const isInWishlist = useCallback(
    (productId: string) => {
      return items.some((i) => i.product_id === productId || i.id === productId);
    },
    [items]
  );

  const toggleItem = useCallback(
    (item: Omit<StoreWishlistItem, "added_at">) => {
      return toggleStoreWishlistItem(slug, item);
    },
    [slug]
  );

  const removeItem = useCallback(
    (productId: string) => {
      return removeStoreWishlistItem(slug, productId);
    },
    [slug]
  );

  const clear = useCallback(() => {
    clearStoreWishlist(slug);
  }, [slug]);

  return {
    items,
    itemCount: items.length,
    isLoaded,
    isInWishlist,
    toggleItem,
    removeItem,
    clear,
  };
}

