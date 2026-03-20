import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Trend Mücevher | Murat Kaynaroğlu | Remaura AI",
  description:
    "Trend Mücevher - Özel tasarım mücevherler, sipariş üzerine üretim ve Remaura AI ile tasarım araçları. Premium kalite, güvenilir hizmet.",
  keywords: ["mücevher", "takı", "özel sipariş", "Remaura AI", "trendmucevher"],
  openGraph: {
    title: "Trend Mücevher by Murat Kaynaroğlu",
    description: "Premium mücevher, özel sipariş ve AI tasarım araçları.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${outfit.variable} font-sans antialiased`}
      >
        <ThemeScript />
        <ThemeProvider>
          <LanguageProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
