"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailFormValues) => void;
  defaultValues?: Partial<GmailFormValues>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GmailDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
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

  // Re-populate when dialog reopens with saved values
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? "",
        to: defaultValues.to ?? "",
        subject: defaultValues.subject ?? "",
        body: defaultValues.body ?? "",
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 mt-2"
          >
            {/* Variable name */}
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
                    <code className="text-xs bg-muted px-1 rounded">
                      {`{{${watchVariableName}.sent}}`}
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* To */}
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
                    <code className="text-xs bg-muted px-1 rounded">
                      {"{{variables}}"}
                    </code>{" "}
                    from previous nodes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
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

            {/* Body */}
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
                    <code className="text-xs bg-muted px-1 rounded">
                      {"{{variables}}"}
                    </code>{" "}
                    for simple values or{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      {"{{json variable}}"}
                    </code>{" "}
                    to stringify objects.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
