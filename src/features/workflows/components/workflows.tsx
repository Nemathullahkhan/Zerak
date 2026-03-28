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

export const WorkflowsNLP = () => {
  const [prompt, setPrompt] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const router = useRouter();

  const {
    steps,
    partialNodes,
    isStreaming,
    error,
    addStep,
    setPartialNodes,
    reset,
    setStreaming,
    setError,
  } = useStreamingStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<{
    question: string;
    originalPrompt: string;
  } | null>(null);

  const handleChunk = useCallback(
    async (chunk: any, currentPrompt: string) => {
      switch (chunk.type) {
        case 'intent':
        case 'plan':
          addStep({ type: chunk.type, content: chunk.content });
          break;

        case 'partial_nodes':
          setPartialNodes(chunk.nodes);
          break;

        case 'question':
          // Stop the current stream and store the question for inline answer
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          addStep({ type: 'question', content: chunk.content });
          setPendingQuestion({
            question: chunk.content,
            originalPrompt: currentPrompt,
          });
          setStreaming(false);
          break;

        case 'final':
          const cleanWorkflow = {
            name: chunk.workflow.name,
            nodes: chunk.workflow.nodes.map((node: any) => ({
              id: node.id,
              name: node.name,
              type: node.type,
              data: node.data,
              position: node.position,
            })),
            connections: chunk.workflow.connections.map((conn: any) => ({
              id: conn.id,
              fromNodeId: conn.fromNodeId,
              toNodeId: conn.toNodeId,
              fromOutput: conn.fromOutput,
              toInput: conn.toInput,
            })),
          };

          try {
            const response = await fetch('/api/workflow/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cleanWorkflow),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to save workflow');
            }

            const data = await response.json();
            router.push(`/workflows/${data.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save workflow');
          }
          break;

        default:
          console.warn('Unknown chunk type:', chunk.type);
      }
    },
    [addStep, setPartialNodes, router, setError, setStreaming]
  );

  const generateWorkflow = useCallback(
    async (promptText: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      reset();
      setStreaming(true);
      setPendingQuestion(null); // clear any pending question
      setAnswerInput('');

      try {
        const response = await fetch('/api/workflow/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed);
              await handleChunk(chunk, promptText);
            } catch (e) {
              console.warn('Failed to parse chunk:', trimmed);
            }
          }
        }

        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer.trim());
            await handleChunk(chunk, promptText);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted');
        } else {
          console.error('Stream error:', err);
          setError(err.message || 'Streaming failed');
        }
      } finally {
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [reset, setStreaming, setError, handleChunk]
  );

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateWorkflow(prompt);
  };

  const handleAnswerSubmit = () => {
    if (!pendingQuestion || !answerInput.trim()) return;

    const answer = answerInput.trim();
    const newPrompt = `${pendingQuestion.originalPrompt}\n\nUser's answer to "${pendingQuestion.question}": ${answer}`;
    setPrompt(newPrompt);
    setPendingQuestion(null);
    setAnswerInput('');
    generateWorkflow(newPrompt);
  };

  return (
    <div className="relative border border-dashed rounded-lg p-6 bg-muted/50 flex flex-col gap-y-4">
      <div className="flex items-center gap-x-2">
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
          <SparklesIcon className="size-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold">AI Workflow Generator</h3>
          <p className="text-xs text-muted-foreground">
            Describe your workflow in plain English and watch AI build it live.
          </p>
        </div>
      </div>

      <Textarea
        placeholder="e.g. Fetch content from a YouTube URL, summarize it with Claude, and send the summary to Slack"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[100px] resize-none bg-background shadow-none"
        disabled={isStreaming}
      />

      <div className="flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isStreaming}
          size="sm"
          className="gap-x-2"
        >
          <SparklesIcon className="size-4" />
          Generate Workflow
        </Button>
      </div>

      {/* Streaming Panel - Chat‑like UI */}
      {(isStreaming || steps.length > 0 || pendingQuestion) && (
        <div className="mt-4 p-4 border rounded-lg bg-background shadow-sm space-y-3 max-h-[400px] overflow-y-auto">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="font-semibold capitalize text-primary">{step.type}:</span>
              <span className="text-muted-foreground">{step.content}</span>
            </div>
          ))}

          {/* Inline Question Input */}
          {pendingQuestion && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex gap-2 items-start">
                <span className="font-semibold text-primary">Question:</span>
                <span className="text-muted-foreground flex-1">{pendingQuestion.question}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Type your answer here..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && answerInput.trim()) {
                      handleAnswerSubmit();
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
            <Button
                  size="sm"
                  onClick={handleAnswerSubmit}
                  disabled={!answerInput.trim()}
                  className="gap-1"
                >
                  <SendIcon className="size-3" />
                  Send
                </Button>
              </div>
            </div>
          )}

          {isStreaming && !pendingQuestion && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2Icon className="size-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm p-2 border border-red-200 rounded bg-red-50">
          Error: {error}
        </div>
      )}

      {/* Live preview of nodes */}
      {partialNodes.length > 0 && (
        <div className="mt-4 p-2 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Live preview:</p>
          <div className="flex flex-wrap gap-2">
            {partialNodes.map((node) => (
              <div key={node.id} className="text-xs px-2 py-1 bg-primary/10 rounded">
                {node.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
      <WorkflowsNLP />
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
