"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
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
import Image from "next/image";
import ZerakLogo2 from "../../public/logos/ZerakLogo2.svg";

export default function LandingPage() {
  const router = useRouter();
  const { setSectionRef, scrollToSection } = useSectionScroll();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          router.push("/dashboard");
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth check failed", error);
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const navLinks = useMemo(
    () => [
      { key: "features", label: "Features" },
      { key: "comparison", label: "Compare" },
      { key: "pricing", label: "Pricing" },
      { key: "mission", label: "Vision" },
    ],
    [],
  );

  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center">
        <Image src={ZerakLogo2} alt="Zerak Logo" className="h-40 w-auto " />
        <div className="w-8 h-8 border-4 border-neutral-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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
