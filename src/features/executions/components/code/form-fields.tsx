"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─── Schema ────────────────────────────────────────────────────────────────────

const codeFormSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  code: z.string().min(1, "Code is required"),
});

export type CodeFormValues = z.infer<typeof codeFormSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CodeFormFieldsProps {
  defaultValues: CodeFormValues;
  onSubmit: (values: CodeFormValues) => void;
  showSave?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CodeFormFields({
  defaultValues,
  onSubmit,
  showSave = true,
}: CodeFormFieldsProps) {
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeFormSchema),
    defaultValues,
  });

  const watchVariableName = form.watch("variableName") || "result";

  // Reset when switching between nodes
  useEffect(() => {
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues.variableName, defaultValues.code]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        {/* Variable name */}
        <FormField
          control={form.control}
          name="variableName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output variable name</FormLabel>
              <FormControl>
                <Input placeholder="filteredItems" {...field} />
              </FormControl>
              <FormDescription>
                Reference returned value as {`{{`}
                <span className="font-bold text-neutral-500">
                  {watchVariableName}
                </span>
                {`}}`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Code */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>JavaScript code</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={`// context contains all previous node outputs\n// You must return a value\nreturn context.allTodos.httpResponse.data\n  .filter(t => t.completed);`}
                  className="min-h-[200px] font-mono text-xs leading-relaxed"
                  {...field}
                />
              </FormControl>
              <FormDescription className="space-y-1">
                <span className="block">
                  <code className="text-xs">context</code> contains all
                  upstream node outputs. Use{" "}
                  <code className="text-xs">return</code> to output a value.
                </span>
                <span className="block text-muted-foreground">
                  Timeout: 5 seconds. No network or file access.
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {showSave && (
          <Button type="submit" className="w-full">
            Save
          </Button>
        )}
      </form>
    </Form>
  );
}
