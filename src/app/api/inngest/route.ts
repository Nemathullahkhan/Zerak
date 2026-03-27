import { inngest } from "@/app/inngest/client";
import { serve } from "inngest/next";
import { executeWorkflow , scheduledWorkflowPoller} from "./functions";

// Create an API that serves functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeWorkflow, scheduledWorkflowPoller],
});
