import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import AppWrapper from "@/components/layout/AppWrapper";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MetaPixel from "@/components/MetaPixel";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Digital Growth Studio — AI Ads Optimizer",
  description:
    "AI-powered Meta Ads analytics platform. Connect your Meta Ads account, analyze performance, and get actionable AI recommendations to optimize your campaigns.",
  keywords: ["Meta Ads", "AI", "analytics", "advertising", "optimization", "SaaS"],
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, "font-sans", geist.variable, "w-full max-w-full overflow-x-clip")}>
      <body className="w-full max-w-full overflow-x-clip min-h-screen bg-background text-foreground antialiased selection:bg-blue-600/10">
        <GoogleAnalytics />
        <MetaPixel />
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
