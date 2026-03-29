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
  useRemoveWorkflow,
  useSuspenseWorkflows,
} from "../hooks/use-workflows";
import { useUpgradeModal } from "@/hooks/use-upgrade-model";
import { useRouter } from "next/navigation";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Workflow } from "@/generated/prisma/client";
import { WorkflowIcon } from "lucide-react";
import WorkflowNLP from "@/components/WorkflowNLP";
import { motion } from "framer-motion";

// ─── Sub-components ──────────────────────────────────────────────────────────

export const WorkflowsSearch = () => {
  const [params, setParams] = useWorkflowsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });
  return (
    <EntitySearch
      placeholder="Search workflows…"
      value={searchValue}
      onChange={onSearchChange}
    />
  );
};

export const WorkflowsList = () => {
  const workflows = useSuspenseWorkflows();
  if (workflows.data?.items.length === 0) return <WorkflowsEmpty />;
  return (
    <EntityList
      items={workflows.data.items}
      getKey={(w) => w.id}
      renderItem={(w) => <WorkflowItem key={w.id} data={w} />}
      emptyView={<WorkflowsEmpty />}
    />
  );
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const createWorkflow = useCreateWorkflow();
  const router = useRouter();
  const { handleError, modal } = useUpgradeModal();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => router.push(`/workflows/${data.id}`),
      onError: (error) => handleError(error),
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

export const WorkflowsLoading = () => (
  <LoadingView message="Loading workflows…" />
);
export const WorkflowsError = () => (
  <ErrorView message="Failed to load workflows" />
);

export const WorkflowsEmpty = () => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();
  const { handleError, modal } = useUpgradeModal();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onError: (error) => handleError(error),
      onSuccess: (data) => router.push(`/workflows/${data.id}`),
    });
  };

  return (
    <>
      {modal}
      <EmptyView
        message="You haven't created any workflows yet. Describe one above or start fresh."
        onNew={handleCreate}
      />
    </>
  );
};

export const WorkflowItem = ({ data }: { data: Workflow }) => {
  const removeWorkflow = useRemoveWorkflow();
  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}
          {" · "}
          Created {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={<WorkflowIcon className="size-4 text-white/30" />}
      onRemove={() => removeWorkflow.mutate({ id: data.id })}
      isRemoving={removeWorkflow.isPending}
    />
  );
};

// ─── Page container ───────────────────────────────────────────────────────────

export const WorkflowsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-full bg-zinc-950 pt-28">
      <div className="px-4 md:px-10 py-8 mx-auto max-w-6xl  w-full flex flex-col gap-y-8">
        {/* NLP Composer — full width, top of page */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-center mb-10 text-center ">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight max-w-xl text-white">
              Describe your workflow in natural language and we&apos;ll create
              it for you.
            </h1>
          </div>
          <WorkflowNLP />
        </motion.div>

        {/* Divider with label */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[11px] text-white/20 uppercase tracking-widest font-medium">
            Your workflows
          </span>
          <div className="flex-1 h-px bg-[#1e1e21]" />
        </div>

        {/* Workflows list section */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col gap-y-4"
        >
          {/* Header + search in one row */}
          <div className="flex items-center justify-between gap-4">
            <WorkflowsHeader />
            <WorkflowsSearch />
          </div>

          {/* List */}
          {children}

          <WorkflowPagination />
        </motion.div>
      </div>
    </div>
  );
};
