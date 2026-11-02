import type { Metadata } from "next";
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
    <html lang="en" className={cn(inter.variable, "font-sans", geist.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var host = window.location.hostname;
                  var parts = host.split('.');
                  if (parts.length >= 3) {
                    var sub = parts[0].toLowerCase();
                    if (sub !== 'www' && sub !== 'app' && sub !== 'api' && sub !== 'admin' && sub !== 'platform' && sub !== 'localhost' && sub !== '127') {
                      var path = window.location.pathname;
                      if (!path.startsWith('/app/store/')) {
                        var target = '/app/store/' + encodeURIComponent(sub) + (path === '/' ? '' : path) + window.location.search;
                        window.location.replace(target);
                      }
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        <MetaPixel />
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
