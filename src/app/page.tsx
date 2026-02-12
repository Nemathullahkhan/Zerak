"use client";

import { useMemo } from "react";
import { useSectionScroll } from "@/features/landing-page/hooks/use-section-scroll";
import {
  Navbar,
  HeroSection,
  ProblemSection,
  OrchestrationSection,
  FeaturesSection,
  BentoGrid,
  ComparisonSection,
  UsersSection,
  PricingSection,
  MissionSection,
  CTASection,
  Footer,
} from "@/features/landing-page/components";

export default function Home() {
  const { setSectionRef, scrollToSection } = useSectionScroll();

  const navLinks = useMemo(
    () =>
      [
        { key: "features", label: "Features" },
        { key: "comparison", label: "Compare" },
        { key: "pricing", label: "Pricing" },
        { key: "mission", label: "Vision" },
      ],
    [],
  );

  return (
    <div className="scrollbar-zerak min-h-screen bg-neutral-950 text-neutral-400 selection:bg-white selection:text-neutral-950">
      <Navbar navLinks={navLinks} onNavClick={scrollToSection} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-24 space-y-28">
        <HeroSection onCompareClick={() => scrollToSection("comparison")} />

        <ProblemSection sectionRef={setSectionRef("problem")} />

        <OrchestrationSection />

        <FeaturesSection sectionRef={setSectionRef("features")} />

        <BentoGrid />

        <ComparisonSection sectionRef={setSectionRef("comparison")} />

        <UsersSection sectionRef={setSectionRef("users")} />

        <PricingSection sectionRef={setSectionRef("pricing")} />

        <MissionSection sectionRef={setSectionRef("mission")} />

        <CTASection />
      </main>

      <Footer navLinks={navLinks} onNavClick={scrollToSection} />
    </div>
  );
}
