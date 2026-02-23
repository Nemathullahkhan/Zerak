import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";
import React from "react";

export const editorAtom = atom<ReactFlowInstance | null>(null);

