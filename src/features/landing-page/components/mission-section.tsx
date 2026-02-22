import { SectionTitle } from "./ui/section-title";

interface MissionSectionProps {
  sectionRef: (el: HTMLElement | null) => void;
}

export function MissionSection({ sectionRef }: MissionSectionProps) {
  const values = [
    {
      title: "Accessible",
      desc: "Student-friendly by default.",
    },
    {
      title: "Transparent",
      desc: "Know cost and progress before and during execution.",
    },
    {
      title: "Fast",
      desc: "Parallel DAG execution for real speedups.",
    },
  ];

  return (
    <section id="mission" ref={sectionRef} className="space-y-10">
      <SectionTitle
        eyebrow="Vision"
        title="A final-year project built to become a real SaaS."
        subtitle="Our mission is to make AI automation accessible, remove cost uncertainty, and deliver speed + transparency for everyone — not just enterprises."
      />

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 overflow-hidden relative">
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-72 h-72 bg-linear-to-tl from-neutral-800/20 to-transparent rounded-full blur-3xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((x) => (
            <div key={x.title} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
              <div className="font-heading text-white font-semibold mb-1">{x.title}</div>
              <div className="text-sm text-neutral-500">{x.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}





