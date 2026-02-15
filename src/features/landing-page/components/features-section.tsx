import Link from "next/link";
import { ArrowRight, Bolt, Cloud, LineChart, LockKeyhole } from "lucide-react";

interface FeaturesSectionProps {
  sectionRef: (el: HTMLElement | null) => void;
}

export function FeaturesSection({ sectionRef }: FeaturesSectionProps) {
  const features = [
    {
      title: "Pre-execution cost estimation",
      desc: "Predict token usage and expected spend before you run.",
      icon: LockKeyhole,
    },
    {
      title: "Parallel DAG execution",
      desc: "Auto-detect independent tasks and run them concurrently.",
      icon: Bolt,
    },
    {
      title: "Real-time monitoring",
      desc: "Live node updates, progress percentage, and time remaining.",
      icon: LineChart,
    },
    {
      title: "Cloud-first simplicity",
      desc: "No infrastructure setup — built for students and small teams.",
      icon: Cloud,
    },
  ];

  return (
    <section id="features" ref={sectionRef} className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-900">
        <div className="max-w-xl">
          <h2 className="font-heading text-2xl sm:text-3xl text-white font-semibold tracking-tight mb-3">
            Engineered for speed, transparency, and trust.
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Built AI-first from the ground up — so you can estimate cost, execute in parallel, and monitor everything live.
          </p>
        </div>
        <Link
          href="/signup"
          className="text-xs font-medium text-white border border-neutral-800 bg-neutral-900 px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
        >
          Start free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="p-4 rounded-xl border border-transparent hover:border-neutral-800 hover:bg-neutral-900/40 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-sm text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}


