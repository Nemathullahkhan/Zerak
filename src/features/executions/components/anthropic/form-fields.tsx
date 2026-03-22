"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { CredentialType } from "@/generated/prisma/enums";
import { CredentialSelect } from "@/components/credential-select";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ANTHROPIC_AVAILABLE_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Variable name must start with a letter or underscore and container only letters, numbers, and underscores.",
    }),
  credentialId: z.string().min(1, { message: "Select an API key" }),
  model: z.string().min(1, { message: "Model is required" }),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "User prompt is required"),
});

export type AnthropicFormValues = z.infer<typeof formSchema>;

// ─── Shared form fields props ─────────────────────────────────────────────────

export interface AnthropicFormFieldsProps {
  onSubmit: (values: AnthropicFormValues) => void;
  defaultValues?: Partial<AnthropicFormValues>;
  showSave?: boolean;
}

// ─── AnthropicFormFields ──────────────────────────────────────────────────────

export const AnthropicFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: AnthropicFormFieldsProps) => {
  const form = useForm<AnthropicFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      model: defaultValues.model || ANTHROPIC_AVAILABLE_MODELS[0],
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
    },
  });

  const watchVariableName = form.watch("variableName") || "myAnthropic";

  useEffect(() => {
    form.reset({
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      model: defaultValues.model || ANTHROPIC_AVAILABLE_MODELS[0],
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultValues.variableName,
    defaultValues.credentialId,
    defaultValues.model,
    defaultValues.systemPrompt,
    defaultValues.userPrompt,
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <FormField
          control={form.control}
          name="variableName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variable Name</FormLabel>
              <FormControl>
                <Input placeholder="myAnthropic" {...field} />
              </FormControl>
              <FormDescription>
                Use this name to reference the result in other nodes: {`{{`}
                <span className="text-neutral-500 font-bold">
                  {watchVariableName}
                </span>
                {`.text}}`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ANTHROPIC_AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The Anthropic model to use for completion
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="credentialId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anthropic Credential</FormLabel>
              <FormControl>
                <CredentialSelect
                  type={CredentialType.ANTHROPIC}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={"You are helpful assistant.."}
                  className="min-h-[80px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Sets the behaviour of the assistant. Use {"{{variables}}"}{" "}
                for a simple values or {"{{json variable}}"} to stringfy
                objects
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="userPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    "Summarize: {{json myRequest.httpResponse.data}}"
                  }
                  className="min-h-[120px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Use {"{{variableName}}"} for simple values,{" "}
                {"{{json variableName}}"} to stringify objects.
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
};
