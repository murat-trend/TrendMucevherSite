import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import WelcomePopup from "@/components/home/WelcomePopup";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <WelcomePopup />
      <Footer />
    </>
  );
}
