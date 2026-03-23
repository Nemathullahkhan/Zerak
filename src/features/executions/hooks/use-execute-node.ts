"use client";

import {
  activeNodeAtom,
  executionContextAtom,
  isExecutingAtom,
  nodeExecutionOutputAtom,
  type NodeExecutionOutput,
} from "@/features/editor/store/node-execution-atoms";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecuteNodeParams {
  nodeId: string;
}

interface UseExecuteNodeReturn {
  execute: (params: ExecuteNodeParams) => Promise<void>;
  isRunning: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useExecuteNode = (): UseExecuteNodeReturn => {
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const setOutput = useSetAtom(nodeExecutionOutputAtom);
  const setExecutionContext = useSetAtom(executionContextAtom);
  const executionContext = useAtomValue(executionContextAtom);
  const setIsExecuting = useSetAtom(isExecutingAtom);

  // Read workflowId from the URL — always present on the editor page.
  // This avoids threading it through props or storing it in the atom.
  const params = useParams();
  const workflowId = params.workflowId as string;

  const { mutateAsync, isPending } = useMutation(
    trpc.executions.executeNode.mutationOptions({
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const execute = useCallback(
    async ({ nodeId }: ExecuteNodeParams) => {
      setError(null);
      setIsExecuting(true);

      try {
        // Only pass top-level entries (no dots) — dot-notation rows are display
        // helpers and must NOT be passed as context keys or they'll overwrite
        // the parent object with a primitive in atomOutputsToContext().
        const contextOutputs = executionContext
          .filter((o) => !o.variableName.includes("."))
          .map((o) => ({ variableName: o.variableName, output: o.output }));

        const result = await mutateAsync({
          nodeId,
          workflowId,
          contextOutputs,
        });

        const newOutput: NodeExecutionOutput = {
          nodeId,
          variableName: result.variableName,
          output: result.output,
          executedAt: new Date(),
        };

        // Update the right panel (OutputPanel).
        setOutput(newOutput);

        // Merge result back into executionContextAtom so downstream Test Step
        // clicks see this node's fresh output instead of stale full-run data.
        setExecutionContext((prev) => {
          const exists = prev.some(
            (o) => o.variableName === result.variableName,
          );
          return exists
            ? prev.map((o) =>
                o.variableName === result.variableName ? newOutput : o,
              )
            : [...prev, newOutput];
        });
      } catch (err) {
        // Write a failed output so the right panel shows the error instead of
        // going blank. The error string comes from the tRPC error message.
        const errorMessage =
          err instanceof Error ? err.message : String(err);
        const failedOutput: NodeExecutionOutput = {
          nodeId,
          variableName: "__error__",
          output: null,
          executedAt: new Date(),
          error: errorMessage,
        };
        setOutput(failedOutput);
      } finally {
        // Always clear — success or error
        setIsExecuting(false);
      }
    },
    [
      workflowId,
      executionContext,
      setOutput,
      setExecutionContext,
      setIsExecuting,
      mutateAsync,
    ],
  );

  return {
    execute,
    isRunning: isPending,
    error,
  };
};
