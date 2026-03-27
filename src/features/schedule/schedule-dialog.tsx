"use client";
import { useState, useMemo } from "react";
import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflowId: string;
  existing: {
    cronExpression: string;
    timezone: string;
    isActive: boolean;
  } | null;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  workflowId,
  existing,
}: Props) {
  const [time, setTime] = useState(() => {
    const expr = existing?.cronExpression || "0 9 * * *";
    const parts = expr.split(" ");
    if (
      parts.length >= 2 &&
      !isNaN(Number(parts[0])) &&
      !isNaN(Number(parts[1]))
    ) {
      return `${parts[1].padStart(2, "0")}:${parts[0].padStart(2, "0")}`;
    }
    return "09:00";
  });

  const cron = useMemo(() => {
    if (!time) return "0 9 * * *";
    const [hr, min] = time.split(":");
    return `${Number(min)} ${Number(hr)} * * *`;
  }, [time]);

 const [tz, setTz] = useState(
  () => existing?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
);
  const [active, setActive] = useState(existing?.isActive ?? true);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const upsert = useMutation(
    trpc.schedules.upsert.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.schedules.get.queryFilter({ workflowId }),
        );
        onOpenChange(false);
        toast.success("Schedule saved successfully");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to save schedule");
      },
    }),
  );

  const remove = useMutation(
    trpc.schedules.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.schedules.get.queryFilter({ workflowId }),
        );
        onOpenChange(false);
        toast.success("Schedule removed successfully");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to remove schedule");
      },
    }),
  );

  const preview = useMemo(() => {
    try {
      return cronstrue.toString(cron);
    } catch {
      return "Invalid expression";
    }
  }, [cron]);

  const nextRun = useMemo(() => {
    try {
      const d = CronExpressionParser.parse(cron, {
        tz,
        currentDate: new Date(),
      })
        .next()
        .toDate();
      return d.toLocaleString("en-US", {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "--";
    }
  }, [cron, tz]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Daily Run Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{preview}</p>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="UTC"
            />
          </div>

          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              Next scheduled run
            </p>
            <p className="text-sm font-medium text-foreground">{nextRun}</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50 mt-6">
            {existing && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => remove.mutate({ workflowId })}
                disabled={remove.isPending}
              >
                Remove schedule
              </Button>
            )}
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() =>
                upsert.mutate({
                  workflowId,
                  cronExpression: cron,
                  timezone: tz,
                  isActive: active,
                })
              }
              disabled={upsert.isPending}
            >
              Save schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}