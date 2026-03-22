// src/features/editor/store/node-execution-atoms.ts

import { atom } from "jotai";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeExecutionData = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type NodeExecutionOutput = {
  nodeId: string;
  variableName: string;
  output: unknown;
  executedAt: Date;
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

// null = canvas visible | set = NodeExecutionLayout visible
export const activeNodeAtom = atom<NodeExecutionData | null>(null);

// Output from the most recent individual node RUN
// TODO: populated by useExecuteNode hook (Step 3)
export const nodeExecutionOutputAtom = atom<NodeExecutionOutput | null>(null);

// All previous node outputs from last full workflow run
// TODO: populated from last Execution record (Step 3)
export const executionContextAtom = atom<NodeExecutionOutput[]>([]);
