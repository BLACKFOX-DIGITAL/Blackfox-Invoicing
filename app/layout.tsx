import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: 'swap',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Suite | Post-Production Invoicing",
  description: "Internal business application for image post-production management.",
  keywords: ["invoicing", "post-production", "crm", "business management"],
  openGraph: {
    title: "Business Suite",
    description: "Post-Production Invoicing & CRM",
    type: "website",
    siteName: "Business Suite",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let themeColor = "slate";
  let companyName = "";
  try {
    const settings = await prisma.settings.findFirst();
    if (settings) {
      if ((settings as any).themeColor) themeColor = (settings as any).themeColor;
      if (settings.companyName) companyName = settings.companyName;
    }
  } catch (e) {
    console.error("Failed to load theme from DB", e);
  }

  // Pre-defined palettes
  const palettes: Record<string, { primary: string; hover: string; accent: string }> = {
    blue: { primary: "#2563EB", hover: "#1D4ED8", accent: "#2563EB" },
    green: { primary: "#10B981", hover: "#059669", accent: "#10B981" },
    indigo: { primary: "#4F46E5", hover: "#4338ca", accent: "#4F46E5" },
    teal: { primary: "#0F766E", hover: "#115E59", accent: "#0F766E" },
    slate: { primary: "#475569", hover: "#334155", accent: "#475569" },
  };

  const activePalette = palettes[themeColor] || palettes.slate;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} antialiased`}
        style={{
          "--color-primary": activePalette.primary,
          "--color-primary-hover": activePalette.hover,
          "--color-accent": activePalette.accent,
          "--primary": activePalette.primary,
          "--primary-hover": activePalette.hover,
          "--accent": activePalette.accent,
        } as React.CSSProperties}
      >
        <MainLayout companyName={companyName} session={session}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MainLayout>
      </body>
    </html >
  );
}
