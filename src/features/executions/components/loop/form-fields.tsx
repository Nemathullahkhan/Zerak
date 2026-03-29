"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Invalid variable name"),
  sourceVariable: z.string().min(1, "Source array variable is required"),
  itemVariable: z.string().min(1, "Item variable name is required"),
  execution: z.enum(["sequential", "parallel"]),
});

export type LoopFormValues = z.infer<typeof formSchema>;

export const LoopFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: {
  onSubmit: SubmitHandler<LoopFormValues>;
  defaultValues?: Partial<LoopFormValues>;
  showSave?: boolean;
}) => {
  const form = useForm<LoopFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      sourceVariable: defaultValues.sourceVariable ?? "",
      itemVariable: defaultValues.itemVariable ?? "item",
      execution: defaultValues.execution ?? "sequential",
    },
  });

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
              <FormLabel>Output Variable Name</FormLabel>
              <FormControl>
                <Input placeholder="processedItems" {...field} />
              </FormControl>
              <FormDescription>
                Reference:{" "}
                <code>{`{{${field.value || "processedItems"}}}`}</code>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sourceVariable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Array Variable</FormLabel>
              <FormControl>
                <Input placeholder="users" {...field} />
              </FormControl>
              <FormDescription>
                Name of the variable containing the array to iterate over.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="itemVariable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Variable Name</FormLabel>
              <FormControl>
                <Input placeholder="item" {...field} />
              </FormControl>
              <FormDescription>
                Variable name for the current element inside the loop (default:
                "item").
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="execution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Execution Mode</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select execution mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sequential">
                    Sequential (one by one)
                  </SelectItem>
                  <SelectItem value="parallel">
                    Parallel (all at once)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Sequential is safer for APIs with rate limits; parallel is
                faster.
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
