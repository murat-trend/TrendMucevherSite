import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./rai.css";

/*
 * REMAURA AI adası — izole bölge.
 * Kurallar:
 *  1. Ada dışından import yok (eslint.config.mjs'te zorlanır) — ihtiyaç
 *     duyulan kod buraya KOPYALANIR ya da HTTP API'den çağrılır.
 *  2. Test süresince noindex; SEO saati remauraai.com ayrılınca başlar.
 *  3. Stil: rai.css içindeki --rai-* değişkenleri; site token'ları kullanılmaz.
 */

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-rai",
});

export const metadata: Metadata = {
  title: {
    default: "REMAURA AI",
    template: "%s | REMAURA AI",
  },
  robots: { index: false, follow: false },
};

export default function RaiLayout({ children }: { children: React.ReactNode }) {
  return <div className={`rai-root ${inter.variable}`}>{children}</div>;
}
