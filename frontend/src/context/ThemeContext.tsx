"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  primaryColor: string;
  sidebarBg: string;
  setPrimaryColor: (color: string) => void;
  setSidebarBg: (color: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper functions for color adjustments
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState("#2563EB");
  const [sidebarBg, setSidebarBgState] = useState("#0F172A");

  useEffect(() => {
    // Read from localStorage on mount
    const savedPrimary = localStorage.getItem("dgs_theme_primary");
    const savedSidebar = localStorage.getItem("dgs_theme_sidebar");
    if (savedPrimary) setPrimaryColorState(savedPrimary);
    if (savedSidebar) setSidebarBgState(savedSidebar);
  }, []);

  const updateCssVariables = (primary: string, sidebar: string) => {
    const root = document.documentElement;

    // Apply primary colors
    root.style.setProperty("--primary", primary);
    
    let primHsl = { h: 220, s: 80, l: 50 };
    try {
      primHsl = hexToHsl(primary);
    } catch (e) {
      console.error("Invalid primary hex color:", primary);
    }
    
    // Generate hover color (slightly darker)
    const hoverColor = hslToHex(primHsl.h, primHsl.s, Math.max(10, primHsl.l - 8));
    root.style.setProperty("--primary-hover", hoverColor);
    
    // Generate light/bg variation
    const lightBg = hslToHex(primHsl.h, Math.min(100, primHsl.s + 10), 96);
    root.style.setProperty("--primary-light", lightBg);
    root.style.setProperty("--primary-50", lightBg);

    const primary100 = hslToHex(primHsl.h, primHsl.s, 92);
    root.style.setProperty("--primary-100", primary100);
    
    root.style.setProperty("--primary-500", primary);
    root.style.setProperty("--primary-600", primary);
    
    const primary700 = hslToHex(primHsl.h, primHsl.s, Math.max(10, primHsl.l - 12));
    root.style.setProperty("--primary-700", primary700);

    // Apply sidebar colors
    root.style.setProperty("--sidebar-bg", sidebar);
    root.style.setProperty("--sidebar-active", primary);

    let sidebarHsl = { h: 220, s: 30, l: 10 };
    try {
      sidebarHsl = hexToHsl(sidebar);
    } catch (e) {
      console.error("Invalid sidebar hex color:", sidebar);
    }
    
    const isDarkSidebar = sidebarHsl.l < 50;

    // Adjust sidebar hover state based on background brightness
    let sidebarHover: string;
    if (isDarkSidebar) {
      sidebarHover = hslToHex(sidebarHsl.h, sidebarHsl.s, Math.min(100, sidebarHsl.l + 8));
    } else {
      sidebarHover = hslToHex(sidebarHsl.h, sidebarHsl.s, Math.max(0, sidebarHsl.l - 8));
    }
    root.style.setProperty("--sidebar-hover", sidebarHover);

    // Adjust text contrast dynamically
    if (isDarkSidebar) {
      root.style.setProperty("--sidebar-text", "#94A3B8");
      root.style.setProperty("--sidebar-text-active", "#FFFFFF");
      root.style.setProperty("--sidebar-section", "#475569");
    } else {
      root.style.setProperty("--sidebar-text", "#334155");
      root.style.setProperty("--sidebar-text-active", primary);
      root.style.setProperty("--sidebar-section", "#64748B");
    }
  };

  useEffect(() => {
    updateCssVariables(primaryColor, sidebarBg);
  }, [primaryColor, sidebarBg]);

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem("dgs_theme_primary", color);
  };

  const setSidebarBg = (color: string) => {
    setSidebarBgState(color);
    localStorage.setItem("dgs_theme_sidebar", color);
  };

  const resetTheme = () => {
    setPrimaryColorState("#2563EB");
    setSidebarBgState("#0F172A");
    localStorage.removeItem("dgs_theme_primary");
    localStorage.removeItem("dgs_theme_sidebar");
  };

  return (
    <ThemeContext.Provider value={{ primaryColor, sidebarBg, setPrimaryColor, setSidebarBg, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
