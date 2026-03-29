"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  variableName: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  sourceVariable: z.string().min(1),
  condition: z.string().min(1),
});

export type FilterFormValues = z.infer<typeof formSchema>;

export const FilterFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: {
  onSubmit: (values: FilterFormValues) => void;
  defaultValues?: Partial<FilterFormValues>;
  showSave?: boolean;
}) => {
  const form = useForm<FilterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      sourceVariable: defaultValues.sourceVariable ?? "",
      condition: defaultValues.condition ?? "",
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
                <Input placeholder="filteredItems" {...field} />
              </FormControl>
              <FormDescription>
                Reference: {`{{${field.value || "filteredItems"}}}`}
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
                Name of the variable containing an array.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition (JavaScript)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="item.age > 18 &amp;&amp; item.active === true"
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Use `item` to refer to each array element.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {showSave && <Button type="submit">Save</Button>}
      </form>
    </Form>
  );
};
