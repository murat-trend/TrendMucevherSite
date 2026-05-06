import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

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

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com").replace(/\/$/, "");
const FALLBACK_OG = "https://trendmucevher.com/og-image.webp";

export async function generateMetadata(): Promise<Metadata> {
  let ogImageUrl = FALLBACK_OG;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase
      .from("products_3d")
      .select("thumbnail_url")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.thumbnail_url) ogImageUrl = data.thumbnail_url;
  } catch {
    // fallback
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Trend Mücevher | Yapay Zeka ile Mücevher Tasarımı ve 3D Model",
      template: "%s | Trend Mücevher",
    },
    description:
      "REMAURA AI ile yapay zeka destekli mücevher tasarımı, 3D model üretimi ve dijital satış platformu. Türkiye'nin ilk AI mücevher ekosistemi.",
    keywords: [
      "mücevher tasarımı",
      "yapay zeka takı",
      "3D mücevher modeli",
      "REMAURA AI",
      "dijital mücevher",
      "takı tasarım platformu",
    ],
    authors: [{ name: "Murat Kaynaroğlu", url: siteUrl }],
    creator: "Murat Kaynaroğlu",
    publisher: "Trend Mücevher",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      alternateLocale: ["en_US", "de_DE", "ru_RU"],
      url: siteUrl,
      siteName: "Trend Mücevher",
      title: "Trend Mücevher | Yapay Zeka ile Mücevher Tasarımı",
      description: "REMAURA AI ile yapay zeka destekli mücevher tasarımı ve 3D model üretimi.",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Trend Mücevher - REMAURA AI" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Trend Mücevher | REMAURA AI",
      description: "Yapay zeka ile mücevher tasarımı ve 3D model üretim platformu.",
      images: [ogImageUrl],
    },
    verification: {
      google: "hKL6TwPwVVRZ6D4TiTqImlpWqgDNT9agjK1hQg1C0Gk",
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}

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
        <Script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
          strategy="lazyOnload"
        />
        <ThemeScript />
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
