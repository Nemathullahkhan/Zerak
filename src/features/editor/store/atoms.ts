import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

// true = sidebar is open
export const executionSidebarOpenAtom = atom<boolean>(false);
