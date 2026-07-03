import type { Metadata } from "next";
import Script from "next/script";

import { NavHeader } from "@gitroom/frontend/components/landing/nav-header";
import { HeroSection } from "@gitroom/frontend/components/landing/hero-section";
import { ChannelsSection } from "@gitroom/frontend/components/landing/channels-section";
import { ProblemSolutionSection } from "@gitroom/frontend/components/landing/problem-solution-section";
import { FeaturesSection } from "@gitroom/frontend/components/landing/features-section";
import { HowItWorksSection } from "@gitroom/frontend/components/landing/how-it-works-section";
import { DeepDivesSection } from "@gitroom/frontend/components/landing/deep-dives-section";
import { FlowSection } from "@gitroom/frontend/components/landing/flow-section";
import { GallerySection } from "@gitroom/frontend/components/landing/gallery-section";
import { ComparisonSection } from "@gitroom/frontend/components/landing/comparison-section";
import { ProofSection } from "@gitroom/frontend/components/landing/proof-section";
import { PricingSection } from "@gitroom/frontend/components/landing/pricing-section";
import { FAQSection } from "@gitroom/frontend/components/landing/faq-section";
import { CTASection } from "@gitroom/frontend/components/landing/cta-section";
import { FooterSection } from "@gitroom/frontend/components/landing/footer-section";

export const metadata: Metadata = {
  title: "ContentFlow — De URL para carrossel pronto",
  description:
    "ContentFlow extrai o DNA da sua marca — cores, tom, público — e gera carrosséis, posts e legendas automaticamente. Pronto em minutos.",
  openGraph: {
    title: "ContentFlow — De URL para carrossel pronto",
    description:
      "Cole o site. A IA cria carrosséis com a cara da sua marca.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <>
      <Script src="/landing-script.js" strategy="afterInteractive" />

      <NavHeader />

      <main id="top">
        <HeroSection />
        <ChannelsSection />
        <ProblemSolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DeepDivesSection />
        <FlowSection />
        <GallerySection />
        <ProofSection />
        <ComparisonSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>

      <FooterSection />
    </>
  );
}
