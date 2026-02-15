import Link from "next/link";
import { ArrowRight, Bolt, LockKeyhole, Sparkles, Zap } from "lucide-react";
import { Badge } from "./ui/badge";

interface HeroSectionProps {
  onCompareClick: () => void;
}

export function HeroSection({ onCompareClick }: HeroSectionProps) {
  return (
    <section className="text-center max-w-3xl mx-auto space-y-6 animate-clip-reveal delay-100">
      <Badge>AI cost preview + parallel execution (DAG) + live monitoring</Badge>

      <h1 className="font-heading text-3xl sm:text-5xl text-white font-semibold tracking-tight leading-tight">
        AI-native workflow automation,
        <br />
        without cost surprises.
      </h1>

      <p className="text-base sm:text-lg text-neutral-400 font-normal max-w-2xl mx-auto leading-relaxed">
        Zerak helps students, indie developers, and SMBs build automations that are{" "}
        <span className="text-white">cost-transparent</span>,{" "}
        <span className="text-white">2–5× faster</span> via parallel execution, and{" "}
        <span className="text-white">observable in real time</span>.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/signup"
          className="w-full sm:w-auto bg-white text-neutral-950 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10 inline-flex items-center justify-center gap-2"
        >
          Build your first workflow <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href="#comparison"
          className="w-full sm:w-auto text-neutral-300 px-5 py-2.5 rounded-lg text-xs font-medium hover:text-white transition-colors inline-flex items-center justify-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            onCompareClick();
          }}
        >
          See how it compares <Zap className="h-4 w-4" />
        </a>
      </div>

      <div className="pt-6 flex items-center justify-center gap-6 text-[11px] text-neutral-600">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI-first (not retrofitted)
        </div>
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4" /> Cost controls
        </div>
        <div className="flex items-center gap-2">
          <Bolt className="h-4 w-4" /> Parallel DAG engine
        </div>
      </div>
    </section>
  );
}


