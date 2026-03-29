"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";

import { formatDistanceToNow } from "date-fns";
import {
  useCreateWorkflow,
  useCreateWorkflowFromGenerated,
  useGenerateWorkflow,
  useRemoveWorkflow,
  useSuspenseWorkflows,
} from "../hooks/use-workflows";
import { useUpgradeModal } from "@/hooks/use-upgrade-model";
import { useRouter } from "next/navigation";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Workflow } from "@/generated/prisma/client";
import { Loader2Icon, SendIcon, SparklesIcon, WorkflowIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCallback, useRef, useState } from "react";
import { useStreamingStore } from "@/features/editor/store/streaming-store";
import { useReactFlow } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import WorkflowNLP from "@/components/WorkflowNLP";

// export const WorkflowsNLP = () => {
//   const [prompt, setPrompt] = useState("");
//   const generateWorkflow = useGenerateWorkflow();
//   const router = useRouter();

//   const handleGenerate = () => {
//     if (!prompt.trim()) return;
//     generateWorkflow.mutate(
//       { prompt },
//       {
//         onSuccess: (data) => {
//           router.push(`/workflows/${data.id}`);
//         },
//       },
//     );
//   };

//   return (
//     <div className="relative border border-dashed rounded-lg p-6 bg-muted/50 flex flex-col gap-y-4">
//       {generateWorkflow.isPending && (
//         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
//           <Loader2Icon className="size-8 animate-spin text-primary mb-4" />
//           <p className="text-lg font-medium">Generating your workflow...</p>
//           <p className="text-sm text-muted-foreground">
//             Claude is building the structure for you.
//           </p>
//         </div>
//       )}
//       <div className="flex items-center gap-x-2">
//         <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
//           <SparklesIcon className="size-4 text-primary" />
//         </div>
//         <div className="flex flex-col">
//           <h3 className="text-sm font-semibold">AI Workflow Generator</h3>
//           <p className="text-xs text-muted-foreground">
//             Describe your workflow in plain English and let AI build it for you.
//           </p>
//         </div>
//       </div>
//       <Textarea
//         placeholder="e.g. Fetch content from a YouTube URL, summarize it with Claude, and send the summary to Slack"
//         value={prompt}
//         onChange={(e) => setPrompt(e.target.value)}
//         className="min-h-[100px] resize-none bg-background shadow-none"
//         disabled={generateWorkflow.isPending}
//       />
//       <div className="flex justify-end">
//         <Button
//           onClick={handleGenerate}
//           disabled={!prompt.trim() || generateWorkflow.isPending}
//           size="sm"
//           className="gap-x-2"
//         >
//           <SparklesIcon className="size-4" />
//           Generate Workflow
//         </Button>
//       </div>
//     </div>
//   );
// };



export const WorkflowsSearch = () => {
  const [params, setParams] = useWorkflowsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      placeholder="Search workflows..."
      value={searchValue}
      onChange={onSearchChange}
    />
  );
};

export const WorkflowsList = () => {
  const workflows = useSuspenseWorkflows();

  if (workflows.data?.items.length === 0) {
    return <WorkflowsEmpty />;
  }

  return (
    <>
      <EntityList
        items={workflows.data.items}
        getKey={(workflow) => workflow.id}
        renderItem={(workflow) => (
          <WorkflowItem key={workflow.id} data={workflow} />
        )}
        emptyView={<WorkflowsEmpty />}
      />
    </>
  );
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const createWorkflow = useCreateWorkflow();
  const router = useRouter();
  const { handleError, modal } = useUpgradeModal();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
      },
      onError: (error) => {
        handleError(error);
      },
    });
  };

  return (
    <>
      {modal}
      <EntityHeader
        title="Workflows"
        description="Create and manage your automation workflows"
        onNew={handleCreate}
        newButtonLabel="New Workflow"
        disabled={disabled}
        isCreating={createWorkflow.isPending}
      />
    </>
  );
};

export const WorkflowPagination = () => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();
  return (
    <EntityPagination
      disabled={workflows.isFetching}
      page={params.page}
      totalPages={workflows.data?.totalPages || 1}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const WorkflowsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <>
      <WorkflowNLP />
      <EntityContainer
        header={<WorkflowsHeader />}
        search={<WorkflowsSearch />}
        pagination={<WorkflowPagination />}
      >
        {children}
      </EntityContainer>
    </>
  );
};

export const WorkflowsLoading = () => {
  return <LoadingView message="workflows" />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Failed to load workflows" />;
};

export const WorkflowsEmpty = () => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();
  const { handleError, modal } = useUpgradeModal();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onError: (error) => {
        handleError(error);
      },
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
      },
    });
  };
  return (
    <>
      {modal}
      <EmptyView
        message="You haven't created any workflows yet. Get started by creating a new workflow."
        onNew={handleCreate}
      />
    </>
  );
};

export const WorkflowItem = ({ data }: { data: Workflow }) => {
  const removeWorkflow = useRemoveWorkflow();
  const handleRemove = () => {
    removeWorkflow.mutate({ id: data.id });
  };
  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
          &bull; Created{" "}
          {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <WorkflowIcon className="size-5 text-muted-foreground" />
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeWorkflow.isPending}
    />
  );
};
