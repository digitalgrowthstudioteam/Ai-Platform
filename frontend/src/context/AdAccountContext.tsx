"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  account_status: number;
}

interface AdAccountContextType {
  adAccounts: AdAccount[];
  selectedAccount: AdAccount | null;
  setSelectedAccount: (account: AdAccount | null) => void;
  loadingAccounts: boolean;
  refreshAccounts: () => Promise<void>;
}

const AdAccountContext = createContext<AdAccountContextType | undefined>(undefined);

export function AdAccountProvider({ children }: { children: React.ReactNode }) {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccountState] = useState<AdAccount | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await api.getMetaAccounts();
      
      // Filter only accounts active/connected in the database
      const activeAccounts = res
        .filter((acc) => acc.is_connected)
        .map((acc) => ({
          id: acc.id,
          name: acc.name,
          currency: acc.currency,
          timezone: acc.timezone,
          account_status: acc.account_status,
        }));

      setAdAccounts(activeAccounts);

      if (activeAccounts.length > 0) {
        // Resolve default active selection
        const savedId = localStorage.getItem("dgs_active_ad_account_id");
        const matched = activeAccounts.find((acc) => acc.id === savedId);
        
        if (matched) {
          setSelectedAccountState(matched);
        } else {
          setSelectedAccountState(activeAccounts[0]);
          localStorage.setItem("dgs_active_ad_account_id", activeAccounts[0].id);
        }
      } else {
        setSelectedAccountState(null);
      }
    } catch (err) {
      console.error("Failed to load connected Meta ad accounts:", err);
      setAdAccounts([]);
      setSelectedAccountState(null);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const setSelectedAccount = (account: AdAccount | null) => {
    setSelectedAccountState(account);
    if (account) {
      localStorage.setItem("dgs_active_ad_account_id", account.id);
    } else {
      localStorage.removeItem("dgs_active_ad_account_id");
    }
  };

  useEffect(() => {
    // Listen to Firebase auth state to load connected accounts
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAccounts();
      } else {
        setAdAccounts([]);
        setSelectedAccountState(null);
        setLoadingAccounts(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AdAccountContext.Provider
      value={{
        adAccounts,
        selectedAccount,
        setSelectedAccount,
        loadingAccounts,
        refreshAccounts: fetchAccounts,
      }}
    >
      {children}
    </AdAccountContext.Provider>
  );
}

export function useAdAccount() {
  const context = useContext(AdAccountContext);
  if (context === undefined) {
    throw new Error("useAdAccount must be used within an AdAccountProvider");
  }
  return context;
}
