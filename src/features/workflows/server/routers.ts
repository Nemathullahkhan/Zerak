import { generateSlug } from "random-word-slugs";
import { prisma } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { NodeType } from "@/generated/prisma/client";
import { Edge, Node } from "@xyflow/react";
import { sendWorkflowExecution } from "@/app/inngest/utils";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const SYSTEM_PROMPT = `You are a workflow automation engine. Convert the user's plain-English workflow description into a structured JSON workflow object.

RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code fences.
- The workflow MUST always start with a MANUAL_TRIGGER node (data: {}).
- Chain nodes linearly. Connections always use fromOutput: "source-1" and toInput: "target-1".
- Space node positions 160px apart horizontally: x: 100, 260, 420, 580... all at y: 100.
- Each variableName must be unique and camelCase.
- Name the workflow in kebab-case based on what it does, appended with the current date: "workflow-name-YYYY-MM-DD-HH-MM".
- Generate a unique nanoid (10 chars, alphanumeric) for each node id.
- Generate a unique nanoid (10 chars, alphanumeric) for each connection id.
- Do not include createdAt/updatedAt — the server will set those.

Available node types and their data shapes:
- MANUAL_TRIGGER: data: {}
- CONTENT_SOURCE: data: { url: string, variableName: string }
- HTTP_REQUEST: data: { url: string, method: string, headers: Record<string,string>, variableName: string }
- ANTHROPIC: data: { model: "claude-3-5-sonnet", userPrompt: string, systemPrompt: string, variableName: string }
- GEMINI: data: { model: "gemini-2.5-flash", userPrompt: string, systemPrompt: string, variableName: string }
- SLACK: data: { content: string, webhookUrl: "", variableName: string }

Return shape:
{
  "name": "kebab-name-YYYY-MM-DD-HH-MM",
  "nodes": [ { "id", "name", "type", "data", "position" } ],
  "connections": [ { "id", "fromNodeId", "fromOutput": "source-1", "toNodeId", "toInput": "target-1" } ]
}`;

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
      await sendWorkflowExecution({
        workflowId: input.id,
      });
      return workflow;
    }),
  // Create workflow
  create: protectedProcedure.mutation(({ ctx }) => {
    return prisma.workflow.create({
      data: {
        name: generateSlug(3),
        userId: ctx.auth.user.id,
        nodes: {
          createMany: {
            data: [
              {
                type: NodeType.INITIAL,
                position: { x: 0, y: 0 },
                name: NodeType.INITIAL,
              },
            ],
          },
        },
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

  //// Update  workflow
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string().nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.any().optional()),
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id, userId: ctx.auth.user.id },
      });

      // Transaction to ensure consistency
      return await prisma.$transaction(async (tx) => {
        // Delete existing nodes and connections
        await tx.node.deleteMany({ where: { workflowId: id } });
        // Create new nodes
        await tx.node.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name: node.data.name || "unknown",
            type: node.type as NodeType,
            position: node.position,
            data: node.data || {},
          })),
        });
        // Create connection
        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });
        // update workflow's updatedAt timestamptil
        await tx.workflow.update({
          where: { id },
          data: { updatedAt: new Date() },
        });
        return workflow;
      });
    }),
  // GEt one
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
        include: { nodes: true, connections: true },
      });
      // Transforming server nodes to react-flow compatible nodes
      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number; y: number },
        data: (node.data as Record<string, unknown>) || {},
      }));

      // Transforming connections to react-flow compatible edges
      const edges: Edge[] = workflow.connections.map((connection) => ({
        id: connection.id,
        source: connection.fromNodeId,
        target: connection.toNodeId,
        sourceHandle: connection.fromOutput,
        targetHandle: connection.toInput,
      }));

      return { id: workflow.id, name: workflow.name, nodes, edges };
    }),
  // Get Many
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.workflow.count({
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),

  generateFromPrompt: protectedProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Step 1: Get response from Anthropic
      const { text } = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        system: SYSTEM_PROMPT,
        prompt: input.prompt,
      });
      // Step 2: Parse the generated workflow JSON
      let generated: {
        name: string;
        nodes: Array<{
          id: string;
          name: string;
          type: string;
          data: Record<string, unknown>;
          position: { x: number; y: number };
        }>;
        connections: Array<{
          id: string;
          fromNodeId: string;
          toNodeId: string;
          fromOutput: string;
          toInput: string;
        }>;
      };

      try {
        generated = JSON.parse(text);
      } catch {
        throw new Error(`Failed to parse generated workflow: ${text}`);
      }

      // Step 3: Create the workflow in DB
      const workflow = await prisma.workflow.create({
        data: {
          name: generated.name,
          userId: ctx.auth.user.id,
          nodes: {
            createMany: {
              data: generated.nodes.map((node) => ({
                id: node.id,
                name: node.name,
                type: node.type as NodeType,
                data: node.data,
                position: node.position,
              })),
            },
          },
          connections: {
            createMany: {
              data: generated.connections.map((conn) => ({
                id: conn.id,
                fromNodeId: conn.fromNodeId,
                toNodeId: conn.toNodeId,
                fromOutput: conn.fromOutput,
                toInput: conn.toInput,
              })),
            },
          },
        },
      });

      // Step 4: Return id + raw text so the frontend can display it
      return { id: workflow.id, name: workflow.name, rawText: text };
    }),
});
