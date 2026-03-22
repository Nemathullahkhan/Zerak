// src/features/editor/hooks/use-node-form-portal.tsx
"use client";

import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useAtomValue } from "jotai";
import { useLayoutEffect, useState } from "react";
import ReactDOM from "react-dom";
import { NODE_FORM_SLOT_ID } from "../components/node-execution-layout";

// ─── Hook ─────────────────────────────────────────────────────────────────────
//
// Every node.tsx calls this hook. When the node is active, `portal()` renders
// its content into the layout's middle column slot via a React portal.
// When inactive — zero overhead, returns null immediately.
//
// Usage:
//   const { isActive, portal } = useNodeFormPortal(props.id);
//
//   return (
//     <>
//       {portal(<MyForm ... />)}
//       <BaseExecutionNode ... />
//     </>
//   );

interface UseNodeFormPortalReturn {
  isActive: boolean;
  portal: (content: React.ReactNode) => React.ReactPortal | null;
}

export const useNodeFormPortal = (nodeId: string): UseNodeFormPortalReturn => {
  const activeNode = useAtomValue(activeNodeAtom);
  const isActive = activeNode?.id === nodeId;

  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!isActive) {
      setSlotElement(null);
      return;
    }

    // Slot is rendered by NodeExecutionLayout synchronously when activeNode
    // is set — useLayoutEffect fires after paint so it will exist already
    const el = document.getElementById(NODE_FORM_SLOT_ID);
    if (el) {
      setSlotElement(el);
      return;
    }

    // Fallback poll in case layout paint is delayed
    const interval = setInterval(() => {
      const found = document.getElementById(NODE_FORM_SLOT_ID);
      if (found) {
        setSlotElement(found);
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isActive]);

  const portal = (content: React.ReactNode): React.ReactPortal | null => {
    if (!isActive || !slotElement) return null;
    return ReactDOM.createPortal(content, slotElement);
  };

  return { isActive, portal };
};
