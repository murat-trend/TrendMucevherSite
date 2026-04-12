import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import WelcomePopup from "@/components/home/WelcomePopup";
import { PageViewTracker } from "@/components/layout/PageViewTracker";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      <Header />
      <main>{children}</main>
      <WelcomePopup />
      <Footer />
    </>
  );
}
