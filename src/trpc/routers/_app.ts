import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { inngest } from "@/app/inngest/client";

export const appRouter = createTRPCRouter({
  testAi: protectedProcedure.mutation(async () => {
    await inngest.send({
      name: "execute-ai",
    });
    return { success: true, message: "Job queued" };
  }),

  getUsers: protectedProcedure.query(({ ctx }) => {
    return prisma.user.findMany({
      where: {
        id: ctx.auth.user.id,
      },
    });
  }),
  getWorkflows: protectedProcedure.query(({}) => {
    return prisma.workflow.findMany({});
  }),
  createWorkflow: protectedProcedure.mutation(async () => {
    await inngest.send({
      name: "test/hello.world",
      data: {
        email: "test@gmail.com",
      },
    });
    return prisma.workflow.create({
      data: {
        name: "test-ingest-workflow",
      },
    });
  }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
