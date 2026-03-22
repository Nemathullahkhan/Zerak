// // src/features/editor/components/node-execution-layout.tsx
// "use client";

// import { Button } from "@/components/ui/button";
// import {
//   activeNodeAtom,
//   nodeExecutionOutputAtom,
// } from "@/features/editor/store/node-execution-atoms";
// import { useAtom, useAtomValue } from "jotai";
// import { ArrowLeft } from "lucide-react";
// import { useCallback } from "react";
// import { ExecutionContextPanel } from "./execution-context-panel";
// import { OutputPanel } from "./output-panel";

// export const NODE_FORM_SLOT_ID = "zerak-node-form-slot";

// interface NodeExecutionLayoutProps {
//   workflowId: string;
// }

// export const NodeExecutionLayout = ({ workflowId }: NodeExecutionLayoutProps) => {
//   const [activeNode, setActiveNode] = useAtom(activeNodeAtom);
//   const executionOutput = useAtomValue(nodeExecutionOutputAtom);

//   const handleBack = useCallback(() => setActiveNode(null), [setActiveNode]);

//   if (!activeNode) return null;

//   const nodeLabel = activeNode.data?.variableName
//     ? `${formatNodeType(activeNode.type)} — ${activeNode.data.variableName as string}`
//     : formatNodeType(activeNode.type);

//   return (
//     <div className="fixed inset-0 z-50 flex flex-col bg-background">

//       {/* ── Header ─────────────────────────────────────────────────────── */}
//       <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-3">
//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={handleBack}
//           className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
//         >
//           <ArrowLeft className="size-3.5" />
//           Back
//         </Button>

//         <div className="h-4 w-px bg-border" />

//         <div className="flex items-center gap-2">
//           <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
//             {activeNode.type}
//           </span>
//           {activeNode.data?.variableName && (
//             <>
//               <span className="text-xs text-muted-foreground">·</span>
//               <span className="text-xs font-medium text-foreground">
//                 {activeNode.data.variableName as string}
//               </span>
//             </>
//           )}
//         </div>
//       </header>

//       {/* ── Three-column body ───────────────────────────────────────────── */}
//       <div className="flex flex-1 overflow-hidden">

//         {/* Left — execution context (33%) */}
//         <aside className="flex w-1/3 shrink-0 flex-col overflow-hidden border-r border-border">
//           <ExecutionContextPanel workflowId={workflowId} />
//         </aside>

//         {/* Middle — node form portal target (33%) */}
//         <main
//           id={NODE_FORM_SLOT_ID}
//           className="flex w-1/3 shrink-0 flex-col overflow-hidden border-r border-border"
//         />

//         {/* Right — output + chat (33%) */}
//         <aside className="flex w-1/3 shrink-0 flex-col overflow-hidden">
//           <OutputPanel output={executionOutput} />
//         </aside>

//       </div>
//     </div>
//   );
// };

// function formatNodeType(type: string): string {
//   return type
//     .toLowerCase()
//     .replace(/_/g, " ")
//     .replace(/^\w/, (c) => c.toUpperCase());
// }

// src/features/editor/components/node-execution-layout.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  activeNodeAtom,
  nodeExecutionOutputAtom,
} from "@/features/editor/store/node-execution-atoms";
import { useAtom, useAtomValue } from "jotai";
import { ArrowLeft } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ExecutionContextPanel } from "./execution-context-panel";
import { OutputPanel } from "./output-panel";

export const NODE_FORM_SLOT_ID = "zerak-node-form-slot";

interface NodeExecutionLayoutProps {
  workflowId: string;
}

export const NodeExecutionLayout = ({
  workflowId,
}: NodeExecutionLayoutProps) => {
  const [activeNode, setActiveNode] = useAtom(activeNodeAtom);
  const executionOutput = useAtomValue(nodeExecutionOutputAtom);
  const [isDragOver, setIsDragOver] = useState(false);
  const middleRef = useRef<HTMLDivElement>(null);

  const handleBack = useCallback(() => setActiveNode(null), [setActiveNode]);

  // ── Drop zone handlers for middle column ───────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only highlight if carrying a zerak variable
    if (e.dataTransfer.types.includes("application/zerak-variable")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column itself (not a child)
    if (!middleRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const variableRef = e.dataTransfer.getData("text/plain");
    if (!variableRef) return;

    // Find the focused / active input or textarea inside the middle column
    // and insert the variable ref at the cursor position.
    const slot = document.getElementById(NODE_FORM_SLOT_ID);
    if (!slot) return;

    const active = document.activeElement as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (
      active &&
      (active.tagName === "INPUT" || active.tagName === "TEXTAREA") &&
      slot.contains(active)
    ) {
      insertAtCursor(active, variableRef);
      return;
    }

    // Fallback: dispatch the existing insert-variable event so node forms
    // can listen and handle it themselves.
    document.dispatchEvent(
      new CustomEvent("zerak:insert-variable", {
        detail: { ref: variableRef },
      }),
    );
  }, []);

  if (!activeNode) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Button>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {activeNode.type}
          </span>
          {activeNode.data?.variableName && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-medium text-foreground">
                {activeNode.data.variableName as string}
              </span>
            </>
          )}
        </div>
      </header>

      {/* ── Three-column body ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — execution context (33%) */}
        <aside className="flex w-1/3 shrink-0 flex-col overflow-hidden border-r border-border">
          <ExecutionContextPanel workflowId={workflowId} />
        </aside>

        {/* Middle — node form portal target (33%) with drop zone overlay */}
        <main
          ref={middleRef}
          id={NODE_FORM_SLOT_ID}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex w-1/3 shrink-0 flex-col overflow-hidden border-r border-border transition-colors ${
            isDragOver ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
          }`}
        >
          {/* Drop-zone highlight indicator */}
          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-lg border border-dashed border-primary/50 bg-primary/10 px-4 py-2">
                <p className="text-xs font-medium text-primary">
                  Drop to insert variable
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right — output + chat (33%) */}
        <aside className="flex w-1/3 shrink-0 flex-col overflow-hidden">
          <OutputPanel output={executionOutput} />
        </aside>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Inserts text at the cursor position inside an input / textarea,
 * then dispatches a native input event so React's synthetic event
 * system (and controlled inputs) picks up the change.
 */
function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);

  // Use execCommand for full undo-stack support when available
  if (document.queryCommandSupported?.("insertText")) {
    el.focus();
    document.execCommand("insertText", false, text);
    return;
  }

  // Fallback: direct value mutation + synthetic event
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    "value",
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, before + text + after);
  } else {
    el.value = before + text + after;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));

  // Restore cursor after inserted text
  const newPos = start + text.length;
  el.setSelectionRange(newPos, newPos);
}
