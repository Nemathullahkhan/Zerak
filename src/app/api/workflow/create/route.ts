// app/api/workflow/create/route.ts
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import {
  remapGeneratedWorkflowIds,
  type IncomingGeneratedConnection,
  type IncomingGeneratedNode,
} from "@/lib/remap-generated-workflow-ids";

export async function POST(req: Request) {
  try {
    const { user } = await requireAuth();
    const body = await req.json();
    const { name, nodes, connections } = body;

    if (!Array.isArray(nodes) || !Array.isArray(connections)) {
      return NextResponse.json(
        { error: "Invalid payload: nodes and connections must be arrays" },
        { status: 400 },
      );
    }

    const { remappedNodes, remappedConnections } = remapGeneratedWorkflowIds(
      nodes as IncomingGeneratedNode[],
      connections as IncomingGeneratedConnection[],
    );

    const workflow = await prisma.workflow.create({
      data: {
        name,
        userId: user.id,
        nodes: {
          createMany: {
            data: remappedNodes,
          },
        },
        connections: {
          createMany: {
            data: remappedConnections,
          },
        },
      },
    });

    return NextResponse.json({ id: workflow.id });
  } catch (error) {
    console.error("Error creating workflow:", error);
    if (error instanceof Error) {
      if (error.message === "DUPLICATE_NODE_ID") {
        return NextResponse.json(
          { error: "Duplicate node id in payload" },
          { status: 400 },
        );
      }
      if (error.message === "UNKNOWN_CONNECTION_NODE") {
        return NextResponse.json(
          { error: "Connection references unknown node id" },
          { status: 400 },
        );
      }
    }
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}
