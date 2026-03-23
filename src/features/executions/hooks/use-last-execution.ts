"use client";

import { executionContextAtom } from "@/features/editor/store/node-execution-atoms";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

// ─── Hook ─────────────────────────────────────────────────────────────────────
//
// Fetches the last completed execution for a workflow and writes its outputs
// into executionContextAtom so that "Test Step" passes correct context to
// downstream executors.
//
// The router (getLastForWorkflow) already builds groups with the correct node
// names and types by joining execution.output with workflow.nodes. This hook
// is a thin consumer — it does not parse or transform the output itself.
//
// Shape written to executionContextAtom:
//   [{ variableName: "aiNewsContent", output: { httpResponse: {...} } }, ...]
//
// Only root-level entries (no dots) are written. The router also includes
// dot-notation child rows (e.g. "aiNewsContent.httpResponse") for display in
// the panel, but those are filtered out here so that atomOutputsToContext()
// in the router produces a clean nested context object without collisions.

export const useLastExecution = (workflowId: string) => {
  const trpc = useTRPC();
  const setExecutionContext = useSetAtom(executionContextAtom);

  const query = useQuery(
    trpc.executions.getLastForWorkflow.queryOptions({ workflowId }),
  );

  useEffect(() => {
    if (!query.data) return;

    // Merge DB data INTO the atom — don't overwrite it.
    // Test step results (written by useExecuteNode) are fresher than DB data.
    // We only backfill variables that the atom doesn't already have.
    setExecutionContext((prev) => {
      const existingVars = new Set(prev.map((o) => o.variableName));

      const dbOutputs = query.data!.groups.flatMap((group) =>
        group.variables
          .filter(
            (v) =>
              !v.variableName.includes(".") &&
              !existingVars.has(v.variableName),
          )
          .map((v) => ({
            nodeId: v.variableName,
            variableName: v.variableName,
            output: v.output,
            executedAt: new Date(query.data!.startedAt),
          })),
      );

      return [...prev, ...dbOutputs];
    });
  }, [query.data, setExecutionContext]);

  return query;
};