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
  industry?: string | null;
  ai_intelligence_status?: string | null;
  historical_intelligence_status?: string | null;
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
          industry: acc.industry,
          ai_intelligence_status: acc.ai_intelligence_status,
          historical_intelligence_status: acc.historical_intelligence_status,
        }));

      setAdAccounts(activeAccounts);
      sessionStorage.setItem("dgs_cached_ad_accounts", JSON.stringify(activeAccounts));
      localStorage.setItem("dgs_cached_ad_accounts_backup", JSON.stringify(activeAccounts));

      if (activeAccounts.length > 0) {
        // Resolve default active selection
        const savedId = localStorage.getItem("dgs_active_ad_account_id");
        const cleanSaved = savedId ? savedId.replace("act_", "") : "";
        const matched = activeAccounts.find((acc) => 
          acc.id === savedId || 
          acc.id.replace("act_", "") === cleanSaved ||
          `act_${acc.id.replace("act_", "")}` === savedId
        );
        
        const finalSelected = matched || activeAccounts[0];
        setSelectedAccountState(finalSelected);
        localStorage.setItem("dgs_active_ad_account_id", finalSelected.id);
      } else {
        // Self-healing fallback: check if we have a valid backup cache before setting to null
        const backup = localStorage.getItem("dgs_cached_ad_accounts_backup");
        if (backup) {
          try {
            const parsed = JSON.parse(backup);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAdAccounts(parsed);
              setSelectedAccountState(parsed[0]);
              localStorage.setItem("dgs_active_ad_account_id", parsed[0].id);
              return;
            }
          } catch (e) {}
        }
        setSelectedAccountState(null);
      }
    } catch (err) {
      console.error("Failed to load connected Meta ad accounts:", err);
      // Preserve existing cached ad accounts from sessionStorage/localStorage backup on failure
      const cached = sessionStorage.getItem("dgs_cached_ad_accounts") || localStorage.getItem("dgs_cached_ad_accounts_backup");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdAccounts(parsed);
            const savedId = localStorage.getItem("dgs_active_ad_account_id");
            const cleanSaved = savedId ? savedId.replace("act_", "") : "";
            const matched = parsed.find((acc: AdAccount) => 
              acc.id === savedId || acc.id.replace("act_", "") === cleanSaved
            );
            const fallbackAcc = matched || parsed[0];
            setSelectedAccountState(fallbackAcc);
            localStorage.setItem("dgs_active_ad_account_id", fallbackAcc.id);
          }
        } catch (e) {}
      }
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

  // Load cached ad accounts from sessionStorage / localStorage for instant rendering
  useEffect(() => {
    const cached = sessionStorage.getItem("dgs_cached_ad_accounts") || localStorage.getItem("dgs_cached_ad_accounts_backup");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdAccounts(parsed);
          const savedId = localStorage.getItem("dgs_active_ad_account_id");
          const cleanSaved = savedId ? savedId.replace("act_", "") : "";
          const matched = parsed.find((acc: AdAccount) => 
            acc.id === savedId || acc.id.replace("act_", "") === cleanSaved
          );
          setSelectedAccountState(matched || parsed[0]);
          setLoadingAccounts(false);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    // Listen to Firebase auth state to load connected accounts
    let refreshTimer: NodeJS.Timeout | null = null;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAccounts();
        // Background self-healing account check every 3 minutes
        refreshTimer = setInterval(() => {
          fetchAccounts();
        }, 180000);
      } else {
        setAdAccounts([]);
        setSelectedAccountState(null);
        setLoadingAccounts(false);
        sessionStorage.removeItem("dgs_cached_ad_accounts");
        if (refreshTimer) clearInterval(refreshTimer);
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimer) clearInterval(refreshTimer);
    };
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
