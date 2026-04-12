import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trend Mücevher | REMAURA AI",
    short_name: "Trend Mücevher",
    description: "Yapay zeka destekli mücevher tasarımı ve 3D model üretim platformu",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#c9a84c",
    orientation: "portrait",
    icons: [
      { src: "/rem-icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/rem-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/rem-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    categories: ["shopping", "lifestyle", "design"],
    lang: "tr",
  };
}
