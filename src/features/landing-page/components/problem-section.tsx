import { SectionTitle } from "./ui/section-title";

interface ProblemSectionProps {
  sectionRef: (el: HTMLElement | null) => void;
}

export function ProblemSection({ sectionRef }: ProblemSectionProps) {
  const problems = [
    {
      title: "Unpredictable AI costs",
      desc: "Most tools bill after the run. You only discover token spend when it's too late.",
    },
    {
      title: "Sequential bottlenecks",
      desc: "Independent tasks still run one-by-one, wasting compute and time.",
    },
    {
      title: "No real-time visibility",
      desc: "Long workflows feel like a black box — hard to debug, easy to mistrust.",
    },
  ];

  return (
    <section id="problem" ref={sectionRef} className="space-y-10">
      <SectionTitle
        eyebrow="The problem"
        title="Automation tools weren't built for AI economics."
        subtitle="Zapier and n8n are great — but AI introduces cost uncertainty, long runtimes, and poor visibility that hurts students and small teams the most."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {problems.map((x) => (
          <div
            key={x.title}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 transition-colors"
          >
            <h3 className="font-heading text-white font-semibold tracking-tight mb-2">
              {x.title}
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{x.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


