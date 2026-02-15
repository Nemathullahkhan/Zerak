import { SectionTitle } from "./ui/section-title";

interface ComparisonSectionProps {
  sectionRef: (el: HTMLElement | null) => void;
}

export function ComparisonSection({ sectionRef }: ComparisonSectionProps) {
  const comparisonRows = [
    ["AI cost preview (before run)", "✅", "❌", "❌"],
    ["Parallel execution (auto DAG)", "✅", "❌", "❌"],
    ["Real-time monitoring", "✅", "⚠️", "⚠️"],
    ["Pricing (baseline)", "$19/mo", "$39.99/mo", "Free*"],
  ];

  return (
    <section id="comparison" ref={sectionRef} className="space-y-10">
      <SectionTitle
        eyebrow="Comparison"
        title="Built for AI workflows — not just automations."
        subtitle="Zerak focuses on AI-specific ergonomics: cost preview, parallelism, and real-time observability."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-white font-semibold">Performance example</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-600">Parallel DAG</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-xs text-neutral-500">A 30-minute sequential workflow becomes:</div>
            <div className="mt-3 flex items-end gap-4">
              <div className="flex-1">
                <div className="text-[10px] text-neutral-600 mb-1">Sequential</div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full w-full bg-neutral-700" />
                </div>
                <div className="mt-2 text-sm text-white font-semibold">30 min</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-neutral-600 mb-1">Parallel</div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full w-[27%] bg-white shadow-[0_0_12px_rgba(255,255,255,0.15)]" />
                </div>
                <div className="mt-2 text-sm text-white font-semibold">~8 min</div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Parallel execution runs independent nodes concurrently to reduce end-to-end time.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-white font-semibold">Feature matrix</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-600">Zerak vs others</div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
            <div className="grid grid-cols-4 text-[11px]">
              <div className="col-span-1 p-3 text-neutral-500 border-b border-neutral-800">Feature</div>
              <div className="p-3 text-white border-b border-neutral-800">Zerak</div>
              <div className="p-3 text-neutral-400 border-b border-neutral-800">Zapier</div>
              <div className="p-3 text-neutral-400 border-b border-neutral-800">n8n</div>

              {comparisonRows.map((row, idx) => (
                <div key={idx} className="contents">
                  <div className="col-span-1 p-3 text-neutral-500 border-b border-neutral-800">
                    {row[0]}
                  </div>
                  <div className="p-3 text-white border-b border-neutral-800">{row[1]}</div>
                  <div className="p-3 text-neutral-400 border-b border-neutral-800">{row[2]}</div>
                  <div className="p-3 text-neutral-400 border-b border-neutral-800">{row[3]}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-[11px] text-neutral-600">
            *n8n is free if you self-host — which adds setup and maintenance overhead.
          </p>
        </div>
      </div>
    </section>
  );
}


