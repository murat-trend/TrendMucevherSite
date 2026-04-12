import { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/satici/",
          "/hesabim/",
          "/giris/",
          "/uye-giris/",
          "/api/",
          "/indir/",
          "/checkout/",
        ],
      },
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/admin/", "/satici/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
