"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { Plus, Trash2 } from "lucide-react";

// ─── Schema ────────────────────────────────────────────────────────────────────

const switchFormSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  inputExpression: z
    .string()
    .min(1, "Input expression is required"),
  cases: z
    .array(
      z.object({
        label: z.string().min(1, "Label is required"),
        value: z.string().min(1, "Match value is required"),
      }),
    )
    .min(1, "At least one case is required")
    .max(10, "Maximum 10 cases allowed"),
});

export type SwitchFormValues = z.infer<typeof switchFormSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SwitchFormFieldsProps {
  defaultValues: SwitchFormValues;
  onSubmit: (values: SwitchFormValues) => void;
  showSave?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SwitchFormFields({
  defaultValues,
  onSubmit,
  showSave = true,
}: SwitchFormFieldsProps) {
  const form = useForm<SwitchFormValues>({
    resolver: zodResolver(switchFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cases",
  });

  const watchVariableName = form.watch("variableName") || "switchResult";

  // Reset when switching between nodes
  useEffect(() => {
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues.variableName, defaultValues.inputExpression]);

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
                <Input placeholder="routeResult" {...field} />
              </FormControl>
              <FormDescription>
                Reference this node's result as {`{{`}
                <span className="font-bold text-neutral-500">
                  {watchVariableName}
                </span>
                {`.taken}}`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Input expression */}
        <FormField
          control={form.control}
          name="inputExpression"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input expression</FormLabel>
              <FormControl>
                <Input
                  placeholder="{{httpResponse.status}}"
                  className="font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Use <code className="text-xs">{"{{variableName}}"}</code> to
                reference upstream outputs. This value is matched against each
                case below.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cases */}
        <div className="flex flex-col gap-2">
          <FormLabel>Cases</FormLabel>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              {/* Handle label */}
              <FormField
                control={form.control}
                name={`cases.${index}.label`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="handle" className="text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Match value */}
              <FormField
                control={form.control}
                name={`cases.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="match value"
                        className="font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}

          {/* Column headers */}
          <div className="flex gap-2 pl-0">
            <span className="flex-1 text-[10px] text-muted-foreground">
              Handle label (used on canvas)
            </span>
            <span className="flex-1 text-[10px] text-muted-foreground">
              Match value (exact string)
            </span>
            <span className="size-8 shrink-0" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => append({ label: `case-${fields.length + 1}`, value: "" })}
            disabled={fields.length >= 10}
          >
            <Plus className="mr-1.5 size-3" />
            Add case
          </Button>

          <p className="text-[11px] text-muted-foreground">
            Falls through to <code className="text-[10px]">default</code> handle
            if no case matches.
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
