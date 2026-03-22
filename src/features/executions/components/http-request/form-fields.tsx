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

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
      message:
        "Variable name must start with a letter or underscore and container only letters, numbers, and underscores.",
    })
    .optional(),
  endpoint: z.string().min(1, { message: "Please enter a valid url" }),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  body: z.string().optional(),
});

export type HttpRequestFormValues = z.infer<typeof formSchema>;

// ─── Shared form fields props ─────────────────────────────────────────────────

export interface HttpRequestFormFieldsProps {
  onSubmit: (values: HttpRequestFormValues) => void;
  defaultValues?: Partial<HttpRequestFormValues>;
  showSave?: boolean;
}

// ─── HttpRequestFormFields ────────────────────────────────────────────────────

export const HttpRequestFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: HttpRequestFormFieldsProps) => {
  const form = useForm<HttpRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || "GET",
      body: defaultValues.body || "",
    },
  });

  const watchVariableName = form.watch("variableName") || "myApiCall";
  const watchMethod = form.watch("method");
  const showBodyField =
    watchMethod === "POST" || watchMethod === "PUT" || watchMethod === "PATCH";

  useEffect(() => {
    form.reset({
      variableName: defaultValues.variableName || "",
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || "GET",
      body: defaultValues.body || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultValues.variableName,
    defaultValues.endpoint,
    defaultValues.method,
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
                <Input placeholder="myAPiCall" {...field} />
              </FormControl>
              <FormDescription>
                Use this name to reference the result in other nodes:{" "}
                {`{{`}
                <span className="text-neutral-500 font-bold">
                  {watchVariableName}
                </span>
                {`.httpResponse.data}}`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select HTTP method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The HTTP method to use for this request
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endpoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endpoint URL</FormLabel>
              <FormControl>
                <Input placeholder="https://api.example.com/data" {...field} />
              </FormControl>
              <FormDescription>
                Static URL or use {"{{variables}}"} for simple values or{" "}
                {"{{json variable}}"} to stringify objects
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {showBodyField && (
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request Body</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={
                      '{\n "userId": "{{httpResponse.data.id}},\n "name":"{{httpResponse.data.name}}",\n "items":"{{httpResponse.data.items}}"}'
                    }
                    className="min-h-[120px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Static URL or use {"{{variables}}"} for simple values or{" "}
                  {"{{json variable}}"} to stringify objects
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showSave && (
          <Button type="submit" className="w-full">
            Save
          </Button>
        )}
      </form>
    </Form>
  );
};
