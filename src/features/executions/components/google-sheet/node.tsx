import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleSheetsRealtimeToken } from "./actions";
import { GOOGLE_SHEETS_CHANNEL_NAME } from "@/app/inngest/channels/google-sheets";
import { GoogleSheetsFormFields, type GoogleSheetsFormValues } from "./dialog";

type GoogleSheetsNodeData = {
  variableName?: string;
  action?: string;
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
  data?: string;
  newSheetName?: string;
  spreadsheetTitle?: string;
  batchOperations?: string;
};

type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>;

export const GoogleSheetsNode = memo(
  (props: NodeProps<GoogleSheetsNodeType>) => {
    const setActiveNode = useSetAtom(activeNodeAtom);
    const { setNodes } = useReactFlow();
    const { portal } = useNodeFormPortal(props.id);
    const { execute, isRunning, error } = useExecuteNode();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_SHEETS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleSheetsRealtimeToken,
    });

    const handleSubmit = useCallback(
      (values: GoogleSheetsFormValues) => {
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

    const handleRun = useCallback(() => {
      execute({
        nodeId: props.id,
        nodeType: props.type ?? "GOOGLE_SHEETS",
        data: props.data as Record<string, unknown>,
      });
    }, [props.id, props.type, props.data, execute]);

    const handleOpen = useCallback(() => {
      setActiveNode({
        id: props.id,
        type: props.type ?? "GOOGLE_SHEETS",
        data: props.data as Record<string, unknown>,
      });
    }, [props.id, props.type, props.data, setActiveNode]);

    const description = props.data?.sheetName
      ? `${props.data.action || "append"} on ${props.data.sheetName}`
      : props.data?.action === "create_spreadsheet"
        ? "Create spreadsheet"
        : "Not configured";

    return (
      <>
        {portal(
          <NodeFormShell onRun={handleRun} isRunning={isRunning} error={error}>
            <GoogleSheetsFormFields
              onSubmit={handleSubmit}
              defaultValues={props.data}
              showSave={true}
            />
          </NodeFormShell>,
        )}

        <BaseExecutionNode
          {...props}
          icon="/logos/google-sheets.svg"
          name="Google Sheets"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  },
);

GoogleSheetsNode.displayName = "GoogleSheetsNode";
