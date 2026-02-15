import { ArrowRight, CheckCircle2, LineChart, LockKeyhole } from "lucide-react";

export function BentoGrid() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
      {/* Card 1 */}
      <div className="md:col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-clip-reveal delay-200 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white">
            <LineChart className="h-5 w-5" />
          </div>
          <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
            -52% <ArrowRight className="h-3 w-3 -rotate-45" />
          </span>
        </div>
        <div>
          <h3 className="font-heading text-2xl font-semibold text-white tracking-tight mb-1">
            $19/mo
          </h3>
          <p className="text-xs text-neutral-500">Transparent pricing (student-friendly)</p>
        </div>
        <div className="mt-6 flex items-end gap-1 h-12">
          <div className="w-full bg-neutral-800 rounded-sm h-[40%] group-hover:bg-neutral-700 transition-all duration-500" />
          <div className="w-full bg-neutral-800 rounded-sm h-[70%] group-hover:bg-neutral-600 transition-all duration-500 delay-75" />
          <div className="w-full bg-neutral-800 rounded-sm h-[50%] group-hover:bg-neutral-700 transition-all duration-500 delay-100" />
          <div className="w-full bg-white rounded-sm h-[90%] shadow-[0_0_10px_rgba(255,255,255,0.3)] animate-pulse-alt" />
          <div className="w-full bg-neutral-800 rounded-sm h-[60%] group-hover:bg-neutral-700 transition-all duration-500 delay-150" />
        </div>
      </div>

      {/* Card 2 */}
      <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-clip-reveal delay-300 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 z-10 relative">
          <h2 className="font-heading text-lg text-white font-semibold">Live execution</h2>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-4 text-xs group cursor-default">
            <span className="font-mono text-neutral-600">10:42:23</span>
            <span className="text-white font-medium">Cost estimated</span>
            <div className="h-px flex-1 bg-neutral-800 group-hover:bg-neutral-700 transition-colors" />
            <span className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-300">
              Model: GPT
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs group cursor-default">
            <span className="font-mono text-neutral-600">10:42:45</span>
            <span className="text-white font-medium">Parallel branches running</span>
            <div className="h-px flex-1 bg-neutral-800 group-hover:bg-neutral-700 transition-colors" />
            <span className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-300">
              DAG
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs group cursor-default">
            <span className="font-mono text-neutral-600">10:43:12</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Success
            </span>
            <div className="h-px flex-1 bg-neutral-800 group-hover:bg-neutral-700 transition-colors" />
            <span className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-900/10 text-emerald-400">
              2–5× faster
            </span>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-neutral-800/10 to-transparent pointer-events-none" />
      </div>

      {/* Card 3 */}
      <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-clip-reveal delay-400">
        <div className="mb-6">
          <h2 className="font-heading text-lg text-white font-semibold">Cost controls</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Preview spend before you run. Tune prompts and models early.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-white">Estimated cost</span>
              <span className="text-neutral-400">$0.86</span>
            </div>
            <input type="range" min="0" max="100" defaultValue={62} className="w-full range-zerak" />
            <div className="flex justify-between text-[10px] text-neutral-600 font-mono">
              <span>$0</span>
              <span>$1.50</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-white">Execution mode</span>
              <span className="text-neutral-400">Parallel</span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 border border-neutral-700 bg-neutral-800 text-white rounded text-xs hover:bg-neutral-700 transition">
                Sequential
              </button>
              <button className="flex-1 py-2 border border-white bg-white text-neutral-950 rounded text-xs font-semibold shadow-md">
                Parallel DAG
              </button>
              <button className="flex-1 py-2 border border-neutral-700 bg-transparent text-neutral-400 rounded text-xs hover:text-white transition">
                Hybrid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4 */}
      <div className="md:col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-clip-reveal delay-500 flex flex-col justify-center items-center text-center relative">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full animate-spin-slow opacity-20" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeDasharray="10 10"
              className="text-neutral-500"
            />
          </svg>
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" stroke="#262626" strokeWidth="4" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#ffffff"
              strokeWidth="4"
              fill="none"
              strokeDasharray="251.2"
              strokeDashoffset="60"
              strokeLinecap="round"
              className="animate-pulse-alt"
            />
          </svg>
          <LockKeyhole className="h-8 w-8 text-white relative z-10" />
        </div>
        <h3 className="font-heading text-xl font-semibold text-white tracking-tight mb-2">
          Predictability
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed px-4">
          No surprise billing. Transparent estimates before execution.
        </p>
      </div>
    </section>
  );
}


