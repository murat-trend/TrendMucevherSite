import {
  HeroSection,
  PathwaysSection,
  ValueProposition,
  FeaturedModels,
  RemauraSection,
  SellerSection,
  HowItWorks,
  TrustSection,
  FAQSection,
} from "@/components/home";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedModels />
      <PathwaysSection />
      <ValueProposition />
      <RemauraSection />
      <SellerSection />
      <HowItWorks />
      <TrustSection />
      <FAQSection />
    </>
  );
}
