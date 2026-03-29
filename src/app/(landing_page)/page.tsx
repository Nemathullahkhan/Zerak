"use client";

import { useMemo, useState } from "react";
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

export default function LandingPage() {
  const { setSectionRef, scrollToSection } = useSectionScroll();
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;
  const router = useRouter();

  const handleInputSubmit = (query: string) => {
    if (isAuthenticated) {
      router.push(`/dashboard?q=${encodeURIComponent(query)}`);
    } else {
      setPendingQuery(query);
      setLoginDialogOpen(true);
    }
  };

  const navLinks = useMemo(
    () => [
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
        <HeroSection 
          onCompareClick={() => scrollToSection("comparison")} 
          onSubmit={handleInputSubmit}
        />

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

      {loginDialogOpen && (
        <div data-slot="login-dialog-placeholder" 
             onClick={() => setLoginDialogOpen(false)}
             style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      zIndex:50 }}>
          <div style={{ background:'white', color:'black', padding:32, borderRadius:12 }}>
            Login dialog coming in Phase 3
            <br/><br/>
            <button onClick={() => setLoginDialogOpen(false)} style={{background:'black', color:'white', padding:'8px 16px', borderRadius:'6px'}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
