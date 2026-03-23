"use client";

import { useLastExecution } from "@/features/executions/hooks/use-last-execution";
import { executionContextAtom } from "@/features/editor/store/node-execution-atoms";
import {
  ChevronDown,
  ChevronRight,
  Database,
  GripVertical,
  Loader2,
  Hash,
  AlignLeft,
  Braces,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useAtomValue } from "jotai";

interface ExecutionContextPanelProps {
  workflowId: string;
}

export const ExecutionContextPanel = ({
  workflowId,
}: ExecutionContextPanelProps) => {
  const { data, isLoading } = useLastExecution(workflowId);
  const atomOutputs = useAtomValue(executionContextAtom);

  // Merge atom (test step) outputs on top of DB groups.
  // Priority: atom data wins over stale DB data for the same variableName.
  // Variables only in the atom (no full run yet) appear as a "Test run" group.
  const mergedGroups = useMemo(() => {
    // Start from DB groups (deep-cloned so we can mutate safely)
    const groups: Group[] = (data?.groups ?? []).map((g) => ({
      ...g,
      variables: g.variables.map((v) => ({ ...v })),
    }));

    // Only root-level atom entries (no dots) carry actual node outputs
    const rootAtomOutputs = atomOutputs.filter(
      (o) => !o.variableName.includes("."),
    );

    const unmatched: typeof rootAtomOutputs = [];

    for (const atomEntry of rootAtomOutputs) {
      // Try to find an existing group whose root variable matches
      let matched = false;
      for (const group of groups) {
        const rootVar = group.variables.find(
          (v) =>
            v.variableName === atomEntry.variableName ||
            v.variableName === atomEntry.variableName.split(".")[0],
        );
        if (rootVar) {
          // Override the output with the fresher atom version
          rootVar.output = atomEntry.output;
          // Also update any dot-notation children to reflect fresh data
          if (
            atomEntry.output !== null &&
            typeof atomEntry.output === "object" &&
            !Array.isArray(atomEntry.output)
          ) {
            const childPrefix = `${atomEntry.variableName}.`;
            const freshObj = atomEntry.output as Record<string, unknown>;
            // Remove stale children, rebuild from fresh output
            const nonChildren = group.variables.filter(
              (v) => !v.variableName.startsWith(childPrefix),
            );
            const freshChildren = Object.entries(freshObj).map(([k, v]) => ({
              variableName: `${atomEntry.variableName}.${k}`,
              output: v,
            }));
            group.variables = [...nonChildren, ...freshChildren];
          }
          matched = true;
          break;
        }
      }
      if (!matched) unmatched.push(atomEntry);
    }

    // Variables from test steps that have no DB group yet → one combined group
    if (unmatched.length > 0) {
      const variables: Group["variables"] = [];
      for (const entry of unmatched) {
        variables.push({ variableName: entry.variableName, output: entry.output });
        // Add dot-notation children if the output is an object
        if (
          entry.output !== null &&
          typeof entry.output === "object" &&
          !Array.isArray(entry.output)
        ) {
          for (const [k, v] of Object.entries(
            entry.output as Record<string, unknown>,
          )) {
            variables.push({
              variableName: `${entry.variableName}.${k}`,
              output: v,
            });
          }
        }
      }
      groups.push({
        nodeName: "Test run",
        nodeType: "UNKNOWN",
        variables,
      });
    }

    return groups;
  }, [data, atomOutputs]);

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Input
          </span>
        </div>

        <div className="flex items-center gap-1">
          {mergedGroups.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {mergedGroups.length} item{mergedGroups.length !== 1 ? "s" : ""}
            </span>
          )}
          {data && (
            <span
              className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                data.status === "SUCCESS"
                  ? "border-green-800/30 bg-green-900/20 text-green-400"
                  : "border-red-800/30 bg-red-900/20 text-red-400"
              }`}
            >
              {data.status}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : mergedGroups.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {mergedGroups.map((group, index) => (
              <NodeGroup
                key={group.nodeName}
                group={group}
                defaultOpen={index === 0}
              />
            ))}
          </>
        )}

        {/* Placeholder */}
        <div className="mx-4 my-3 rounded-lg border border-dashed border-border px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            More context sources coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Node Group ───────────────────────────────────────────────────────────────

type Group = {
  nodeName: string;
  nodeType: string;
  variables: { variableName: string; output: unknown }[];
};

const NODE_TYPE_ICONS: Record<string, string> = {
  ANTHROPIC: "🤖",
  OPENAI: "🤖",
  GEMINI: "🤖",
  GMAIL: "📧",
  SLACK: "💬",
  DISCORD: "💬",
  HTTP_REQUEST: "🌐",
  GOOGLE_FORM_TRIGGER: "📋",
  STRIPE_TRIGGER: "💳",
  MANUAL_TRIGGER: "▶️",
  CONTENT_SOURCE: "📄",
  IF: "🔀",
  SWITCH: "🔀",
  CODE: "</>",
};

const NodeGroup = ({
  group,
  defaultOpen,
}: {
  group: Group;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const itemCount = group.variables.length;

  const icon = NODE_TYPE_ICONS[group.nodeType.toUpperCase()] ?? "{}";

  return (
    <div className="border-b border-border">
      {/* Group header row — clickable to expand */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary/40"
      >
        {/* Collapse arrow */}
        <span className="shrink-0 text-muted-foreground">
          {isOpen ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </span>

        {/* Node icon */}
        <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-secondary text-[10px]">
          {icon}
        </span>

        {/* Node name */}
        <span className="flex-1 truncate text-xs font-medium text-foreground">
          {group.nodeName}
        </span>

        {/* Item count */}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Variables — shown when expanded */}
      {isOpen && (
        <div className="pb-1">
          {group.variables.map((v) => (
            <VariableRow
              key={v.variableName}
              variableName={v.variableName}
              output={v.output}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Variable Row ─────────────────────────────────────────────────────────────

const VariableRow = ({
  variableName,
  output,
}: {
  variableName: string;
  output: unknown;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isObject = output !== null && typeof output === "object";
  const isLongString = typeof output === "string" && output.length > 60;
  const isExpandable = isObject || isLongString;

  // Dispatch insert event (existing chip click behavior)
  const handleClick = useCallback(() => {
    if (isExpandable) {
      setIsExpanded((e) => !e);
      return;
    }
    // Use {{json ...}} for objects/arrays so Handlebars serialises them correctly
    const ref = isObject ? `{{json ${variableName}}}` : `{{${variableName}}}`;
    document.dispatchEvent(
      new CustomEvent("zerak:insert-variable", {
        detail: { ref },
      }),
    );
  }, [variableName, isExpandable, isObject]);

  // Drag start — carry variable ref as text
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Use {{json ...}} for objects/arrays so Handlebars serialises them correctly
      const ref = isObject ? `{{json ${variableName}}}` : `{{${variableName}}}`;
      e.dataTransfer.setData("text/plain", ref);
      e.dataTransfer.setData(
        "application/zerak-variable",
        JSON.stringify({ ref, value: output }),
      );
      e.dataTransfer.effectAllowed = "copy";
      setIsDragging(true);
    },
    [variableName, output, isObject],
  );

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  const typeIcon = getTypeIcon(output);
  const preview = formatPreview(output);

  return (
    <div
      className={`group relative transition-colors ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Main row */}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className="flex cursor-grab items-start gap-2 px-4 py-1.5 active:cursor-grabbing hover:bg-secondary/30"
      >
        {/* Drag handle — appears on hover */}
        <span className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-40">
          <GripVertical className="size-3 text-muted-foreground" />
        </span>

        {/* Type icon */}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {typeIcon}
        </span>

        {/* Variable name */}
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {variableName}
        </span>

        {/* Value preview */}
        <span className="ml-2 max-w-[140px] truncate text-[11px] text-foreground">
          {preview}
        </span>

        {/* Expand toggle for objects/long strings */}
        {isExpandable && (
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </span>
        )}
      </div>

      {/* Expanded view for objects */}
      {isExpanded && isObject && (
        <ObjectTree
          value={output as Record<string, unknown>}
          parentKey={variableName}
          depth={1}
        />
      )}

      {/* Expanded view for long strings */}
      {isExpanded && isLongString && (
        <div className="mx-4 mb-2 rounded border border-border bg-secondary/40 px-3 py-2">
          <p className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-foreground">
            {output as string}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Object Tree (nested expand) ─────────────────────────────────────────────

const ObjectTree = ({
  value,
  parentKey,
  depth,
}: {
  value: Record<string, unknown> | unknown[];
  parentKey: string;
  depth: number;
}) => {
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value);

  return (
    <div style={{ paddingLeft: `${depth * 16 + 32}px` }} className="pb-1 pr-4">
      {entries.map(([key, val]) => (
        <ObjectLeaf
          key={key}
          fieldKey={key}
          value={val}
          parentVariableName={parentKey}
          depth={depth}
        />
      ))}
    </div>
  );
};

const ObjectLeaf = ({
  fieldKey,
  value,
  parentVariableName,
  depth,
}: {
  fieldKey: string;
  value: unknown;
  parentVariableName: string;
  depth: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isObject = value !== null && typeof value === "object";
  const fullKey = `${parentVariableName}.${fieldKey}`;
  const typeIcon = getTypeIcon(value);
  const preview = formatPreview(value);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      // Use {{json ...}} for objects/arrays so Handlebars serialises them correctly
      const ref = isObject ? `{{json ${fullKey}}}` : `{{${fullKey}}}`;
      e.dataTransfer.setData("text/plain", ref);
      e.dataTransfer.setData(
        "application/zerak-variable",
        JSON.stringify({ ref, value }),
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    [fullKey, value, isObject],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isObject) {
        setIsExpanded((x) => !x);
        return;
      }
      const ref = `{{${fullKey}}}`;
      document.dispatchEvent(
        new CustomEvent("zerak:insert-variable", {
          detail: { ref },
        }),
      );
    },
    [isObject, fullKey],
  );

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        className="group flex cursor-grab items-center gap-2 rounded py-1 active:cursor-grabbing hover:bg-secondary/30"
      >
        <span className="shrink-0 text-muted-foreground">{typeIcon}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {fieldKey}
        </span>
        <span className="flex-1 truncate text-[10px] text-foreground">
          {preview}
        </span>
        {isObject && (
          <span className="shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </span>
        )}
      </div>

      {isExpanded && isObject && depth < 4 && (
        <ObjectTree
          value={value as Record<string, unknown>}
          parentKey={fullKey}
          depth={depth + 1}
        />
      )}
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border mx-4 my-4 px-4 py-8 text-center">
    <div className="rounded-md border border-border bg-secondary p-2">
      <Database className="size-4 text-muted-foreground" />
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-foreground">No context yet</p>
      <p className="text-xs text-muted-foreground">
        Test a node above, or run the full workflow to populate context
      </p>
    </div>
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeIcon(output: unknown): React.ReactNode {
  if (output === null || output === undefined)
    return <AlignLeft className="size-3" />;
  if (typeof output === "number") return <Hash className="size-3" />;
  if (typeof output === "object") return <Braces className="size-3" />;
  // string / boolean / etc
  return <AlignLeft className="size-3" />;
}

function formatPreview(output: unknown): string {
  if (output === null || output === undefined) return "";
  if (typeof output === "string") {
    return output.length > 50 ? output.slice(0, 50) + "…" : output;
  }
  if (Array.isArray(output)) return `[${output.length} items]`;
  if (typeof output === "object") {
    const keys = Object.keys(output as object);
    return keys.slice(0, 3).join(", ") + (keys.length > 3 ? "…" : "");
  }
  return String(output);
}
