import { Cloud, Cpu, Database, User } from "lucide-react";

export function OrchestrationSection() {
  return (
    <section className="relative w-full py-12 flex flex-col items-center justify-center overflow-hidden border-y border-neutral-900 bg-neutral-950/50">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-neutral-800/20 via-neutral-950/0 to-neutral-950/0" />

      <div className="relative z-10 flex flex-col items-center gap-2 mb-12 px-6">
        <h2 className="font-heading text-2xl text-white font-semibold tracking-tight text-center">
          Parallel orchestration
        </h2>
        <p className="text-sm text-neutral-500 text-center max-w-md">
          Zerak turns workflows into a DAG, detects independent tasks, and runs them in parallel — with live node-level updates.
        </p>
      </div>

      <div className="relative w-full max-w-lg h-64 flex items-center justify-center">
        {/* Central Core */}
        <div className="absolute z-20 w-20 h-20 bg-neutral-900 border border-neutral-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] animate-float">
          <Cpu className="h-8 w-8 text-white" />
          <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20" />
        </div>

        {/* Nodes */}
        <div className="absolute top-0 left-10 md:left-20 w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center z-20 animate-float delay-100">
          <Database className="h-5 w-5 text-neutral-400" />
        </div>
        <div className="absolute top-0 right-10 md:right-20 w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center z-20 animate-float delay-200">
          <Cloud className="h-5 w-5 text-neutral-400" />
        </div>
        <div className="absolute bottom-0 w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center z-20 animate-float delay-300">
          <User className="h-5 w-5 text-neutral-400" />
        </div>

        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-40" viewBox="0 0 512 256">
          <path d="M256 128 L80 24" stroke="url(#grad1)" strokeWidth="1" fill="none" />
          <path d="M256 128 L432 24" stroke="url(#grad1)" strokeWidth="1" fill="none" />
          <path d="M256 128 L256 232" stroke="url(#grad1)" strokeWidth="1" fill="none" />

          <circle r="2" fill="white">
            <animateMotion dur="3s" repeatCount="indefinite" path="M256 128 L80 24" />
          </circle>
          <circle r="2" fill="white">
            <animateMotion dur="3s" repeatCount="indefinite" begin="1s" path="M256 128 L432 24" />
          </circle>
          <circle r="2" fill="white">
            <animateMotion dur="4s" repeatCount="indefinite" begin="0.5s" path="M256 128 L256 232" />
          </circle>

          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#262626" stopOpacity="1" />
              <stop offset="50%" stopColor="#525252" stopOpacity="1" />
              <stop offset="100%" stopColor="#262626" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}



