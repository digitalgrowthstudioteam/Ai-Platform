"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { trackSignUp, trackLogin } from "@/lib/analytics";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthCached, setIsAuthCached] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dgs_has_session") === "true";
    }
    return false;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let nullTimeoutId: NodeJS.Timeout | null = null;
    const hadCachedSession = localStorage.getItem("dgs_has_session") === "true";

    // Listen to Firebase Auth state change
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Clear any pending null-timeout
      if (nullTimeoutId) {
        clearTimeout(nullTimeoutId);
        nullTimeoutId = null;
      }

      if (currentUser) {
        // User resolved — update state immediately
        setUser(currentUser);
        localStorage.setItem("dgs_has_session", "true");
        setIsAuthCached(true);
        setLoading(false);
      } else if (hadCachedSession && !user) {
        // Firebase briefly fires null before resolving from IndexedDB.
        // If we had a cached session, wait briefly before clearing.
        nullTimeoutId = setTimeout(() => {
          setUser(null);
          localStorage.removeItem("dgs_has_session");
          setIsAuthCached(false);
          setLoading(false);
        }, 800);
      } else {
        // No cached session — clear immediately
        setUser(null);
        localStorage.removeItem("dgs_has_session");
        setIsAuthCached(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (nullTimeoutId) clearTimeout(nullTimeoutId);
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      localStorage.setItem("dgs_has_session", "true");
      setIsAuthCached(true);
      trackLogin("email");
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      // Phase 1: Firebase Auth Registration
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      localStorage.setItem("dgs_has_session", "true");
      setIsAuthCached(true);
      
      // We can update profile name or handle sync with database in Phase 2
      // For now, we update Firebase displayName
      if (userCredential.user) {
        const { updateProfile } = await import("firebase/auth");
        await updateProfile(userCredential.user, { displayName: name });
      }
      trackSignUp("email");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      localStorage.setItem("dgs_has_session", "true");
      setIsAuthCached(true);
      trackLogin("google");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      localStorage.removeItem("dgs_has_session");
      setIsAuthCached(false);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user || isAuthCached,
    loginWithEmail,
    signUpWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
