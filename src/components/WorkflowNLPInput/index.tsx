"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkflowNLPInputProps {
  onSubmit: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export default function WorkflowNLPInput({
  onSubmit,
  placeholder = "Describe your workflow...",
  isLoading = false,
  autoFocus = false,
  className,
}: WorkflowNLPInputProps) {
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col w-full rounded-xl border border-[#222222] bg-[#111111] overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all",
        className
      )}
    >
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={3}
        className="w-full resize-none bg-transparent px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          {/* Future left-side controls can go here */}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!query.trim() || isLoading}
          size="sm"
          className="rounded-full px-4 font-medium"
        >
          {isLoading ? (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          ) : null}
          {isLoading ? "Running..." : "Run"}
          {!isLoading && <ArrowRightIcon className="ml-2 size-4" />}
        </Button>
      </div>
    </div>
  );
}
