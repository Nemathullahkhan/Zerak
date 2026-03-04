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

import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  url: z
    .string()
    .min(1, { message: "YouTube URL is required" })
    .refine((val) => YOUTUBE_URL_PATTERN.test(val.trim()), {
      message: "Please enter a valid YouTube video URL",
    }),
});

export type ContentSourceFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContentSourceFormValues) => void;
  defaultValues?: Partial<ContentSourceFormValues>;
}

export const ContentSourceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ContentSourceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "source",
      url: defaultValues.url || "",
    },
  });
  const watchVariableName = form.watch("variableName") || "source";

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "source",
        url: defaultValues.url || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ContentSourceFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>YouTube Transcript</DialogTitle>
          <DialogDescription>
            Fetch the transcript from a YouTube video. Use the result in
            downstream nodes (e.g. Gemini) as {`{{${watchVariableName}.transcript}}`}
            .
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8 mt-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="source" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the transcript in other nodes: {`{{`}
                    <span className="text-neutral-500 font-bold">
                      {watchVariableName}
                    </span>
                    {`.transcript}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Full URL to the YouTube video (e.g. youtube.com/watch?v=...
                    or youtu.be/...)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
