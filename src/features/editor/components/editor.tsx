"use client";

import { ErrorView, LoadingView } from "@/components/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { nodeComponents } from "@/config/node-components";
import { AddNodeButton } from "./add-node-button";
import { useSetAtom } from "jotai";
import { editorAtom } from "../store/atoms";
import { NodeType } from "@/generated/prisma/enums";
import { ExecuteWorkflowButton } from "./execute-workflow-button";

type EditorNodesContextValue = {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
};

const EditorNodesContext = createContext<EditorNodesContextValue | null>(null);

export function useEditorNodes() {
  return useContext(EditorNodesContext);
}

export const EditorLoading = () => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = () => {
  return <ErrorView message="Failed to load editor." />;
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  // Store the editor instance in Jotai atom for global access
  const setEditor = useSetAtom(editorAtom);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(workflow.edges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const hasManualTrigger = useMemo(() => {
    return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
  }, [nodes]);
  return (
    <div className="size-full">
      <EditorNodesContext.Provider value={{ setNodes, setEdges }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeComponents}
          colorMode="dark"
          proOptions={{
            hideAttribution: true,
          }}
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
          {/* <MiniMap /> */}
          <Panel position="top-right">
            <AddNodeButton />
          </Panel>
          {hasManualTrigger && (
            <Panel position="bottom-center">
              <ExecuteWorkflowButton workflowId={workflowId} />
            </Panel>
          )}
        </ReactFlow>
      </EditorNodesContext.Provider>
    </div>
  );
};
