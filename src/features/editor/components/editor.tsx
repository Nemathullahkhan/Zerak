// src/features/editor/components/editor.tsx
"use client";

import { ErrorView, LoadingView } from "@/components/entity-components";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeComponents } from "@/config/node-components";
import { NodeType } from "@/generated/prisma/enums";
import { useAtomValue, useSetAtom } from "jotai";
import { AddNodeButton } from "./add-node-button";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
import { NodeExecutionLayout } from "./node-execution-layout";
import { editorAtom, executionSidebarOpenAtom } from "../store/atoms";
import { ExecutionSidebar } from "@/features/executions/components/execution-sidebar";

// ─── Context ──────────────────────────────────────────────────────────────────

type EditorNodesContextValue = {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
};

const EditorNodesContext = createContext<EditorNodesContextValue | null>(null);

export function useEditorNodes() {
  return useContext(EditorNodesContext);
}

export const EditorLoading = () => <LoadingView message="Loading editor..." />;
export const EditorError = () => <ErrorView message="Failed to load editor." />;

// ─── Editor ───────────────────────────────────────────────────────────────────

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const setEditor = useSetAtom(editorAtom);
  const activeNode = useAtomValue(activeNodeAtom);
  const sidebarOpen = useAtomValue(executionSidebarOpenAtom);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(workflow.edges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((prev) => applyNodeChanges(changes, prev)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((prev) => applyEdgeChanges(changes, prev)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((prev) => addEdge(params, prev)),
    [],
  );

  const hasManualTrigger = useMemo(
    () => nodes.some((n) => n.type === NodeType.MANUAL_TRIGGER),
    [nodes],
  );

  return (
    <div className="size-full">
      <EditorNodesContext.Provider value={{ setNodes, setEdges }}>

        {activeNode && <NodeExecutionLayout workflowId={workflowId} />}

        <div className={activeNode ? "invisible size-full" : "size-full"}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeComponents}
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
            onInit={setEditor}
            fitView
            snapGrid={[10, 10]}
            snapToGrid
            panOnScroll
            panOnDrag={false}
            selectionOnDrag
          >
            <Background />
            <Controls />
            <Panel position="top-right">
              <AddNodeButton />
            </Panel>
            {hasManualTrigger && (
              <Panel 
                position="bottom-center"
                style={{ paddingRight: sidebarOpen ? "380px" : undefined, transition: "padding-right 200ms ease" }}
              >
                <ExecuteWorkflowButton workflowId={workflowId} />
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Sidebar — fixed positioned, outside ReactFlow */}
        <ExecutionSidebar workflowId={workflowId} />
      </EditorNodesContext.Provider>
    </div>
  );
};