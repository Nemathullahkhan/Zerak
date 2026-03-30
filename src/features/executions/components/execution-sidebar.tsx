"use client";

import { useTRPC } from "@/trpc/client";
import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  executionSidebarOpenAtom,
  editorAtom,
} from "@/features/editor/store/atoms";
import {
  currentExecutionIdAtom,
  activeNodeAtom,
  isWorkflowExecutingAtom,
} from "@/features/editor/store/node-execution-atoms";
import { useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Clock,
  LayoutDashboard,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  TriangleAlert,
  Circle,
  Cpu,
  Coins,
  History,
  Info,
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExecutionSidebarProps {
  workflowId: string;
}

import { useQuery } from "@tanstack/react-query";

export function ExecutionSidebar({ workflowId }: ExecutionSidebarProps) {
  const [isOpen, setIsOpen] = useAtom(executionSidebarOpenAtom);
  const [activeTab, setActiveTab] = useState<
    "results" | "performance" | "cost" | "enhancement"
  >("results");
  const [period, setPeriod] = useState<"run" | "day" | "month">("run");
  const [executionId, setExecutionId] = useAtom(currentExecutionIdAtom);
  const [isExecuting, setIsExecuting] = useAtom(isWorkflowExecutingAtom);

  const trpc = useTRPC();

  // Results Query (polling)
  const resultsQuery = useQuery({
    ...(trpc as any).executions.getLastForWorkflow.queryOptions({ workflowId }),
    enabled: isOpen,
    // Refetch every 1.5s while running OR if we're waiting for a run to start
    refetchInterval: (query: any) => {
      if (!isOpen) return false;
      const status = query.state?.data?.status;
      // Stop polling as soon as we have a terminal status (SUCCESS/FAILED)
      // AND we're no longer in the initial trigger-wait state
      if (isExecuting) return 1500;
      if (status === "RUNNING") return 1500;
      return false;
    },
    // Ensure we refetch on window focus to get latest state
    refetchOnWindowFocus: true,
  });

  // Auto-switch and reset state when execution ID changes
  const lastExecutionId = resultsQuery.data?.id;
  useEffect(() => {
    const status = resultsQuery.data?.status;

    // 1. If we see a new ID, it means the triggered run has appeared in the DB
    if (lastExecutionId && lastExecutionId !== executionId) {
      setExecutionId(lastExecutionId);
      setActiveTab("results");
      if (isExecuting) setIsExecuting(false);
    }

    // 2. If the run is already active, we definitely aren't "waiting" anymore
    if (status === "RUNNING" && isExecuting) {
      setIsExecuting(false);
    }

    // 3. Safety: If the run finished super fast, clear the waiting state
    if ((status === "SUCCESS" || status === "FAILED") && isExecuting) {
      setIsExecuting(false);
    }
  }, [
    lastExecutionId,
    executionId,
    setExecutionId,
    isExecuting,
    setIsExecuting,
    resultsQuery.data?.status,
  ]);

  // Analysis Query (shared for Perf, Cost, Enhance)
  const analysisQuery = useQuery({
    ...(trpc as any).analysis.analyzeWorkflow.queryOptions({ workflowId }),
    enabled: isOpen && activeTab !== "results",
    staleTime: 60000,
  });

  const getDurationString = () => {
    const data = resultsQuery.data as any;
    if (!data?.startedAt) return "0s";

    // Calculate accurate duration if completed from metadata
    const metadata = data.output?.__metadata__;
    if (data.status === "SUCCESS" && metadata?.nodeTimings) {
      const totalMs = Object.values(
        metadata.nodeTimings as Record<string, { durationMs: number }>,
      ).reduce((sum, t) => sum + t.durationMs, 0);
      if (totalMs > 0) return (totalMs / 1000).toFixed(1) + "s";
    }

    return formatDistanceToNowStrict(new Date(data.startedAt));
  };

  const getTabBadge = (tab: string) => {
    if (tab === "results" && resultsQuery.data?.status === "RUNNING") {
      return (
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1.5" />
      );
    }
    if (tab === "cost" && analysisQuery.data?.cost?.perRunCost) {
      return (
        <span className="text-[9px] bg-primary/10 text-primary px-1 rounded ml-1.5">
          ${analysisQuery.data.cost.perRunCost.toFixed(2)}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-[100vh] w-2xl z-50 flex flex-col shadow-2xl transition-transform duration-200 ease-in-out",
        "bg-background border-l-[0.5px] border-border",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-[44px] px-4 shrink-0 border-b border-border">
        <span className="font-semibold text-sm">Execution</span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center w-full border-b border-border ">
        {(["results", "performance", "cost", "enhancement"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors flex items-center justify-center",
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.substring(0, 7)}
              {tab === "enhancement" ? "ce" : ""}
              {getTabBadge(tab)}
            </button>
          ),
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === "results" ? (
              <ResultsTab
                data={resultsQuery.data}
                isLoading={resultsQuery.isLoading}
                durationStr={getDurationString()}
                isWaiting={isExecuting}
              />
            ) : analysisQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground capitalize">
                    Analyzing {activeTab}...
                  </p>
                  <p className="text-[11px]">Crunching the latest run data</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "performance" && (
                  <PerformanceTab query={analysisQuery} />
                )}
                {activeTab === "cost" && <CostTab query={analysisQuery} />}
                {activeTab === "enhancement" && (
                  <EnhancementTab
                    query={analysisQuery}
                    workflowId={workflowId}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ResultsTab({
  data,
  isLoading,
  durationStr,
  isWaiting,
}: {
  data: any;
  isLoading: boolean;
  durationStr: string;
  isWaiting: boolean;
}) {
  // Only show a full-page loader if we have absolutely no data yet
  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-3 h-3 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Fetching execution details...
          </p>
          <p className="text-[11px] text-muted-foreground">
            Hang tight while we load the latest run
          </p>
        </div>
      </div>
    );
  }

  if (!data && !isWaiting) {
    return (
      <div className="px-4 py-12 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <History className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            No executions found
          </p>
          <p className="text-xs text-muted-foreground">
            Click the "Execute" button to run this workflow for the first time.
          </p>
        </div>
      </div>
    );
  }

  const getStatusMessage = () => {
    if (isWaiting) return "Initializing execution engine...";
    switch (data?.status) {
      case "RUNNING":
        return "Workflow is currently executing steps...";
      case "SUCCESS":
        return `Successfully completed in ${durationStr}`;
      case "FAILED":
        return "Execution failed. Check the errors below.";
      default:
        return "Waiting for execution to start...";
    }
  };

  const status = isWaiting ? "RUNNING" : data?.status || "PENDING";

  return (
    <div className="flex flex-col gap-4">
      {/* Status Banner */}
      <div
        className={cn(
          "px-4 py-3.5 flex items-center gap-3 rounded-xl border shadow-sm transition-all duration-300",
          status === "RUNNING"
            ? "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20"
            : status === "SUCCESS"
              ? "bg-green-500/5 text-green-700 dark:text-green-400 border-green-500/20"
              : status === "FAILED"
                ? "bg-red-500/5 text-red-700 dark:text-red-400 border-red-500/20"
                : "bg-muted/30 text-muted-foreground border-border/50",
        )}
      >
        <div className="shrink-0">
          {status === "RUNNING" && (
            <div className="relative">
              <Loader2 className="w-4 h-4 animate-spin" />
              <div className="absolute inset-0 bg-current opacity-20 blur-[2px] animate-pulse rounded-full" />
            </div>
          )}
          {status === "SUCCESS" && (
            <CheckCircle2 className="w-4 h-4 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
          )}
          {status === "FAILED" && (
            <XCircle className="w-4 h-4 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
          )}
          {status === "PENDING" && <Circle className="w-4 h-4 opacity-30" />}
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-bold tracking-tight">
            {status === "RUNNING"
              ? "Execution in Progress"
              : status === "SUCCESS"
                ? "Execution Successful"
                : status === "FAILED"
                  ? "Execution Failed"
                  : "Ready to Execute"}
          </span>
          <span className="text-[11px] opacity-80 font-medium">
            {getStatusMessage()}
          </span>
        </div>
      </div>

      {/* Execution Path */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
            <LayoutDashboard className="w-3 h-3" />
            Execution Path
          </h4>
          {data?.output?.__metadata__?.totalNodes && (
            <span className="text-[10px] font-mono font-bold text-muted-foreground/50">
              {Object.keys(data.output.__metadata__.nodeResults || {}).length} /{" "}
              {data.output.__metadata__.totalNodes} Steps
            </span>
          )}
        </div>

        <div className="flex flex-col border rounded-xl overflow-hidden bg-card/30 shadow-sm divide-y divide-border/30">
          {data?.groups?.map((group: any, i: number) => (
            <ResultGroupRow
              key={i}
              group={group}
              status={
                data.output?.__metadata__?.nodeResults?.[group.nodeId]
                  ?.status || "PENDING"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultGroupRow({ group, status }: { group: any; status?: string }) {
  const [expanded, setExpanded] = useState(false);

  // Type Badge Colors
  const getTypeColor = () => {
    const type = group.nodeType;
    if (["ANTHROPIC", "OPENAI", "GEMINI"].includes(type))
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    if (type === "HTTP_REQUEST")
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (
      ["MANUAL_TRIGGER", "GOOGLE_FORM_TRIGGER", "STRIPE_TRIGGER"].includes(type)
    )
      return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    if (["DISCORD", "SLACK", "GMAIL"].includes(type))
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const getStatusIcon = () => {
    switch (status) {
      case "PENDING":
        return (
          <Circle className="w-2.5 h-2.5 text-muted-foreground/20 fill-muted-foreground/5" />
        );
      case "RUNNING":
        return (
          <div className="relative">
            <Loader2 className="w-2.5 h-2.5 text-amber-500 animate-spin" />
            <div className="absolute inset-0 bg-amber-500 opacity-20 blur-[1px] animate-pulse rounded-full" />
          </div>
        );
      case "SUCCESS":
        return (
          <CheckCircle2 className="w-2.5 h-2.5 text-green-500 fill-green-500/10" />
        );
      case "FAILED":
        return <XCircle className="w-2.5 h-2.5 text-red-500 fill-red-500/10" />;
      default:
        return (
          <Circle className="w-2.5 h-2.5 text-muted-foreground/20 fill-muted-foreground/5" />
        );
    }
  };

  const hasOutput = group.variables && group.variables.length > 0;

  return (
    <div
      className={cn(
        "group/row transition-all duration-200",
        status === "RUNNING" ? "bg-amber-500/5" : "hover:bg-muted/20",
      )}
    >
      <button
        className="w-full text-left p-4 flex items-start gap-4 transition-all"
        onClick={() => hasOutput && setExpanded(!expanded)}
        disabled={!hasOutput}
      >
        <div className="mt-1 flex flex-col items-center gap-3 shrink-0">
          <div className="relative">
            {getStatusIcon()}
            {status === "RUNNING" && (
              <div className="absolute -inset-1 border border-amber-500/30 rounded-full animate-ping" />
            )}
          </div>
          {hasOutput && (
            <span className="text-muted-foreground/40 group-hover/row:text-primary transition-colors">
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] font-black px-1.5 h-4 flex items-center rounded-sm uppercase tracking-wider border-0 shadow-none",
                  getTypeColor(),
                )}
              >
                {group.nodeType.replace("_", " ")}
              </Badge>
              <span
                className={cn(
                  "text-[13px] font-bold truncate transition-colors",
                  status === "RUNNING"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground/80",
                )}
              >
                {group.nodeName}
              </span>
            </div>
            {status === "SUCCESS" && group.durationMs && (
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {(group.durationMs / 1000).toFixed(2)}s
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {hasOutput ? (
              group.variables?.slice(0, 1).map((v: any, j: number) => {
                const preview =
                  typeof v.output === "string"
                    ? v.output
                    : JSON.stringify(v.output);
                return (
                  <div
                    key={j}
                    className="flex items-center gap-2 group/var overflow-hidden"
                  >
                    <code className="text-[10px] font-bold font-mono text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 shrink-0">
                      {v.variableName}
                    </code>
                    <span className="text-[11px] text-muted-foreground/70 truncate font-medium">
                      {preview}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-[11px] text-muted-foreground/40 italic font-medium">
                {status === "PENDING"
                  ? "Waiting to execute..."
                  : status === "RUNNING"
                    ? "Processing node..."
                    : "No output produced"}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && hasOutput && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-muted/30 rounded-xl p-5 border border-border/50 max-h-[400px] overflow-y-auto space-y-5 shadow-inner">
            {group.variables?.map((v: any, j: number) => (
              <div key={j} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] font-mono">
                    {v.variableName}
                  </span>
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                  <CodeBlock value={v.output} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ value }: { value: any }) {
  const [showFull, setShowFull] = useState(false);
  const str =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const isTruncatable = str.length > 300;

  const displayStr =
    !showFull && isTruncatable ? str.slice(0, 300) + "\n..." : str;

  return (
    <div className="relative">
      <pre className="font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap break-all">
        {displayStr}
      </pre>
      {!showFull && isTruncatable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFull(true);
          }}
          className="text-[10px] text-primary hover:underline mt-1 font-medium"
        >
          show more
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE TAB
// ─────────────────────────────────────────────────────────────────────────────

function PerformanceTab({ query }: { query: any }) {
  if (!query.data?.performance) {
    return (
      <div className="px-4 py-12 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Cpu className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            No performance data
          </p>
          <p className="text-xs text-muted-foreground">
            Run the workflow to see execution timings.
          </p>
        </div>
      </div>
    );
  }

  const { performance } = query.data;
  const aiTime = performance.nodes
    .filter((n: any) => ["ANTHROPIC", "OPENAI", "GEMINI"].includes(n.nodeType))
    .reduce((sum: number, n: any) => sum + n.durationMs, 0);

  const NODE_COLORS = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-pink-500",
  ];

  return (
    <div className="flex flex-col p-4 gap-8">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 border-border/50 shadow-none">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
              Total Run
            </span>
            <span className="text-lg font-bold font-mono">
              {(performance.totalMs / 1000).toFixed(2)}s
            </span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50 shadow-none">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
              AI Latency
            </span>
            <span className="text-lg font-bold font-mono text-purple-500">
              {(aiTime / 1000).toFixed(2)}s
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Execution Timeline
          </h4>
          <Badge
            variant="outline"
            className="text-[10px] font-mono text-muted-foreground"
          >
            {performance.nodes.length} nodes
          </Badge>
        </div>

        <div className="space-y-6">
          {performance.nodes
            .sort((a: any, b: any) => b.durationMs - a.durationMs)
            .map((node: any, index: number) => {
              const pct = node.percentOfTotal;
              const colorClass = NODE_COLORS[index % NODE_COLORS.length];

              return (
                <div key={node.nodeId} className="group">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          colorClass,
                        )}
                      />
                      <span className="font-medium truncate group-hover:text-primary transition-colors">
                        {node.nodeName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                        {node.nodeType}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 font-mono font-medium flex items-center gap-1.5",
                        "text-foreground/80",
                      )}
                    >
                      {(node.durationMs / 1000).toFixed(2)}s
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({Math.round(pct)}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5 bg-muted/30"
                    indicatorClassName={colorClass}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COST TAB
// ─────────────────────────────────────────────────────────────────────────────

function CostTab({ query }: { query: any }) {
  const [dailyRuns, setDailyRuns] = useState(10);

  if (!query.data?.cost || query.data.cost.aiNodes.length === 0) {
    return (
      <div className="px-4 py-12 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Coins className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Zero operating cost
          </p>
          <p className="text-xs text-muted-foreground">
            This workflow doesn't use any paid AI nodes or scrapers.
          </p>
        </div>
      </div>
    );
  }

  const { cost } = query.data;
  const totalTokens = cost.aiNodes.reduce(
    (sum: number, n: any) => sum + n.inputTokensEst + n.outputTokensEst,
    0,
  );
  const perRun = cost.perRunCost;

  return (
    <div className="flex flex-col p-4 gap-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50 border-border/50 shadow-none">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
              Token Use
            </span>
            <span className="text-lg font-bold font-mono">
              {totalTokens.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50 shadow-none">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
              Token Cost
            </span>
            <span className="text-lg font-bold font-mono text-green-500">
              ${perRun.toFixed(4)}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50 shadow-none">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
              Total Prompts
            </span>
            <span className="text-lg font-bold font-mono text-blue-500">
              {cost.aiNodes.length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Node Breakdown */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-green-500" />
          AI Prompt Breakdown
        </h4>
        <div className="space-y-3">
          {cost.aiNodes.map((n: any, i: number) => (
            <div
              key={i}
              className="flex flex-col p-3 rounded-lg border border-border/50 bg-muted/10"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold truncate">
                    {n.nodeName}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[9px] py-0 px-1.5 opacity-70"
                  >
                    {n.model}
                  </Badge>
                </div>
                <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                  ${n.costPerRun.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 opacity-50" />
                  {n.inputTokensEst} in
                </span>
                <span className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 opacity-50" />
                  {n.outputTokensEst} out
                </span>
                {n.isEstimate && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className="text-[8px] py-0 px-1 border-amber-500/20 text-amber-500"
                        >
                          Estimate
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-[10px]">
                          Actual token counts were not returned by the API.
                          Using fallback estimates.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Cost Calculator */}
      <div className="space-y-5 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Cost Projection
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              Runs / Day
            </span>
            <Input
              type="number"
              value={dailyRuns}
              onChange={(e) =>
                setDailyRuns(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-16 h-7 text-xs font-mono px-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium">Per Run Cost</span>
                <span className="text-[9px] text-muted-foreground">
                  Direct execution
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-sm">
              ${perRun.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium">Daily Cost</span>
                <span className="text-[9px] text-muted-foreground">
                  {dailyRuns} runs per day
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-sm">
              ${(perRun * dailyRuns).toFixed(3)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold">Monthly Estimate</span>
                <span className="text-[9px] text-muted-foreground">
                  30-day projection
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-base text-primary">
              ${(perRun * dailyRuns * 30).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENHANCEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────

function EnhancementTab({
  query,
  workflowId,
}: {
  query: any;
  workflowId: string;
}) {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const setSidebarOpen = useSetAtom(executionSidebarOpenAtom);
  const editor = useAtomValue(editorAtom);
  const updateWorkflow = useUpdateWorkflow();

  const enhancements = query.data?.enhancement || [];

  if (enhancements.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground space-y-2">
        <CheckCircle2 className="w-8 h-8 mx-auto text-green-500/50" />
        <p>No suggestions — workflow looks optimized.</p>
      </div>
    );
  }

  const handleApply = async (s: any) => {
    if (!editor) return;
    const nodes = editor.getNodes();
    const nodeIndex = nodes.findIndex(
      (n) => (n.data as any).variableName === s.nodeVariableName,
    );

    if (nodeIndex !== -1) {
      const node = nodes[nodeIndex];
      let updatedNode = { ...node, selected: true };

      if (s.actionField && s.actionValue) {
        updatedNode = {
          ...node,
          selected: true,
          data: {
            ...node.data,
            [s.actionField]: s.actionValue,
          },
        };
      }

      const updatedNodes = nodes.map((nd) =>
        nd.id === node.id ? updatedNode : { ...nd, selected: false },
      );

      editor.setNodes(updatedNodes);
      editor.fitView({ nodes: [{ id: node.id }], duration: 500, maxZoom: 1 });

      if (s.actionField && s.actionValue) {
        try {
          await updateWorkflow.mutateAsync({
            id: workflowId,
            nodes: updatedNodes,
            edges: editor.getEdges(),
          });
          toast.success(`Applied change: ${s.actionField} updated`);
        } catch (e) {
          toast.error("Failed to save changes automatically");
        }
      }

      setActiveNode({
        id: node.id,
        type: node.type as string,
        workflowId,
        data: updatedNode.data as Record<string, unknown>,
      });
      setSidebarOpen(false);
    } else {
      toast.error(`Could not find node: ${s.nodeVariableName}`);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {enhancements.map((s: any, i: number) => {
        const borderColors = {
          high: "border-l-[#639922]",
          medium: "border-l-[#BA7517]",
          info: "border-l-[#378ADD]",
        };

        const labelColor =
          s.savingLabel?.toLowerCase().includes("faster") ||
          s.savingLabel?.toLowerCase().includes("s ")
            ? "text-[#BA7517]" // amber
            : "text-[#639922]"; // green

        const borderColor =
          borderColors[s.priority as keyof typeof borderColors] ||
          borderColors.info;

        return (
          <div
            key={i}
            className={cn(
              "flex flex-col p-4 bg-card rounded-lg border border-border border-l-[3px]",
              borderColor,
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-muted-foreground truncate max-w-[140px]">
                {s.nodeVariableName}
              </span>
              <span
                className={cn(
                  "text-[11px] font-bold flex items-center gap-1",
                  labelColor,
                )}
              >
                💡 {s.savingLabel}
              </span>
            </div>

            <h5 className="text-[13px] font-semibold text-foreground mb-1 leading-tight">
              {s.title}
            </h5>
            <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
              {s.body}
            </p>

            <button
              className="mt-auto flex items-center justify-between w-full pt-3 border-t border-border/50 text-[11px] font-semibold hover:text-primary transition-colors group"
              onClick={() => handleApply(s)}
            >
              Examine Node
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
