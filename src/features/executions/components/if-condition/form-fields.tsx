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

const ifFormSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  condition: z
    .string()
    .min(1, "Condition is required")
    .max(500, "Keep conditions concise"),
  trueLabel: z.string().max(40, "Keep it short").optional(),
  falseLabel: z.string().max(40, "Keep it short").optional(),
});

export type IfFormValues = z.infer<typeof ifFormSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface IfFormFieldsProps {
  defaultValues: IfFormValues;
  onSubmit: (values: IfFormValues) => void;
  showSave?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IfFormFields({
  defaultValues,
  onSubmit,
  showSave = true,
}: IfFormFieldsProps) {
  const form = useForm<IfFormValues>({
    resolver: zodResolver(ifFormSchema),
    defaultValues,
  });

  const watchVariableName = form.watch("variableName") || "condition";

  // Reset when switching between nodes
  useEffect(() => {
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultValues.variableName,
    defaultValues.condition,
    defaultValues.trueLabel,
    defaultValues.falseLabel,
  ]);

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
              <FormLabel>Variable name</FormLabel>
              <FormControl>
                <Input placeholder="isPremiumUser" {...field} />
              </FormControl>
              <FormDescription>
                Reference this node's result as {`{{`}
                <span className="font-bold text-neutral-500">
                  {watchVariableName}
                </span>
                {`.result}}`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Condition */}
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={`{{score}} >= 80\n{{status}} === 'active'\n{{items.length}} > 0`}
                  className="min-h-[100px] font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormDescription className="space-y-1">
                <span className="block">
                  Use <code className="text-xs">{"{{variableName}}"}</code> to
                  reference upstream outputs.
                </span>
                <span className="block text-muted-foreground">
                  Supports:{" "}
                  <code className="text-xs">{">= <= === !== > <"}</code> or a
                  bare truthy value.
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Branch labels */}
        <div className="space-y-2">
          <FormLabel>Branch labels</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="trueLabel"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-green-600 dark:text-green-400">
                        TRUE
                      </span>
                      <Input
                        placeholder="e.g. Is premium"
                        className="pl-12 text-xs"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="falseLabel"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-red-500 dark:text-red-400">
                        FALSE
                      </span>
                      <Input
                        placeholder="e.g. Is free tier"
                        className="pl-14 text-xs"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Optional labels shown on the canvas next to each output handle.
          </p>
        </div>

        {showSave && (
          <Button type="submit" className="w-full">
            Save
          </Button>
        )}
      </form>
    </Form>
  );
}
