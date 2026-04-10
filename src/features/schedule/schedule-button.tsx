"use client";
import { useState } from "react";
import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ScheduleDialog } from "./schedule-dialog";

export function ScheduleButton({ workflowId }: { workflowId: string }) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const { data: schedule } = useQuery(trpc.schedules.get.queryOptions({ workflowId }));
  const isScheduled = schedule?.isActive;

  return (
    <>
      <Button
        size="sm"
        variant={isScheduled ? "default" : "outline"}
        onClick={() => setOpen(true)}
        className={cn(
          "gap-2 h-9 px-4",
          isScheduled &&
            "border-purple-500/50 text-purple-100 bg-purple-600 hover:bg-purple-700 shadow-sm",
        )}
      >
        <ClockIcon className="size-4" />
        {isScheduled ? "Scheduled" : "Schedule"}
      </Button>
      <ScheduleDialog
        open={open}
        onOpenChange={setOpen}
        workflowId={workflowId}
        existing={schedule ?? null}
      />
    </>
  );
}
