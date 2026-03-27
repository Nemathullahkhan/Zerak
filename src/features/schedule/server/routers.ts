import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { computeNextRun } from "@/lib/cron";
import z from "zod";

export const schedulesRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify ownership via workflow lookup
      const workflow = await prisma.workflow.findUnique({
        where: { id: input.workflowId, userId: ctx.auth.user.id },
        include: { schedule: true },
      });
      if (!workflow) return null;
      return workflow.schedule;
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        cronExpression: z.string(),
        timezone: z.string().default("UTC"),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      await prisma.workflow.findUniqueOrThrow({
        where: { id: input.workflowId, userId: ctx.auth.user.id },
      });

      const nextRun = computeNextRun(input.cronExpression, input.timezone);

      return prisma.scheduledWorkflow.upsert({
        where: { workflowId: input.workflowId },
        create: {
          workflowId: input.workflowId,
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          isActive: input.isActive,
          nextRun,
          status: "IDLE",
        },
        update: {
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          isActive: input.isActive,
          nextRun,
          status: "IDLE",
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      await prisma.workflow.findUniqueOrThrow({
        where: { id: input.workflowId, userId: ctx.auth.user.id },
      });
      return prisma.scheduledWorkflow.delete({
        where: { workflowId: input.workflowId },
      });
    }),
});
