"use client";

import { useTRPC } from "@/trpc/client";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { executionSidebarOpenAtom } from "@/features/editor/store/atoms";
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
  TriangleAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";

interface ExecutionSidebarProps {
  workflowId: string;
}

import { useQuery } from "@tanstack/react-query";

export function ExecutionSidebar({ workflowId }: ExecutionSidebarProps) {
  const [isOpen, setIsOpen] = useAtom(executionSidebarOpenAtom);
  const [activeTab, setActiveTab] = useState<"results" | "performance" | "cost" | "enhancement">("results");
  const [period, setPeriod] = useState<"run" | "day" | "month">("run");

  // Auto-switch to results when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab("results");
    }
  }, [isOpen]);

  const trpc = useTRPC();

  // Results Query (polling)
  const resultsQuery = useQuery({
    ...(trpc as any).executions.getLastForWorkflow.queryOptions({ workflowId }),
    enabled: isOpen,
    // Refetch every 1.5s while running
    refetchInterval: (query: any) => {
      if (!isOpen) return false;
      const status = query.state?.data?.status;
      if (status === "RUNNING") return 1500;
      return false;
    }
  });

  // Analysis Query (shared for Perf, Cost, Enhance)
  const analysisQuery = useQuery({
    ...(trpc as any).analysis.analyzeWorkflow.queryOptions({ workflowId }),
    enabled: isOpen && activeTab !== "results",
    staleTime: 60000 
  });

  const getDurationString = () => {
    const data = resultsQuery.data as any;
    if (!data?.startedAt) return "0s";
    return formatDistanceToNowStrict(new Date(data.startedAt));
  };

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 h-[100vh] w-2xl z-50 flex flex-col shadow-2xl transition-transform duration-200 ease-in-out",
        "bg-background border-l-[0.5px] border-border",
        isOpen ? "translate-x-0" : "translate-x-full"
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
        {(["results", "performance", "cost", "enhancement"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors",
              activeTab === tab 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.substring(0, 7)}{tab === "enhancement" ? "ce" : ""}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "results" && (
          <ResultsTab data={resultsQuery.data} isLoading={resultsQuery.isLoading} durationStr={getDurationString()} />
        )}
        {activeTab === "performance" && (
          <PerformanceTab query={analysisQuery} />
        )}
        {activeTab === "cost" && (
          <CostTab query={analysisQuery} period={period} setPeriod={setPeriod} />
        )}
        {activeTab === "enhancement" && (
          <EnhancementTab query={analysisQuery} workflowId={workflowId} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ResultsTab({ data, isLoading, durationStr }: { data: any, isLoading: boolean, durationStr: string }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-xs">Loading execution data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No executions yet. Click Execute to run.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Status Banner */}
      <div className={cn(
        "px-4 py-3 flex items-center gap-2 border-b border-border/50 text-sm font-medium",
        data.status === "RUNNING" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
        data.status === "SUCCESS" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
        "bg-red-500/10 text-red-700 dark:text-red-400"
      )}>
        {data.status === "RUNNING" && <Loader2 className="w-4 h-4 animate-spin" />}
        {data.status === "SUCCESS" && <CheckCircle2 className="w-4 h-4" />}
        {data.status === "FAILED" && <XCircle className="w-4 h-4" />}

        <span>
          {data.status === "RUNNING" && "Running…"}
          {data.status === "SUCCESS" && `Completed in ${durationStr}`}
          {data.status === "FAILED" && "Failed"}
        </span>
      </div>

      {/* Groups */}
      <div className="flex flex-col">
        {data.groups?.map((group: any, i: number) => (
          <ResultGroupRow key={i} group={group} />
        ))}
      </div>
    </div>
  );
}

function ResultGroupRow({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false);

  // Type Badge Colors
  const getTypeColor = () => {
    const type = group.nodeType;
    if (["ANTHROPIC", "OPENAI", "GEMINI"].includes(type)) return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    if (type === "HTTP_REQUEST") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (["MANUAL_TRIGGER", "GOOGLE_FORM_TRIGGER"].includes(type)) return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    if (["DISCORD", "SLACK", "GMAIL"].includes(type)) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="border-b border-border">
      <button 
        className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="mt-0.5 text-muted-foreground shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", getTypeColor())}>
              {group.nodeType}
            </span>
            <span className="text-[13px] font-medium truncate">{group.nodeName}</span>
          </div>
          
          <div className="flex flex-col gap-1 mt-1">
            {group.variables?.slice(0, 1).map((v: any, j: number) => {
              const preview = typeof v.output === 'string' ? v.output : JSON.stringify(v.output);
              return (
                <span key={j} className="text-[12px] text-muted-foreground truncate">
                  <span className="font-mono text-foreground/70">{v.variableName}</span> · {preview}
                </span>
              );
            })}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="bg-secondary/50 rounded-md p-3 max-h-[400px] overflow-y-auto">
            {group.variables?.map((v: any, j: number) => (
              <div key={j} className="mb-4 last:mb-0">
                <div className="text-[11px] font-bold text-muted-foreground mb-1 font-mono">
                  {v.variableName}
                </div>
                <CodeBlock value={v.output} />
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
  const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const isTruncatable = str.length > 300;
  
  const displayStr = !showFull && isTruncatable ? str.slice(0, 300) + "\n..." : str;

  return (
    <div className="relative">
      <pre className="font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap break-all">
        {displayStr}
      </pre>
      {!showFull && isTruncatable && (
        <button 
          onClick={(e) => { e.stopPropagation(); setShowFull(true); }}
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
  if (query.isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/60 animate-pulse rounded-lg" />)}
        </div>
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted/60 animate-pulse rounded-md w-full" />)}
        </div>
      </div>
    );
  }

  if (!query.data?.performance) {
    return <div className="p-4 text-sm text-muted-foreground">No performance data available.</div>;
  }

  const { performance } = query.data;
  const aiTime = performance.nodes.filter((n: any) => ["ANTHROPIC", "OPENAI", "GEMINI"].includes(n.nodeType))
                                  .reduce((sum: number, n: any) => sum + n.durationMs, 0);
  
  const bottleneckNode = performance.nodes.find((n: any) => n.nodeId === performance.bottleneckNodeId);

  return (
    <div className="flex flex-col p-4 gap-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col p-3 rounded-lg border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total run time</span>
          <span className="text-lg font-bold">{(performance.totalMs / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex flex-col p-3 rounded-lg border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">AI Time</span>
          <span className="text-lg font-bold">{(aiTime / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex flex-col p-3 rounded-lg border border-border bg-card overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Bottleneck</span>
          <span className="text-sm font-bold truncate">{bottleneckNode?.nodeName || "None"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="font-semibold text-sm">Node Breakdown</h4>
        <div className="flex flex-col gap-3">
          {performance.nodes.sort((a: any, b: any) => b.durationMs - a.durationMs).map((node: any) => {
            const isBottleneck = node.nodeId === performance.bottleneckNodeId;
            const pct = node.percentOfTotal;
            const fillColor = pct >= 60 ? "#E24B4A" : pct >= 30 ? "#BA7517" : "#378ADD";

            return (
              <div key={node.nodeId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[10px] px-1 py-0.5 bg-muted text-muted-foreground rounded border border-border shrink-0">
                      {node.nodeType}
                    </span>
                    <span className="font-medium truncate">{node.nodeName}</span>
                  </div>
                  <div className={cn("shrink-0 font-medium flex items-center gap-1", isBottleneck ? "text-red-500" : "text-muted-foreground")}>
                    {isBottleneck && <TriangleAlert className="w-3 h-3" />}
                    {(node.durationMs / 1000).toFixed(1)}s
                  </div>
                </div>
                <div className="h-1 w-full bg-border/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(1, pct)}%`, backgroundColor: fillColor }} />
                </div>
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

function CostTab({ query, period, setPeriod }: { query: any, period: "run"|"day"|"month", setPeriod: (p: "run"|"day"|"month") => void }) {
  if (query.isLoading) {
    return <div className="p-4 flex items-center justify-center h-24 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

  if (!query.data?.cost) {
    return <div className="p-4 text-sm text-muted-foreground">No cost data available.</div>;
  }

  const { cost } = query.data;
  const multiplier = { run: 1, day: 10, month: 300 }[period];

  return (
    <div className="flex flex-col p-4 gap-6">
      {/* Toggle */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-full">
        {(["run", "day", "month"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
              period === p ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "run" ? "Per run" : p === "day" ? "Daily ×10" : "Monthly ×300"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-0">
        <h4 className="font-semibold text-sm mb-3">AI Node Breakdown</h4>
        
        {cost.aiNodes.length === 0 ? (
          <div className="text-[13px] text-muted-foreground py-4 border-t border-border">
            No AI nodes in this workflow.
          </div>
        ) : (
          <div className="flex flex-col border-t border-border">
            {cost.aiNodes.map((n: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-foreground">{n.nodeName} · {n.model}</span>
                  <span className="text-[11px] text-muted-foreground">~{n.inputTokensEst} in + {n.outputTokensEst} out tokens</span>
                </div>
                <div className="font-mono text-[13px] font-medium">
                  ${(n.costPerRun * multiplier).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total Row */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border border-dashed">
          <span className="font-semibold text-[13px] text-foreground">
            Total {period === "run" ? "per run" : period === "day" ? "daily" : "monthly"}
          </span>
          <span className="font-bold font-mono text-sm text-foreground bg-primary/10 text-primary px-2 py-1 rounded">
            ${(cost.perRunCost * multiplier).toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENHANCEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────

import { useAtomValue, useSetAtom } from "jotai";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { editorAtom } from "@/features/editor/store/atoms";
import { useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";

function EnhancementTab({ query, workflowId }: { query: any, workflowId: string }) {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const setSidebarOpen = useSetAtom(executionSidebarOpenAtom);
  const editor = useAtomValue(editorAtom);
  const updateWorkflow = useUpdateWorkflow();

  if (query.isLoading) {
    return <div className="p-4 flex items-center justify-center h-24 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

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
    const nodeIndex = nodes.findIndex(n => (n.data as any).variableName === s.nodeVariableName);
    
    if (nodeIndex !== -1) {
      const node = nodes[nodeIndex];
      let updatedNode = { ...node, selected: true };

      if (s.actionField && s.actionValue) {
        updatedNode = {
          ...node,
          selected: true,
          data: {
            ...node.data,
            [s.actionField]: s.actionValue
          }
        };
      }

      const updatedNodes = nodes.map(nd => nd.id === node.id ? updatedNode : { ...nd, selected: false });
      
      editor.setNodes(updatedNodes);
      editor.fitView({ nodes: [{ id: node.id }], duration: 500, maxZoom: 1 });

      if (s.actionField && s.actionValue) {
        try {
          await updateWorkflow.mutateAsync({
            id: workflowId,
            nodes: updatedNodes,
            edges: editor.getEdges()
          });
          toast.success(`Applied change: ${s.actionField} updated`);
        } catch(e) {
          toast.error("Failed to save changes automatically");
        }
      }
      
      setActiveNode({
        id: node.id,
        type: node.type as string,
        workflowId,
        data: updatedNode.data as Record<string, unknown>
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
          info: "border-l-[#378ADD]"
        };

        const labelColor = s.savingLabel?.toLowerCase().includes("faster") || s.savingLabel?.toLowerCase().includes("s ")
          ? "text-[#BA7517]" // amber
          : "text-[#639922]"; // green

        const borderColor = borderColors[s.priority as keyof typeof borderColors] || borderColors.info;

        return (
          <div key={i} className={cn("flex flex-col p-4 bg-card rounded-lg border border-border border-l-[3px]", borderColor)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-muted-foreground truncate max-w-[140px]">
                {s.nodeVariableName}
              </span>
              <span className={cn("text-[11px] font-bold flex items-center gap-1", labelColor)}>
                💡 {s.savingLabel}
              </span>
            </div>
            
            <h5 className="text-[13px] font-semibold text-foreground mb-1 leading-tight">{s.title}</h5>
            <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">{s.body}</p>
            
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
