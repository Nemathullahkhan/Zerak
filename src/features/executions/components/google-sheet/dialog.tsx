"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

// Define the schema with all possible fields
const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1)
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
    action: z.enum([
      "append",
      "read",
      "update",
      "delete_rows",
      "create_spreadsheet",
      "create_sheet",
      "batch_update",
    ]),
    spreadsheetId: z.string().optional(),
    sheetName: z.string().optional(),
    range: z.string().optional(),
    data: z.string().optional(),
    newSheetName: z.string().optional(),
    spreadsheetTitle: z.string().optional(),
    batchOperations: z.string().optional(),
  })
  .refine(
    (values) => {
      // Conditionally require fields based on action
      switch (values.action) {
        case "append":
        case "read":
        case "update":
        case "delete_rows":
        case "create_sheet":
          return !!values.spreadsheetId && !!values.sheetName;
        case "create_spreadsheet":
          return !!values.spreadsheetTitle;
        case "batch_update":
          return !!values.spreadsheetId && !!values.batchOperations;
        default:
          return true;
      }
    },
    {
      message: "Missing required fields for selected action",
      path: ["action"],
    },
  );

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

export const GoogleSheetsFormFields = ({
  onSubmit,
  defaultValues = {},
  showSave = true,
}: {
  onSubmit: (values: GoogleSheetsFormValues) => void;
  defaultValues?: Partial<GoogleSheetsFormValues>;
  showSave?: boolean;
}) => {
  const form = useForm<GoogleSheetsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      action: defaultValues.action ?? "append",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      sheetName: defaultValues.sheetName ?? "",
      range: defaultValues.range ?? "",
      data: defaultValues.data ?? "",
      newSheetName: defaultValues.newSheetName ?? "",
      spreadsheetTitle: defaultValues.spreadsheetTitle ?? "",
      batchOperations: defaultValues.batchOperations ?? "",
    },
  });

  const selectedAction = form.watch("action");

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
                <Input placeholder="mySheets" {...field} />
              </FormControl>
              <FormDescription>
                Reference: {`{{${field.value || "mySheets"}}}`}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="append">Append Rows</SelectItem>
                  <SelectItem value="read">Read Data</SelectItem>
                  <SelectItem value="update">Update Data (range)</SelectItem>
                  <SelectItem value="delete_rows">
                    Delete Rows (range)
                  </SelectItem>
                  <SelectItem value="create_spreadsheet">
                    Create New Spreadsheet
                  </SelectItem>
                  <SelectItem value="create_sheet">
                    Create New Sheet (tab)
                  </SelectItem>
                  <SelectItem value="batch_update">Batch Update</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional Fields */}
        {[
          "append",
          "read",
          "update",
          "delete_rows",
          "create_sheet",
          "batch_update",
        ].includes(selectedAction) && (
          <FormField
            control={form.control}
            name="spreadsheetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spreadsheet ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1BxiMVs0XRA5nFMKUVgNoco5FlE_O7IZo"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {["append", "read", "update", "delete_rows", "create_sheet"].includes(
          selectedAction,
        ) && (
          <FormField
            control={form.control}
            name="sheetName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sheet Name</FormLabel>
                <FormControl>
                  <Input placeholder="Sheet1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {["read", "update", "delete_rows"].includes(selectedAction) && (
          <FormField
            control={form.control}
            name="range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Range (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Sheet1!A2:C10" {...field} />
                </FormControl>
                <FormDescription>Leave empty for whole sheet</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {["append", "update"].includes(selectedAction) && (
          <FormField
            control={form.control}
            name="data"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='[["John", "john@example.com"], ["Jane", "jane@example.com"]]'
                    className="min-h-[100px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>JSON array of rows</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedAction === "create_sheet" && (
          <FormField
            control={form.control}
            name="newSheetName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Sheet Name</FormLabel>
                <FormControl>
                  <Input placeholder="My New Sheet" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedAction === "create_spreadsheet" && (
          <FormField
            control={form.control}
            name="spreadsheetTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spreadsheet Title</FormLabel>
                <FormControl>
                  <Input placeholder="My Spreadsheet" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedAction === "batch_update" && (
          <FormField
            control={form.control}
            name="batchOperations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Operations (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='[{"action":"update","range":"Sheet1!A2","data":["Hello"]},{"action":"delete_rows","range":"Sheet1!5:6"}]'
                    className="min-h-[120px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Array of operations</FormDescription>
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
