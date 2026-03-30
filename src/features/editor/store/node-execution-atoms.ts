import { atom } from "jotai";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeExecutionData = {
  id: string;
  type: string;
  workflowId: string;
  data: Record<string, unknown>;
};

export type NodeExecutionOutput = {
  nodeId: string;
  variableName: string;
  output: unknown;
  executedAt: Date;
  /** Set when the test step failed — output will be null/undefined */
  error?: string;
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

// null = canvas visible | set = NodeExecutionLayout visible
export const activeNodeAtom = atom<NodeExecutionData | null>(null);

// Output from the most recent individual node test run
export const nodeExecutionOutputAtom = atom<NodeExecutionOutput | null>(null);

// All previous node outputs from last full workflow run
export const executionContextAtom = atom<NodeExecutionOutput[]>([]);

// The current workflow execution being inspected in the sidebar
export const currentExecutionIdAtom = atom<string | null>(null);

// true if a full workflow execution was just triggered
export const isWorkflowExecutingAtom = atom<boolean>(false);

// true while the executeNode tRPC mutation is in-flight (drives OutputPanel skeleton)
export const isExecutingAtom = atom<boolean>(false);

// true while the saveNode tRPC mutation is in-flight (drives SaveIndicator in OutputPanel header)
export const isSavingAtom = atom<boolean>(false);
