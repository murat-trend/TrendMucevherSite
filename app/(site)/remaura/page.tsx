import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { RemauraWorkspace } from "@/components/remaura/RemauraWorkspace";
import { RemauraLocalizedLandingHeader } from "@/components/remaura/RemauraLocalizedLandingHeader";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com";
const pageUrl = `${siteUrl}/remaura`;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Remaura AI | Takı Gorsel Duzenleme ve Arka Plan Kaldirma",
  description:
    "Remaura AI ile taki gorsellerinde arka plan kaldirma, metal tonu duzeltme ve vitrin uyumlu export islemlerini tek ekranda yonetin.",
  alternates: {
    canonical: "/remaura",
  },
  keywords: [
    "arka plan kaldirma",
    "takı görsel düzenleme",
    "mücevher fotoğraf düzenleme",
    "remaura ai",
    "e-ticaret ürün görseli",
  ],
  openGraph: {
    title: "Remaura AI | Taki Gorsel Is Akisi",
    description:
      "Takı odaklı arka plan kaldırma, metal ton ayarı ve hızlı export iş akışını tek panelde kullanın.",
    url: pageUrl,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Remaura AI | Taki Gorsel Is Akisi",
    description: "Arka plan kaldirma ve urun gorseli optimizasyonunu tek adimda yonetin.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Remaura AI Landing",
      description:
        "Remaura AI ile takı görselleri için arka plan kaldırma, tonlama ve export optimizasyonu.",
      inLanguage: "tr-TR",
    },
    {
      "@type": "SoftwareApplication",
      name: "Remaura AI",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
      },
      featureList: [
        "Arka plan kaldirma",
        "Metal ton ayarlari",
        "Studio ve vitrin isigi presetleri",
        "PNG/JPG export",
      ],
    },
    {
      "@type": "HowTo",
      name: "Taki urunu arka planindan ayirma",
      totalTime: "PT2M",
      step: [
        { "@type": "HowToStep", name: "Gorsel yukle" },
        { "@type": "HowToStep", name: "Arka plani kaldir" },
        { "@type": "HowToStep", name: "Metal tonu ve isik ayarla" },
        { "@type": "HowToStep", name: "PNG veya JPG olarak indir" },
      ],
    },
  ],
};

export default async function RemauraPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  // Hem superadmin ID'si hem de profile.role="admin" kontrolü
  let isAdmin = isRemauraSuperAdminUserId(user?.id);
  if (!isAdmin && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  const adminNavLink = isAdmin ? (
    <>
      <Link
        href="/remaura/koleksiyon-edit"
        style={{
          borderRadius: "9999px",
          border: "1px solid rgba(183,110,121,0.5)",
          background: "rgba(183,110,121,0.1)",
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#b76e79",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Koleksiyon Edit
      </Link>
      <Link
        href="/remaura/galeri"
        style={{
          borderRadius: "9999px",
          border: "1px solid rgba(183,110,121,0.5)",
          background: "rgba(183,110,121,0.1)",
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#b76e79",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Galeri
      </Link>
      <Link
        href="/remaura/isim-kolye"
        style={{
          borderRadius: "9999px",
          border: "1px solid rgba(183,110,121,0.5)",
          background: "rgba(183,110,121,0.1)",
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#b76e79",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        İsim Kolye
      </Link>
      <Link
        href="/remaura/koleksiyon-lab"
        style={{
          borderRadius: "9999px",
          border: "1px solid rgba(251,191,36,0.5)",
          background: "rgba(251,191,36,0.1)",
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#fbbf24",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Koleksiyon Lab
      </Link>
    </>
  ) : null;

  return (
    <RemauraAccessGate categoryId="jewelry">
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <RemauraLocalizedLandingHeader variant="main" />
        <RemauraWorkspace adminNavLink={adminNavLink} />
      </>
    </RemauraAccessGate>
  );
}
