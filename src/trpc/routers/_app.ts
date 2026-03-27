import { credentialsRouter } from "@/features/credentials/server/routers";
import { createTRPCRouter } from "../init";
import { workflowsRouter } from "@/features/workflows/server/routers";
import { executionsRouter } from "@/features/executions/server/routers";
import { schedulesRouter } from "@/features/schedule/server/routers";

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  schedules: schedulesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
