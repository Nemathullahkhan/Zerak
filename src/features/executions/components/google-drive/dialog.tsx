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
  action: z.enum(["read", "search"]).catch("read"),
  fileId: z.string().optional().default(""),
  searchQuery: z.string().optional().default(""),
});

export type GoogleDriveFormValues = z.infer<typeof formSchema>;

// ─── Shared form fields props ─────────────────────────────────────────────────

export interface GoogleDriveFormFieldsProps {
  onSubmit: (values: GoogleDriveFormValues) => void;
  defaultValues?: Partial<GoogleDriveFormValues>;
  showSave?: boolean;
}

// ─── GoogleDriveFormFields ────────────────────────────────────────────────────

export const GoogleDriveFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: GoogleDriveFormFieldsProps) => {
  const form = useForm<GoogleDriveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "driveFile",
      action: defaultValues.action ?? "read",
      fileId: defaultValues.fileId ?? "",
      searchQuery: defaultValues.searchQuery ?? "",
    },
  });

  const watchAction = form.watch("action");
  const watchVariableName = form.watch("variableName") || "driveFile";

  useEffect(() => {
    form.reset({
      variableName: defaultValues.variableName ?? "driveFile",
      action: defaultValues.action ?? "read",
      fileId: defaultValues.fileId ?? "",
      searchQuery: defaultValues.searchQuery ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultValues.variableName,
    defaultValues.action,
    defaultValues.fileId,
    defaultValues.searchQuery,
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        {/* Variable Name */}
        <FormField
          control={form.control}
          name="variableName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variable Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., myResume, driveFile"
                  {...field}
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>
                Name used to store this file in the workflow context.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action */}
        <FormField
          control={form.control}
          name="action"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="read">Read File</SelectItem>
                  <SelectItem value="search">Search Files</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Read a specific file or search for files in Google Drive.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* File ID (for read action) */}
        {watchAction === "read" && (
          <FormField
            control={form.control}
            name="fileId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>File ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 1BxiMVs0XRA5nFMKUVfta..."
                    {...field}
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Get the file ID from the shareable link:
                  https://drive.google.com/file/d/[FILE_ID]/view
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Search Query (for search action) */}
        {watchAction === "search" && (
          <FormField
            control={form.control}
            name="searchQuery"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search Query</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., name contains 'resume'"
                    {...field}
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Google Drive search syntax: name contains &apos;text&apos;,
                  trashed=false, mimeType=&apos;application/pdf&apos;, etc.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Save Button */}
        {showSave && (
          <Button type="submit" className="mt-4 w-full">
            Save Configuration
          </Button>
        )}
      </form>
    </Form>
  );
};
