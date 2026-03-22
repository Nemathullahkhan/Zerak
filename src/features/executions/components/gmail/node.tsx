// // src/features/executions/components/gmail/node.tsx
// "use client";

// import { Button } from "@/components/ui/button";
// import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
// import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
// import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
// import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
// import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
// import { useSetAtom } from "jotai";
// import { Loader2, Play } from "lucide-react";
// import { memo, useCallback } from "react";
// import { useNodeStatus } from "../../hooks/use-node-status";
// import { fetchGmailRealtimeToken } from "./actions";
// import { GMAIL_CHANNEL_NAME } from "@/app/inngest/channels/gmail";
// import { GmailFormFields, type GmailFormValues } from "./dialog";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type GmailNodeData = {
//   variableName?: string;
//   to?: string;
//   subject?: string;
//   body?: string;
// };

// type GmailNodeType = Node<GmailNodeData>;

// // ─── Component ────────────────────────────────────────────────────────────────

// export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
//   const setActiveNode = useSetAtom(activeNodeAtom);
//   const { setNodes } = useReactFlow();
//   const { portal } = useNodeFormPortal(props.id);
//   const { execute, isRunning, error } = useExecuteNode();

//   const nodeStatus = useNodeStatus({
//     nodeId: props.id,
//     channel: GMAIL_CHANNEL_NAME,
//     topic: "status",
//     refreshToken: fetchGmailRealtimeToken,
//   });

//   // Saves form values back into ReactFlow node data — unchanged from original
//   const handleSubmit = useCallback(
//     (values: GmailFormValues) => {
//       setNodes((nodes) =>
//         nodes.map((node) =>
//           node.id === props.id
//             ? { ...node, data: { ...node.data, ...values } }
//             : node,
//         ),
//       );
//     },
//     [props.id, setNodes],
//   );

//   // Executes the node directly using current node data
//   const handleRun = useCallback(() => {
//     execute({
//       nodeId: props.id,
//       nodeType: props.type ?? "GMAIL",
//       data: props.data as Record<string, unknown>,
//     });
//   }, [props.id, props.type, props.data, execute]);

//   const handleOpen = useCallback(() => {
//     setActiveNode({
//       id: props.id,
//       type: props.type ?? "GMAIL",
//       data: props.data as Record<string, unknown>,
//     });
//   }, [props.id, props.type, props.data, setActiveNode]);

//   const description = props.data?.to
//     ? `To: ${props.data.to.length > 30 ? props.data.to.slice(0, 30) + "…" : props.data.to}`
//     : "Not configured";

//   return (
//     <>
//       {portal(
//         <div className="flex h-full flex-col">
//           {/* RUN button — top of middle column */}
//           <div className="border-b border-border p-3">
//             <Button
//               className="w-full gap-2 text-xs"
//               size="sm"
//               disabled={isRunning}
//               onClick={handleRun}
//             >
//               {isRunning ? (
//                 <>
//                   <Loader2 className="size-3 animate-spin" />
//                   Running…
//                 </>
//               ) : (
//                 <>
//                   <Play className="size-3" />
//                   Run node
//                 </>
//               )}
//             </Button>

//             {/* Error state inline below RUN button */}
//             {error && (
//               <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
//                 {error}
//               </p>
//             )}
//           </div>

//           {/* Form fields — portaled directly, no Dialog shell */}
//           <div className="flex-1 overflow-y-auto p-4">
//             <GmailFormFields
//               onSubmit={handleSubmit}
//               defaultValues={props.data}
//               showSave={true}
//             />
//           </div>
//         </div>,
//       )}

//       <BaseExecutionNode
//         {...props}
//         id={props.id}
//         icon="/logos/gmail.svg"
//         name="Gmail"
//         description={description}
//         status={nodeStatus}
//         onSettings={handleOpen}
//         onDoubleClick={handleOpen}
//       />
//     </>
//   );
// });

// GmailNode.displayName = "GmailNode";

// src/features/executions/components/gmail/node.tsx
"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGmailRealtimeToken } from "./actions";
import { GMAIL_CHANNEL_NAME } from "@/app/inngest/channels/gmail";
import { GmailFormFields, type GmailFormValues } from "./dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type GmailNodeData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

type GmailNodeType = Node<GmailNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailRealtimeToken,
  });

  // Saves form values back into ReactFlow node data — unchanged
  const handleSubmit = useCallback(
    (values: GmailFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...values } }
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  // Executes the node directly using current node data — unchanged
  const handleRun = useCallback(() => {
    execute({
      nodeId: props.id,
      nodeType: props.type ?? "GMAIL",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "GMAIL",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, setActiveNode]);

  const description = props.data?.to
    ? `To: ${props.data.to.length > 30 ? props.data.to.slice(0, 30) + "…" : props.data.to}`
    : "Not configured";

  return (
    <>
      {portal(
        // ── ONLY CHANGE: replaced ad-hoc <div> with NodeFormShell ──────────
        // All logic props (isRunning, onRun, error) are passed through
        // unchanged — the shell is pure UI chrome around the same children.
        <NodeFormShell
          icon="/logos/gmail.svg"
          title="Gmail"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <GmailFormFields
            onSubmit={handleSubmit}
            defaultValues={props.data}
            showSave={true}
          />
        </NodeFormShell>,
      )}

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/gmail.svg"
        name="Gmail"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

GmailNode.displayName = "GmailNode";
