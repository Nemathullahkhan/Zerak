"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamingStore } from "@/features/editor/store/streaming-store";
import { Input } from "@/components/ui/input";
import {
  LightbulbIcon,
  Loader2Icon,
  PlusIcon,
  SendHorizonalIcon,
  Link2Icon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ensureGeneratedWorkflow } from "@/lib/ensure-generated-workflow";
import { createId } from "@paralleldrive/cuid2";
import Image from "next/image";
import AnthropicLogo from "../../../public/logos/anthropic.svg";

const WorkflowNLP = () => {
  const [prompt, setPrompt] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
  /** Streamed {"type":"connections"} chunks — the model often omits edges on the final object. */
  const streamConnectionsRef = useRef<
    Array<{
      id?: string;
      fromNodeId: string;
      toNodeId: string;
      fromOutput?: string;
      toInput?: string;
    }>
  >([]);
  const [pendingQuestion, setPendingQuestion] = useState<{
    question: string;
    originalPrompt: string;
  } | null>(null);

  // Auto-resize textarea
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleChunk = useCallback(
    async (chunk: any, currentPrompt: string) => {
      switch (chunk.type) {
        case "intent":
        case "plan":
        case "connection": // legacy singular type (log line only)
          addStep({
            type: chunk.type,
            content: typeof chunk.content === "string" ? chunk.content : "",
          });
          break;
        case "connections":
          if (Array.isArray(chunk.connections)) {
            streamConnectionsRef.current = chunk.connections;
            addStep({
              type: "connections",
              content: `${chunk.connections.length} connection(s)`,
            });
          }
          break;
        case "partial_nodes":
          setPartialNodes(chunk.nodes);
          break;
        case "question":
          if (abortControllerRef.current) abortControllerRef.current.abort();
          addStep({ type: "question", content: chunk.content });
          setPendingQuestion({
            question: chunk.content,
            originalPrompt: currentPrompt,
          });
          setStreaming(false);
          break;
        case "final": {
          const w = chunk.workflow;
          if (!w?.nodes?.length) {
            setError("Model returned an empty workflow");
            break;
          }
          const rawConnections = Array.isArray(w.connections)
            ? w.connections
            : streamConnectionsRef.current;
          const mappedConnections = (rawConnections || []).map(
            (conn: {
              id?: string;
              fromNodeId: string;
              toNodeId: string;
              fromOutput?: string;
              toInput?: string;
            }) => ({
              id: conn.id || createId(),
              fromNodeId: conn.fromNodeId,
              toNodeId: conn.toNodeId,
              fromOutput: conn.fromOutput ?? "source-1",
              toInput: conn.toInput ?? "target-1",
            }),
          );
          const mappedNodes = w.nodes.map((node: any) => ({
            id: node.id,
            name: node.name,
            type: node.type,
            data: node.data ?? {},
            position: node.position ?? { x: 100, y: 100 },
          }));
          const ensured = ensureGeneratedWorkflow(mappedNodes, mappedConnections);
          const cleanWorkflow = {
            name: w.name || "generated-workflow",
            nodes: ensured.nodes,
            connections: ensured.connections,
          };
          try {
            const response = await fetch("/api/workflow/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanWorkflow),
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to save workflow");
            }
            const data = await response.json();
            // Clear store before navigation to avoid stale state
            reset();
            streamConnectionsRef.current = [];
            router.push(`/workflows/${data.id}`);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to save workflow",
            );
          }
          break;
        }
        default:
          console.warn("Unknown chunk type:", chunk.type);
      }
    },
    [addStep, setPartialNodes, router, setError, setStreaming, reset],
  );

  const generateWorkflow = useCallback(
    async (promptText: string) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      reset(); // clear all previous data
      streamConnectionsRef.current = [];
      setStreaming(true);
      setPendingQuestion(null);
      setAnswerInput("");
      try {
        const response = await fetch("/api/workflow/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText }),
          signal: abortControllerRef.current.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed);
              await handleChunk(chunk, promptText);
            } catch (e) {
              console.warn("Failed to parse chunk:", trimmed);
            }
          }
        }
        if (buffer.trim()) {
          try {
            await handleChunk(JSON.parse(buffer.trim()), promptText);
          } catch {}
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Streaming failed");
        }
      } finally {
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [reset, setStreaming, setError, handleChunk],
  );

  const handleGenerate = () => {
    if (!prompt.trim() || isStreaming) return;
    generateWorkflow(prompt);
  };

  const handleAnswerSubmit = () => {
    if (!pendingQuestion || !answerInput.trim()) return;
    const answer = answerInput.trim();
    const newPrompt = `${pendingQuestion.originalPrompt}\n\nUser's answer to "${pendingQuestion.question}": ${answer}`;
    setPrompt(newPrompt);
    setPendingQuestion(null);
    setAnswerInput("");
    generateWorkflow(newPrompt);
  };

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingQuery");
    if (pending) {
      sessionStorage.removeItem("pendingQuery");
      setPrompt(pending);
      generateWorkflow(pending);
    }
  }, []);

  const hasActivity = isStreaming || steps.length > 0 || pendingQuestion;

  // Map step types to icons
  const getStepIcon = (type: string) => {
    switch (type) {
      case "intent":
        return <LightbulbIcon className="size-3 text-amber-400/80" />;
      case "plan":
        return <LightbulbIcon className="size-3 text-blue-400/80" />;
      case "connection":
        return <Link2Icon className="size-3 text-green-400/80" />;
      case "connections":
        return <Link2Icon className="size-3 text-emerald-400/80" />;
      case "question":
        return <LightbulbIcon className="size-3 text-amber-400/80" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Composer Card ── */}
      <div
        className={cn(
          "relative w-full rounded-2xl border transition-all duration-200",
          "bg-card/40 border-border focus-within:border-ring focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
        )}
      >
        {/* Streaming overlay */}
        <AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 rounded-2xl bg-background/80 backdrop-blur-[2px] flex items-center justify-center"
            >
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin text-primary" />
                <span>Building your workflow…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            autoResize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Describe the workflow you want to build…"
          disabled={isStreaming}
          rows={2}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-4 pb-2",
            "text-[15px] text-foreground placeholder:text-muted-foreground/50",
            "outline-none border-none focus:ring-0",
            "min-h-[56px] max-h-[200px]",
          )}
          style={{ fieldSizing: "content" } as any}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* + attach */}
          <button className="flex items-center justify-center size-7 rounded-lg bg-secondary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <PlusIcon className="size-4" />
          </button>

          {/* Model selector */}
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground text-xs font-medium shrink-0">
            <Image
              src={AnthropicLogo}
              alt="Anthropic Icon"
              className="size-4 rounded-sm"
            />
            <span>Sonnet 4.5</span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Plan toggle */}
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground text-xs font-medium shrink-0">
            <LightbulbIcon className="size-3" />
            <span>Plan</span>
          </button>

          {/* Build now */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isStreaming}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 shrink-0",
              prompt.trim() && !isStreaming
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] shadow-md"
                : "bg-secondary text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            {isStreaming ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <>
                Build now
                <SendHorizonalIcon className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Streaming / Activity Panel ── */}
      <AnimatePresence>
        {hasActivity && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="w-full rounded-2xl border border-border bg-card overflow-hidden"
          >
            {/* Steps log */}
            {steps.length > 0 && (
              <div className="px-4 pt-4 space-y-2 max-h-[260px] overflow-y-auto">
                {steps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex gap-2 text-sm items-start"
                  >
                    <span className="shrink-0 capitalize text-muted-foreground font-medium w-16 flex items-center gap-1">
                      {getStepIcon(step.type)}
                      <span>{step.type}</span>
                    </span>
                    <span className="text-foreground/80 leading-relaxed">
                      {step.content}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Live node preview with connection icon */}
            {partialNodes.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] text-muted-foreground/60 mb-2 uppercase tracking-widest flex items-center gap-1">
                  <Link2Icon className="size-3" />
                  Live nodes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {partialNodes.map((node) => (
                    <span
                      key={node.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20"
                    >
                      {node.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pending question */}
            {pendingQuestion && (
              <div className="px-4 pt-3 pb-4 border-t border-border mt-3">
                <div className="flex gap-2 mb-3">
                  <LightbulbIcon className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {pendingQuestion.question}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Your answer…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && answerInput.trim())
                        handleAnswerSubmit();
                    }}
                    autoFocus
                    className="flex-1 h-9 bg-muted border-border text-foreground placeholder:text-muted-foreground/50 text-sm rounded-xl focus-visible:ring-0 focus-visible:border-ring"
                  />
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={!answerInput.trim()}
                    className="px-3 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground/40 text-primary-foreground text-sm font-medium transition-colors"
                  >
                    <SendHorizonalIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {isStreaming && !pendingQuestion && (
              <div className="px-4 py-3 border-t border-border flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="size-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Thinking…</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20 bg-destructive/5"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkflowNLP;
