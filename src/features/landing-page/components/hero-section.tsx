"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bolt, LockKeyhole, Sparkles } from "lucide-react";
import WorkflowNLPInput from "@/components/WorkflowNLPInput";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { LoginDialog } from "@/features/auth/components/login-dialog";

interface HeroSectionProps {
  onCompareClick: () => void;
}

export function HeroSection({ onCompareClick }: HeroSectionProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleNLPSubmit = (query: string) => {
    if (session?.user) {
      router.push(`/dashboard?q=${encodeURIComponent(query)}`);
    } else {
      sessionStorage.setItem("pendingQuery", query);
      setLoginDialogOpen(true);
    }
  };

  return (
    <>
      <section className="text-center max-w-4xl mx-auto space-y-8 animate-clip-reveal delay-100">
        <Badge>
          AI cost preview + parallel execution (DAG) + live monitoring
        </Badge>

        <h1 className="font-heading text-3xl sm:text-5xl text-white font-semibold tracking-tight leading-tight">
          AI-native workflow automation,
          <br />
          without cost surprises.
        </h1>

        <div className="max-w-3xl mx-auto pt-6 pb-2">
          <WorkflowNLPInput
            onSubmit={handleNLPSubmit}
            placeholder="Let's build a dashboard to tra..."
            autoFocus
          />
        </div>

        <div className="pt-8 flex items-center justify-center gap-6 text-[11px] text-neutral-600">
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

      <LoginDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />
    </>
  );
}
