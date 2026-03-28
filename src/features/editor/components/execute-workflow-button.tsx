import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";
import { useSetAtom } from "jotai";
import { executionSidebarOpenAtom } from "../store/atoms";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const setExecutionSidebarOpen = useSetAtom(executionSidebarOpenAtom);

  const handleExecute = () => {
    executeWorkflow.mutate({ id: workflowId });
    setExecutionSidebarOpen(true);
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
