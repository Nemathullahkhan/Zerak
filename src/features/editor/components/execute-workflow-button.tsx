import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";
import { useSetAtom } from "jotai";
import { executionSidebarOpenAtom } from "../store/atoms";
import { isWorkflowExecutingAtom } from "../store/node-execution-atoms";

export const ExecuteWorkflowButton = ({
  workflowId,
  onExecute,
}: {
  workflowId: string;
  onExecute?: () => void;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const setExecutionSidebarOpen = useSetAtom(executionSidebarOpenAtom);
  const setIsExecuting = useSetAtom(isWorkflowExecutingAtom);

  const handleExecute = () => {
    setIsExecuting(true);
    executeWorkflow.mutate({ id: workflowId });
    setExecutionSidebarOpen(true);
    onExecute?.();
  };
  return (
    <Button
      size="lg"
      onClick={handleExecute}
      disabled={executeWorkflow.isPending}
    >
      <FlaskConicalIcon className="size-4" />
      Execute Workflow
    </Button>
  );
};
