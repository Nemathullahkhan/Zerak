import { generateSlug } from "random-word-slugs";
import { prisma } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const workflowsRouter = createTRPCRouter({
  // Create workflow
  create: protectedProcedure.mutation(({ ctx }) => {
    return prisma.workflow.create({
      data: {
        name: generateSlug(3),
        userId: ctx.auth.user.id,
      },
    });
  }),
  // Delete workflow
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.workflow.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
    }),
  //// Update Name of workflow
  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return prisma.workflow.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        data: {
          name: input.name,
        },
      });
    }),
  // GEt one
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return prisma.workflow.findUnique({
        where: { id: input.id, userId: ctx.auth.user.id },
      });
    }),
  // Get Many
  getMany: protectedProcedure.query(({ ctx }) => {
    return prisma.workflow.findMany({
      where: { userId: ctx.auth.user.id },
      // TODO - versioning and pagination
    });
  }),
});
