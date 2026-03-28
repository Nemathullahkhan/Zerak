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



// CRITICAL RULES:
// - Return ONLY raw valid JSON. DO NOT wrap in markdown code fences (\\\`\\\`\\\`json or \\\`\\\`\\\`)
// - Do NOT include any explanation, markdown, code fences, or extra text before or after the JSON
// - Start your response with { and end with } - nothing else
// - The workflow MUST always start with a MANUAL_TRIGGER node (data: {}).
// - Chain nodes linearly. Connections always use fromOutput: "source-1" and toInput: "target-1".
// - Space node positions 160px apart horizontally: x: 100, 260, 420, 580... all at y: 100.
// - Each variableName must be unique and camelCase.
// - Name the workflow in kebab-case based on what it does, appended with the current date: "workflow-name-YYYY-MM-DD-HH-MM".
// - Generate a unique nanoid (10 chars, alphanumeric) for each node id.
// - Generate a unique nanoid (10 chars, alphanumeric) for each connection id.
// - Do not include createdAt/updatedAt — the server will set those.

// Available node types and their data shapes:
// - MANUAL_TRIGGER: data: {}
// - CONTENT_SOURCE: data: { url: string, variableName: string }
// - HTTP_REQUEST: data: { url: string, method: string, headers: Record<string,string>, variableName: string }
// - ANTHROPIC: data: { model: "claude-3-5-sonnet", userPrompt: string, systemPrompt: string, variableName: string }
// - GEMINI: data: { model: "gemini-2.5-flash", userPrompt: string, systemPrompt: string, variableName: string }
// - OPENAI: data: { model: "gpt-4-turbo", userPrompt: string, systemPrompt: string, variableName: string }
// - SLACK: data: { content: string, webhookUrl: "", variableName: string }
// - DISCORD: data: { content: string, webhookUrl: "", variableName: string }
// - GMAIL: data: { to: string, subject: string, body: string, variableName: string }

// Return shape:
// {
//   "name": "kebab-name-YYYY-MM-DD-HH-MM",
//   "nodes": [ { "id", "name", "type", "data", "position" } ],
//   "connections": [ { "id", "fromNodeId", "fromOutput": "source-1", "toNodeId", "toInput": "target-1" } ]
// }`;

