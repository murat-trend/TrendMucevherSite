import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Üzerimde Gör | Remaura",
  description: "Yüzüğü parmağında nasıl görüneceğini keşfet.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
