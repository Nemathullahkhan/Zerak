// src/features/executions/hooks/use-last-execution.ts
"use client";

import { executionContextAtom } from "@/features/editor/store/node-execution-atoms";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

// ─── Hook ─────────────────────────────────────────────────────────────────────
//
// Fetches the last SUCCESS or FAILED execution for a workflow and
// writes its variables into executionContextAtom for the left column.

export const useLastExecution = (workflowId: string) => {
  const trpc = useTRPC();
  const setExecutionContext = useSetAtom(executionContextAtom);

  const query = useQuery(
    trpc.executions.getLastForWorkflow.queryOptions({ workflowId }),
  );

  // Flatten all groups into NodeExecutionOutput[] for the atom
  useEffect(() => {
    if (!query.data) return;

    const outputs = query.data.groups.flatMap((group) =>
      group.variables.map((v) => ({
        nodeId: v.variableName, // use variableName as stable id
        variableName: v.variableName,
        output: v.output,
        executedAt: new Date(query.data!.startedAt),
      })),
    );

    setExecutionContext(outputs);
  }, [query.data, setExecutionContext]);

  return query;
};
