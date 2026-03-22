// src/features/executions/hooks/use-execute-node.ts
"use client";

import {
  executionContextAtom,
  nodeExecutionOutputAtom,
  type NodeExecutionOutput,
} from "@/features/editor/store/node-execution-atoms";
import { NodeType } from "@/generated/prisma/enums";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecuteNodeParams {
  nodeId: string;
  nodeType: string;
  data: Record<string, unknown>;
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
  const executionContext = useAtomValue(executionContextAtom);

  // Matches the exact pattern used in useExecuteWorkflow / useCreateWorkflow
  const { mutateAsync, isPending } = useMutation(
    trpc.executions.executeNode.mutationOptions({
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const execute = useCallback(
    async ({ nodeId, nodeType, data }: ExecuteNodeParams) => {
      setError(null);

      if (!(Object.values(NodeType) as string[]).includes(nodeType)) {
        setError(`Unknown node type: ${nodeType}`);
        return;
      }

      try {
        // Build context from left column chips (previous node outputs)
        const context = executionContext.reduce<Record<string, unknown>>(
          (acc, item) => ({ ...acc, [item.variableName]: item.output }),
          {},
        );

        const result = await mutateAsync({
          nodeId,
          nodeType: nodeType as NodeType,
          data,
          context,
        });

        setOutput({
          nodeId,
          variableName: result.variableName,
          output: result.output,
          executedAt: new Date(),
        } satisfies NodeExecutionOutput);
      } catch (err) {
        // onError above handles toast/state — this catch prevents unhandled
        // promise rejection from mutateAsync re-throwing
        console.error("[useExecuteNode]", err);
      }
    },
    [executionContext, setOutput, mutateAsync],
  );

  return {
    execute,
    isRunning: isPending,
    error,
  };
};
