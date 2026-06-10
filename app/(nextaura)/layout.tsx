import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Nextaura",
  description: "Hayalinizdeki mücevheri tasarlayın",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nextaura",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function NextauraLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        {/* PWA manifest — dynamic per firm, fetched client-side via NextauraTablet */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" sizes="192x192" href="/nextaura-icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/nextaura-icon-512.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}
