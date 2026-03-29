"use client";

import { Button } from "@/components/ui/button";
import {
  activeNodeAtom,
  isExecutingAtom,
  isSavingAtom,
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
  const isExecuting = useAtomValue(isExecutingAtom);
  const isSaving = useAtomValue(isSavingAtom);
  const [isDragOver, setIsDragOver] = useState(false);
  const middleRef = useRef<HTMLDivElement>(null);

  const handleBack = useCallback(() => setActiveNode(null), [setActiveNode]);

  // ── Drop zone handlers ─────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/zerak-variable")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!middleRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const variableRef = e.dataTransfer.getData("text/plain");
    if (!variableRef) return;

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
      {/* // TODO - Add Adjustable View for three sections */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — execution context (33%) */}
        <aside className="flex w-1/3 shrink-0 flex-col overflow-hidden border-r border-border">
          <ExecutionContextPanel workflowId={workflowId} />
        </aside>

        {/* Middle — node form portal target (33%) */}
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
          <OutputPanel
            output={executionOutput}
            activeNodeId={activeNode.id}
            isExecuting={isExecuting}
            isSaving={isSaving}
          />
        </aside>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);

  if (document.queryCommandSupported?.("insertText")) {
    el.focus();
    document.execCommand("insertText", false, text);
    return;
  }

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

  const newPos = start + text.length;
  el.setSelectionRange(newPos, newPos);
}
