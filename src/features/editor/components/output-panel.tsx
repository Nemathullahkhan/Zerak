"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NodeExecutionOutput } from "@/features/editor/store/node-execution-atoms";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  MessageSquare,
  Terminal,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface OutputPanelProps {
  output: NodeExecutionOutput | null;
  /** nodeId of the node currently open in the middle panel */
  activeNodeId: string | null;
  /** true while the executeNode tRPC mutation is in-flight */
  isExecuting?: boolean;
  /** true while the saveNode tRPC mutation is in-flight */
  isSaving?: boolean;
}

export const OutputPanel = ({
  output,
  activeNodeId,
  isExecuting = false,
  isSaving = false,
}: OutputPanelProps) => {
  // Only surface output that belongs to the currently-selected node.
  // Switching nodes hides stale output from the previous one.
  const visibleOutput =
    output && activeNodeId && output.nodeId === activeNodeId ? output : null;

  return (
    <div className="flex h-full flex-col">
      <Tabs
        defaultValue="output"
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Output
            </span>

            {isSaving ? (
              <SaveIndicator />
            ) : (
              visibleOutput && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <AlertTriangle className="size-3 text-yellow-500/70" />
                  <Info className="size-3" />
                </div>
              )
            )}
          </div>

          <TabsList className="h-7 gap-0.5 bg-transparent p-0">
            <TabsTrigger
              value="output"
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Terminal className="size-3" />
              Output
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <MessageSquare className="size-3" />
              Chat
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Output tab */}
        <TabsContent value="output" className="mt-0 flex-1 overflow-y-auto">
          {isExecuting ? (
            <ExecutingLoader />
          ) : visibleOutput?.error ? (
            <ErrorOutput error={visibleOutput.error} />
          ) : visibleOutput ? (
            <OutputDisplay output={visibleOutput} />
          ) : (
            <EmptyOutput />
          )}
        </TabsContent>

        {/* Chat tab */}
        <TabsContent
          value="chat"
          className="mt-0 flex flex-1 flex-col overflow-hidden p-4"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border">
            <div className="rounded-md border border-border bg-secondary p-2">
              <MessageSquare className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs font-medium text-foreground">
                Chat coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Ask follow-up questions about the node output
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Save indicator ────────────────────────────────────────────────────────────

const SaveIndicator = () => (
  <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-0.5">
    <Loader2 className="size-3 animate-spin text-muted-foreground" />
    <span className="text-[10px] text-muted-foreground">Saving…</span>
  </div>
);

// ─── Executing loader ──────────────────────────────────────────────────────────

const ExecutingLoader = () => (
  <div className="flex h-full flex-col">
    <SkeletonSection />
    <SkeletonSection rows={4} />
    <div className="mt-auto flex items-center justify-center gap-2 pb-6 pt-4">
      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground">Running node…</span>
    </div>
  </div>
);

const SkeletonSection = ({ rows = 2 }: { rows?: number }) => (
  <div className="border-b border-border">
    <div className="flex items-center gap-2 px-4 py-2.5">
      <div className="h-2.5 w-2.5 animate-pulse rounded-sm bg-muted" />
      <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
    </div>
    <div className="flex flex-col gap-2 pb-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4">
          <div
            className="h-2 animate-pulse rounded bg-muted"
            style={{ width: `${32 + (i % 3) * 12}%` }}
          />
          <div
            className="h-2 animate-pulse rounded bg-muted"
            style={{ width: `${20 + (i % 2) * 15}%` }}
          />
        </div>
      ))}
    </div>
  </div>
);

// ─── Error state ───────────────────────────────────────────────────────────────

const ErrorOutput = ({ error }: { error: string }) => (
  <div className="flex h-full flex-col">
    <div className="flex w-full items-start gap-3 border-b border-destructive/20 bg-destructive/10 px-4 py-3">
      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-destructive">Node failed</p>
        <p className="break-words font-mono text-[11px] text-destructive/80">{error}</p>
      </div>
    </div>
    <p className="px-4 py-3 text-[11px] text-muted-foreground">
      Fix the error above and click Test Step again.
    </p>
  </div>
);

// ─── Empty state ───────────────────────────────────────────────────────────────

const EmptyOutput = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3">
    <div className="rounded-md border border-border bg-secondary p-2">
      <Terminal className="size-4 text-muted-foreground" />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-xs font-medium text-foreground">No output yet</p>
      <p className="text-xs text-muted-foreground">
        Hit Run to execute this node individually
      </p>
    </div>
  </div>
);

// ─── Output display ────────────────────────────────────────────────────────────

const OutputDisplay = ({ output }: { output: NodeExecutionOutput }) => {
  const rows = flattenOutput(output.output);

  return (
    <div className="flex flex-col">
      <OutputSection title="Other info" defaultOpen>
        <OutputRow label="Variable" value={`{{${output.variableName}}}`} mono />
        <OutputRow
          label="Time"
          value={output.executedAt.toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "medium",
          })}
        />
      </OutputSection>

      <OutputSection title="Output" defaultOpen>
        {rows.length > 0 ? (
          rows.map((row) => (
            <OutputRow
              key={row.key}
              label={row.key}
              value={row.value}
              mono={row.mono}
            />
          ))
        ) : (
          <p className="px-4 py-2 text-[11px] text-muted-foreground">
            No output data
          </p>
        )}
      </OutputSection>

      <OutputSection title="Raw JSON">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-2 font-mono text-[10px] leading-relaxed text-foreground">
          {JSON.stringify(output.output, null, 2)}
        </pre>
      </OutputSection>
    </div>
  );
};

// ─── Output Section ────────────────────────────────────────────────────────────

const OutputSection = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="shrink-0 text-muted-foreground">
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </span>
        <span className="text-xs font-medium text-foreground">{title}</span>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
};

// ─── Output Row ────────────────────────────────────────────────────────────────

const OutputRow = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="flex items-start justify-between px-4 py-1">
    <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
    <span
      className={`ml-4 max-w-[55%] break-words text-right text-[11px] text-foreground ${
        mono ? "font-mono" : ""
      }`}
    >
      {value}
    </span>
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenOutput(
  output: unknown,
  prefix = "",
  depth = 0,
): { key: string; value: string; mono: boolean }[] {
  if (output === null || output === undefined) return [];

  if (
    typeof output === "string" ||
    typeof output === "number" ||
    typeof output === "boolean"
  ) {
    return [
      {
        key: prefix || "value",
        value: String(output),
        mono: typeof output === "number",
      },
    ];
  }

  if (typeof output === "object" && depth < 3) {
    const entries = Array.isArray(output)
      ? output.map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(output as Record<string, unknown>);

    return entries.flatMap(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && v !== null && depth < 2) {
        return flattenOutput(v, key, depth + 1);
      }
      return [
        {
          key,
          value:
            typeof v === "object"
              ? JSON.stringify(v).slice(0, 80) +
                (JSON.stringify(v).length > 80 ? "…" : "")
              : String(v ?? ""),
          mono: typeof v === "number",
        },
      ];
    });
  }

  return [
    {
      key: prefix || "value",
      value: JSON.stringify(output).slice(0, 120),
      mono: true,
    },
  ];
}
