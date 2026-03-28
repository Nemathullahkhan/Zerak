"use client";

import { useTRPC } from "@/trpc/client";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Zap,
  Clock,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PerformanceNode {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  durationMs: number;
  percentOfTotal: number;
}

interface AiNodeAnalysis {
  nodeId: string;
  nodeName: string;
  model: string;
  inputTokensEst: number;
  outputTokensEst: number;
  costPerRun: number;
}

interface SuggestionItem {
  nodeVariableName: string;
  title: string;
  body: string;
  savingLabel: string;
  priority: "high" | "medium" | "info";
  type: "model_swap" | "prompt_optimization" | "architecture";
}

interface AnalysisData {
  performance: {
    totalMs: number;
    bottleneckNodeId: string;
    nodes: PerformanceNode[];
  };
  cost: {
    perRunCost: number;
    aiNodes: AiNodeAnalysis[];
  };
  enhancement: SuggestionItem[];
  executionId: string;
  ranAt: string;
}

import { useQuery } from "@tanstack/react-query";

export function WorkflowAnalysisPanel({ workflowId }: { workflowId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState<"run" | "daily" | "monthly">("run");
  
  const trpc = useTRPC();
  const { data, isLoading } = useQuery({
    ...(trpc as any).analysis.analyzeWorkflow.queryOptions({ workflowId }),
    enabled: isOpen,
    staleTime: 60000 
  }) as { data: AnalysisData | null | undefined; isLoading: boolean };

  const multiplier = period === "run" ? 1 : period === "daily" ? 10 : 300;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Activity className="size-4" />
          Analyze
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-card text-card-foreground border-border">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            Workflow Analysis
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-6 mt-6">
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="bg-muted p-4 rounded-full">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">No Execution Data</h3>
              <p className="text-sm text-muted-foreground">
                Run the workflow first to see performance and cost analysis.
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="performance" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="cost">Cost</TabsTrigger>
              <TabsTrigger value="enhancement">Enhancement</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-6 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/50 border-none shadow-none">
                  <CardHeader className="p-3 pb-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Time</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-lg font-bold text-foreground">{(data.performance.totalMs / 1000).toFixed(2)}s</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50 border-none shadow-none">
                  <CardHeader className="p-3 pb-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">AI Inference</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-lg font-bold text-foreground">
                      {(data.performance.nodes
                        .filter((n: PerformanceNode) => n.nodeType === "ANTHROPIC" || n.nodeType === "OPENAI" || n.nodeType === "GEMINI")
                        .reduce((sum: number, n: PerformanceNode) => sum + n.durationMs, 0) / 1000).toFixed(2)}s
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50 border-none shadow-none">
                  <CardHeader className="p-3 pb-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bottleneck</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-sm font-bold text-foreground truncate">
                      {data.performance.nodes.find((n: PerformanceNode) => n.nodeId === data.performance.bottleneckNodeId)?.nodeName || "None"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Node Breakdown</h4>
                <div className="space-y-3">
                  {data.performance.nodes
                    .sort((a: PerformanceNode, b: PerformanceNode) => b.durationMs - a.durationMs)
                    .map((node: PerformanceNode) => (
                    <div key={node.nodeId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Badge variant="outline" className="text-[10px] py-0 px-1 border-muted-foreground/30 text-muted-foreground shrink-0">
                            {node.nodeType}
                          </Badge>
                          <span className="font-medium text-foreground truncate">{node.nodeName}</span>
                        </div>
                        <span className={cn(
                          "shrink-0",
                          node.nodeId === data.performance.bottleneckNodeId ? "text-destructive font-bold" : "text-muted-foreground"
                        )}>
                          {(node.durationMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                      <Progress 
                        value={node.percentOfTotal} 
                        {...({
                          // Injecting custom indicator style via data attribute if using standard progress
                          style: {
                            "--progress-background": node.nodeId === data.performance.bottleneckNodeId ? "var(--color-destructive)" : "var(--color-primary)"
                          }
                        } as any)}
                        // Using cn to target the indicator slot defined in progress.tsx
                        className={cn(
                          "h-1.5 bg-muted",
                          node.nodeId === data.performance.bottleneckNodeId 
                            ? "[&_[data-slot=progress-indicator]]:bg-destructive" 
                            : "[&_[data-slot=progress-indicator]]:bg-primary"
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cost" className="space-y-6 mt-4">
              <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-md w-fit mx-auto">
                <Button 
                  variant={period === "run" ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setPeriod("run")}
                >
                  Per Run
                </Button>
                <Button 
                  variant={period === "daily" ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setPeriod("daily")}
                >
                  Daily
                </Button>
                <Button 
                  variant={period === "monthly" ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setPeriod("monthly")}
                >
                  Monthly
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">AI Node Costs</h4>
                {data.cost.aiNodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed border-border">
                    No AI nodes detected in this workflow.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.cost.aiNodes.map((node: AiNodeAnalysis) => (
                      <div key={node.nodeId} className="flex items-center justify-between p-3 border rounded-lg border-border bg-muted/20">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{node.nodeName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{node.model}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground font-mono">
                            ${(node.costPerRun * multiplier).toFixed(4)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            ~{node.inputTokensEst + node.outputTokensEst} tokens
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                      <span className="font-bold text-foreground">Total Estimated Cost</span>
                      <span className="text-lg font-bold text-primary font-mono select-all">
                        ${(data.cost.perRunCost * multiplier).toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="enhancement" className="space-y-4 mt-4">
              {data.enhancement.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed border-border">
                  <LayoutDashboard className="size-8 mx-auto mb-3 opacity-20" />
                  <p>No optimization suggestions available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.enhancement.map((suggestion, i) => (
                    <Card 
                      key={i} 
                      className={cn(
                        "shadow-none bg-card border-border border-l-4",
                        suggestion.priority === "high" ? "border-l-green-500" : 
                        suggestion.priority === "medium" ? "border-l-amber-500" : 
                        "border-l-blue-500"
                      )}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tighter bg-muted text-muted-foreground">
                            {suggestion.nodeVariableName}
                          </Badge>
                          <span className={cn(
                            "text-[11px] font-bold",
                            suggestion.priority === "high" ? "text-green-600" : 
                            suggestion.priority === "medium" ? "text-amber-600" : 
                            "text-blue-600"
                          )}>
                            {suggestion.savingLabel}
                          </span>
                        </div>
                        <h5 className="text-[13px] font-semibold leading-tight text-foreground">{suggestion.title}</h5>
                        <p className="text-[12px] text-muted-foreground leading-snug">
                          {suggestion.body}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between h-8 mt-2 text-[11px] font-medium border-t border-border rounded-none pt-2 hover:bg-muted"
                          onClick={() => {
                            toast("Suggestion recorded", {
                                description: "How do I apply this to my " + suggestion.nodeVariableName + " node: " + suggestion.title
                            });
                          }}
                        >
                          Apply suggestion
                          <ArrowRight className="size-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
