// app/api/workflow/create/route.ts
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { NodeType } from "@/generated/prisma/enums";

export async function POST(req: Request) {
  try {
    const { user } = await requireAuth(); // Destructure user from the returned object
    const body = await req.json();
    const { name, nodes, connections } = body;

    const workflow = await prisma.workflow.create({
      data: {
        name,
        userId: user.id, // Now user.id is accessible
        nodes: {
          createMany: {
            data: nodes.map((node: any) => ({
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
            data: connections.map((conn: any) => ({
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

    return NextResponse.json({ id: workflow.id });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}