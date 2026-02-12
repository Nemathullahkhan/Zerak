import { SectionTitle } from "./ui/section-title";

interface UsersSectionProps {
  sectionRef: (el: HTMLElement | null) => void;
}

export function UsersSection({ sectionRef }: UsersSectionProps) {
  const userGroups = [
    {
      title: "Students & researchers",
      desc: "Literature reviews, survey analysis, scraping research data — with predictable spend.",
    },
    {
      title: "Indie devs & solopreneurs",
      desc: "Content automation, lead enrichment, ticket routing — without hiring a team.",
    },
    {
      title: "SMBs",
      desc: "Onboarding, CRM automation, e-commerce ops — reliable workflows with visibility.",
    },
  ];

  return (
    <section id="users" ref={sectionRef} className="space-y-10">
      <SectionTitle
        eyebrow="Who it's for"
        title="Built for builders who need AI automation — on a budget."
        subtitle="Zerak is designed for students, indie builders, and SMBs who want speed and clarity without enterprise pricing."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userGroups.map((x) => (
          <div
            key={x.title}
            className="group relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-8 min-h-[220px] hover:border-neutral-600 transition-colors"
          >
            <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-64 h-64 bg-linear-to-tl from-neutral-800/20 to-transparent rounded-full blur-3xl group-hover:from-neutral-700/25 transition-colors" />
            <div className="relative z-10">
              <h3 className="font-heading text-xl text-white font-semibold tracking-tight mb-2">
                {x.title}
              </h3>
              <p className="text-sm text-neutral-400 max-w-xs">{x.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

