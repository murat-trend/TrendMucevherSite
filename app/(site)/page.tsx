import { HeroSection, FeaturedModels } from "@/components/home";
import { B2BInviteSection } from "@/components/home/B2BInviteSection";
import { TechSpecsSection } from "@/components/home/TechSpecsSection";
import { AboutTeaser } from "@/components/home/AboutTeaser";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedModels />
      <B2BInviteSection />
      <TechSpecsSection />
      <AboutTeaser />
    </>
  );
}
