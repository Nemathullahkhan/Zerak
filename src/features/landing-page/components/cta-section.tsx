import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="space-y-2">
        <div className="font-heading text-2xl text-white font-semibold tracking-tight">
          Start building AI automations you can trust.
        </div>
        <div className="text-sm text-neutral-500 max-w-2xl">
          Preview cost before you run, execute in parallel, and monitor every node in real time.
        </div>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <Link
          href="/signup"
          className="flex-1 md:flex-none inline-flex items-center justify-center bg-white text-neutral-950 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-colors"
        >
          Start free <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
        <Link
          href="/login"
          className="flex-1 md:flex-none inline-flex items-center justify-center border border-neutral-800 bg-neutral-950 text-neutral-200 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-neutral-900 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}