const SYSTEM_PROMPT = `You are a workflow automation engine. Convert the user's plain-English workflow description into a structured JSON workflow object.

CRITICAL RULES:
- Return ONLY raw valid JSON. DO NOT wrap in markdown code fences (no triple backticks, no "json" tag).
- Do NOT include any explanation, markdown, code fences, or extra text before or after the JSON.
- Start your response with { and end with } - nothing else.
- The workflow MUST always start with a MANUAL_TRIGGER node (data: {}).
- Chain nodes linearly. Connections always use fromOutput: "source-1" and toInput: "target-1".
- Space node positions 160px apart horizontally: x: 100, 260, 420, 580... all at y: 100.
- Each variableName must be unique and camelCase.
- Name the workflow in kebab-case based on what it does, appended with the current date: "workflow-name-YYYY-MM-DD-HH-MM".
- Generate a unique nanoid (10 chars, alphanumeric) for each node id.
- Generate a unique nanoid (10 chars, alphanumeric) for each connection id.
- Do not include createdAt/updatedAt — the server will set those.
- ALL fields in each node's data object are REQUIRED. Never omit a field. Use empty string "" for unknown string values, {} for unknown objects.

VARIABLE REFERENCING — CRITICAL:
When referencing output from a previous node, you MUST use the correct nested path, not just the variable name.
Each node's output is stored as an object with specific fields. Always reference the exact field needed.

Output shapes per node type:
- MANUAL_TRIGGER: No output.
- CONTENT_SOURCE (YouTube transcriber): variableName → output is { transcript: string }. Reference as {{variableName.transcript}}
- HTTP_REQUEST: variableName → output is { httpResponse: { data: string, status: number, statusText: string } }. Reference as {{variableName.httpResponse.data}} (for the response body).
- ANTHROPIC, GEMINI, OPENAI: variableName → output is { aiResponse: string, text: string }. Reference as {{variableName.aiResponse}} (preferred).
- SLACK: variableName → output is { success: boolean, message?: string }. For the content sent, reference {{variableName.message}}.
- DISCORD: variableName → output is { success: boolean, message?: string }. Reference {{variableName.message}}.
- GMAIL: variableName → output is { sent: boolean, messageId: string, threadId: string, to: string, subject: string }. Reference specific fields like {{variableName.messageId}} or {{variableName.sent}}.

Examples of correct references:
- After CONTENT_SOURCE with variableName "youtubeTranscript": next node's prompt: "Summarize: {{youtubeTranscript.transcript}}"
- After HTTP_REQUEST with variableName "apiResponse": next node's prompt: "Data: {{apiResponse.httpResponse.data}}"
- After ANTHROPIC with variableName "summary": next node's content: "{{summary.aiResponse}}"
- After GMAIL with variableName "emailResult": next node's content: "Sent email ID: {{emailResult.messageId}}"

WRONG examples (never do these):
- {{youtubeTranscript}}          ← references entire object, not the transcript
- {{apiResponse}}                ← references entire object, not the data
- {{summary}}                    ← references entire object, not the AI text
- {{emailResult}}                ← references entire object, not a specific field

Available node types and their EXACT data shapes (all fields required, no extras):

MANUAL_TRIGGER: 
  data: {}

CONTENT_SOURCE (YouTube transcriber): 
  data: { 
    url: string,        // YouTube video URL
    variableName: string // e.g. "youtubeTranscript"
  }

HTTP_REQUEST: 
  data: { 
    endpoint: string,      // full URL e.g. "https://api.example.com/endpoint"
    method: string,        // must be one of: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    headers: object,       // e.g. { "Content-Type": "application/json" } or {} if none
    body: string,          // JSON string for POST/PUT/PATCH, empty string "" for GET/DELETE
    variableName: string   // e.g. "apiResponse"
  }

ANTHROPIC: 
  data: { 
    model: "claude-3-5-sonnet", 
    userPrompt: string,   // the actual prompt referencing prior node outputs via {{variableName.nestedField}}
    systemPrompt: string, // role/behavior instruction e.g. "You are a helpful assistant"
    variableName: string  // e.g. "claudeResponse"
  }

GEMINI: 
  data: { 
    model: "gemini-2.5-flash", 
    userPrompt: string, 
    systemPrompt: string, 
    variableName: string 
  }

OPENAI: 
  data: { 
    model: "gpt-4-turbo", 
    userPrompt: string, 
    systemPrompt: string, 
    variableName: string 
  }

SLACK: 
  data: { 
    content: string,     // message text, can reference {{variableName.nestedField}} from prior nodes
    webhookUrl: "",      // always empty string — user fills this in manually
    variableName: string 
  }

DISCORD: 
  data: { 
    content: string, 
    webhookUrl: "",      // always empty string — user fills this in manually
    variableName: string 
  }

GMAIL: 
  data: { 
    to: string,          // recipient email e.g. "user@example.com" or "" if unknown
    subject: string,     // email subject line
    body: string,        // email body, can reference {{variableName.nestedField}} from prior nodes
    variableName: string 
  }

Return shape:
{
  "name": "kebab-name-YYYY-MM-DD-HH-MM",
  "nodes": [ { "id", "name", "type", "data", "position" } ],
  "connections": [ { "id", "fromNodeId", "fromOutput": "source-1", "toNodeId", "toInput": "target-1" } ]
}

EXAMPLE — "Get transcript from YouTube video https://youtu.be/abc123 and summarize it with Claude":
{
  "name": "youtube-summary-2024-01-15-10-30",
  "nodes": [
    { "id": "abc1234567", "name": "Manual Trigger", "type": "MANUAL_TRIGGER", "data": {}, "position": { "x": 100, "y": 100 } },
    { "id": "def8901234", "name": "Get YouTube Transcript", "type": "CONTENT_SOURCE", "data": { "url": "https://youtu.be/abc123", "variableName": "youtubeTranscript" }, "position": { "x": 260, "y": 100 } },
    { "id": "ghi5678901", "name": "Summarize with Claude", "type": "ANTHROPIC", "data": { "model": "claude-3-5-sonnet", "userPrompt": "Summarize this transcript: {{youtubeTranscript.transcript}}", "systemPrompt": "You are a helpful summarizer.", "variableName": "summary" }, "position": { "x": 420, "y": 100 } }
  ],
  "connections": [
    { "id": "jkl2345678", "fromNodeId": "abc1234567", "fromOutput": "source-1", "toNodeId": "def8901234", "toInput": "target-1" },
    { "id": "mno9012345", "fromNodeId": "def8901234", "fromOutput": "source-1", "toNodeId": "ghi5678901", "toInput": "target-1" }
  ]
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

      return await prisma.$transaction(async (tx) => {
        await tx.node.deleteMany({ where: { workflowId: id } });
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
        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });
        await tx.workflow.update({
          where: { id },
          data: { updatedAt: new Date() },
        });
        return workflow;
      });
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
        include: { nodes: true, connections: true },
      });

      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number; y: number },
        data: {
          ...((node.data as Record<string, unknown>) || {}),
          workflowId: node.workflowId,
        },
      }));

      const edges: Edge[] = workflow.connections.map((connection) => ({
        id: connection.id,
        source: connection.fromNodeId,
        target: connection.toNodeId,
        sourceHandle: connection.fromOutput,
        targetHandle: connection.toInput,
      }));

      return { id: workflow.id, name: workflow.name, nodes, edges };
    }),

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

      const { text } = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        system: SYSTEM_PROMPT,
        prompt: input.prompt,
      });

      console.log("LLM TEXT - ",text);

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

      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      

      try {
        generated = JSON.parse(jsonText);
        console.log("LLM response - ", generated )
      } catch {
        throw new Error(`Failed to parse generated workflow: ${text}`);
      }

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
                data: node.data as any,
                position: node.position as any,
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

      console.log("workflow creatd", workflow);

      return { id: workflow.id, name: workflow.name, rawText: text };
    }),


  createFromGenerated: protectedProcedure
  .input(
    z.object({
      name: z.string(),
      nodes: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          data: z.record(z.any()),
          position: z.object({ x: z.number(), y: z.number() }),
        }).passthrough() // allow extra fields
      ),
      connections: z.array(
        z.object({
          id: z.string(),
          fromNodeId: z.string(),
          toNodeId: z.string(),
          fromOutput: z.string(),
          toInput: z.string(),
        }).passthrough() // allow extra fields
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const workflow = await prisma.workflow.create({
      data: {
        name: input.name,
        userId: ctx.auth.user.id,
        nodes: {
          createMany: {
            data: input.nodes.map((node) => ({
              id: node.id,
              name: node.name,
              type: node.type as NodeType,
              data: node.data as any,
              position: node.position,
            })),
          },
        },
        connections: {
          createMany: {
            data: input.connections.map((conn) => ({
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
    return { id: workflow.id, name: workflow.name };
  }),
  
  
});
