import { credentialsRouter } from "@/features/credentials/server/routers";
import { createTRPCRouter } from "../init";
import { workflowsRouter } from "@/features/workflows/server/routers";
import { executionsRouter } from "@/features/executions/server/routers";
import { schedulesRouter } from "@/features/schedule/server/routers";
import { analysisRouter } from "@/features/executions/server/analysis-router";

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  schedules: schedulesRouter,
  analysis: analysisRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
