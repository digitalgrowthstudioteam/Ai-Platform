/**
 * Digital Growth Studio — Customer Saved Addresses Manager
 * Persists customer delivery addresses in localStorage per vendor store (`dgs_addresses_${slug}`).
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export interface CustomerSavedAddress {
  id: string;
  name: string;
  phone: string;
  email?: string;
  street_address: string;
  city: string;
  state: string;
  pincode: string;
  tag: "HOME" | "WORK" | "OTHER";
  is_default: boolean;
  created_at: string;
}

const ADDRESS_EVENT_PREFIX = "dgs-addresses-updated-";

function getStorageKey(slug: string): string {
  return `dgs_addresses_${slug}`;
}

export function getSavedAddresses(slug: string): CustomerSavedAddress[] {
  if (typeof window === "undefined" || !slug) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read addresses from localStorage:", e);
    return [];
  }
}

export function saveAllAddresses(slug: string, addresses: CustomerSavedAddress[]): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(addresses));
    window.dispatchEvent(new CustomEvent(`${ADDRESS_EVENT_PREFIX}${slug}`, { detail: addresses }));
  } catch (e) {
    console.error("Failed to save addresses to localStorage:", e);
  }
}

export function addCustomerAddress(
  slug: string,
  address: Omit<CustomerSavedAddress, "id" | "created_at">
): CustomerSavedAddress[] {
  const current = getSavedAddresses(slug);
  const isFirst = current.length === 0;

  const newAddress: CustomerSavedAddress = {
    ...address,
    id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    is_default: isFirst || Boolean(address.is_default),
    created_at: new Date().toISOString(),
  };

  let updated = current.map((a) => (newAddress.is_default ? { ...a, is_default: false } : a));
  updated = [newAddress, ...updated];

  saveAllAddresses(slug, updated);
  return updated;
}

export function updateCustomerAddress(
  slug: string,
  id: string,
  updates: Partial<Omit<CustomerSavedAddress, "id" | "created_at">>
): CustomerSavedAddress[] {
  const current = getSavedAddresses(slug);
  const updated = current.map((a) => {
    if (a.id !== id) {
      if (updates.is_default) {
        return { ...a, is_default: false };
      }
      return a;
    }
    return { ...a, ...updates };
  });

  saveAllAddresses(slug, updated);
  return updated;
}

export function deleteCustomerAddress(slug: string, id: string): CustomerSavedAddress[] {
  const current = getSavedAddresses(slug);
  let updated = current.filter((a) => a.id !== id);

  // If we deleted the default address, make the first one default
  if (updated.length > 0 && !updated.some((a) => a.is_default)) {
    updated[0].is_default = true;
  }

  saveAllAddresses(slug, updated);
  return updated;
}

export function setDefaultCustomerAddress(slug: string, id: string): CustomerSavedAddress[] {
  const current = getSavedAddresses(slug);
  const updated = current.map((a) => ({
    ...a,
    is_default: a.id === id,
  }));
  saveAllAddresses(slug, updated);
  return updated;
}

/**
 * React hook to bind any component reactively to customer saved addresses.
 */
export function useSavedAddresses(slug: string) {
  const [addresses, setAddresses] = useState<CustomerSavedAddress[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setAddresses(getSavedAddresses(slug));
    setIsLoaded(true);

    const handleUpdate = (e: CustomEvent<CustomerSavedAddress[]>) => {
      setAddresses(e.detail || []);
    };

    const eventName = `${ADDRESS_EVENT_PREFIX}${slug}`;
    window.addEventListener(eventName as any, handleUpdate);
    return () => {
      window.removeEventListener(eventName as any, handleUpdate);
    };
  }, [slug]);

  const addAddress = useCallback(
    (addr: Omit<CustomerSavedAddress, "id" | "created_at">) => {
      return addCustomerAddress(slug, addr);
    },
    [slug]
  );

  const updateAddress = useCallback(
    (id: string, updates: Partial<Omit<CustomerSavedAddress, "id" | "created_at">>) => {
      return updateCustomerAddress(slug, id, updates);
    },
    [slug]
  );

  const deleteAddress = useCallback(
    (id: string) => {
      return deleteCustomerAddress(slug, id);
    },
    [slug]
  );

  const setDefault = useCallback(
    (id: string) => {
      return setDefaultCustomerAddress(slug, id);
    },
    [slug]
  );

  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0] || null;

  return {
    addresses,
    addressCount: addresses.length,
    defaultAddress,
    isLoaded,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
  };
}

