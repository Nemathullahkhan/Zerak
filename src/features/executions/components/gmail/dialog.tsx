// src/features/executions/components/gmail/dialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  to: z.string().min(1, { message: "Recipient email is required" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  body: z.string().min(1, { message: "Email body is required" }),
});

export type GmailFormValues = z.infer<typeof formSchema>;

// ─── Shared form fields props ─────────────────────────────────────────────────

export interface GmailFormFieldsProps {
  onSubmit: (values: GmailFormValues) => void;
  defaultValues?: Partial<GmailFormValues>;
  // When true renders a Save button at the bottom (used in both dialog + layout)
  showSave?: boolean;
}

// ─── GmailFormFields ──────────────────────────────────────────────────────────
//
// Pure form — no Dialog shell. Used in two places:
//   1. GmailDialog wraps it in <DialogContent>
//   2. GmailNode portals it directly into the layout's middle column
//
export const GmailFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: GmailFormFieldsProps) => {
  const form = useForm<GmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      to: defaultValues.to ?? "",
      subject: defaultValues.subject ?? "",
      body: defaultValues.body ?? "",
    },
  });

  const watchVariableName = form.watch("variableName") || "myGmail";

  useEffect(() => {
    form.reset({
      variableName: defaultValues.variableName ?? "",
      to: defaultValues.to ?? "",
      subject: defaultValues.subject ?? "",
      body: defaultValues.body ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultValues.variableName,
    defaultValues.to,
    defaultValues.subject,
    defaultValues.body,
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
                <Input placeholder="myGmail" {...field} />
              </FormControl>
              <FormDescription>
                Reference this node&apos;s result in later nodes:{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {`{{${watchVariableName}.sent}}`}
                </code>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <FormControl>
                <Input
                  placeholder="recipient@example.com or {{user.email}}"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Supports{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {"{{variables}}"}
                </code>{" "}
                from previous nodes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your order confirmation or {{order.subject}}"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    "Hi {{user.name}},\n\nYour order {{order.id}} has been confirmed.\n\nThanks!"
                  }
                  className="min-h-[120px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Use{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {"{{variables}}"}
                </code>{" "}
                for simple values or{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {"{{json variable}}"}
                </code>{" "}
                to stringify objects.
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

// ─── GmailDialog ──────────────────────────────────────────────────────────────
//
// Unchanged behaviour — wraps GmailFormFields in the Dialog shell.
// Used when opening the node from the canvas directly (legacy path).
//
interface GmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailFormValues) => void;
  defaultValues?: Partial<GmailFormValues>;
}

export const GmailDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: GmailDialogProps) => {
  const handleSubmit = (values: GmailFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/logos/gmail.svg" className="size-4" alt="Gmail" />
            Gmail Configuration
          </DialogTitle>
          <DialogDescription>
            Configure the email this node will send when the workflow runs.
          </DialogDescription>
        </DialogHeader>
        <GmailFormFields
          onSubmit={handleSubmit}
          defaultValues={defaultValues}
          showSave={false}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button form="gmail-form" type="submit">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
