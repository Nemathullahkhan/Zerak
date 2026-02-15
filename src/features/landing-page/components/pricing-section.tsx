import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SectionTitle } from "./ui/section-title";

interface PricingSectionProps {
  sectionRef: (el: HTMLElement | null) => void;
}

export function PricingSection({ sectionRef }: PricingSectionProps) {
  return (
    <section id="pricing" ref={sectionRef} className="space-y-10">
      <SectionTitle
        eyebrow="Pricing"
        title="Transparent pricing that doesn't punish experimentation."
        subtitle="A student-friendly baseline, with AI-native features included — not locked behind enterprise tiers."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">
            Student / Free
          </div>
          <div className="mt-3 font-heading text-3xl text-white font-semibold">$0</div>
          <p className="mt-2 text-sm text-neutral-500">
            Get started with core workflows and live visibility.
          </p>
          <ul className="mt-5 space-y-2 text-xs text-neutral-400">
            {["Basic workflows", "Live run status", "Starter cost preview"].map((x) => (
              <li key={x} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white bg-neutral-900 p-6 shadow-2xl shadow-white/10 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">
              Pro
            </div>
            <div className="mt-3 font-heading text-3xl text-white font-semibold">
              $19<span className="text-sm text-neutral-500 font-medium">/mo</span>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              For indie devs and small teams shipping real automations.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-neutral-200">
              {[
                "Full cost estimation before run",
                "Parallel DAG execution",
                "Real-time node monitoring",
                "Better limits",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white mt-0.5" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center justify-center w-full bg-white text-neutral-950 px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-colors"
            >
              Start free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">
            Teams
          </div>
          <div className="mt-3 font-heading text-3xl text-white font-semibold">Custom</div>
          <p className="mt-2 text-sm text-neutral-500">
            For SMBs needing collaboration and reliability.
          </p>
          <ul className="mt-5 space-y-2 text-xs text-neutral-400">
            {["Team workspaces", "Role-based access", "Priority reliability"].map((x) => (
              <li key={x} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}


