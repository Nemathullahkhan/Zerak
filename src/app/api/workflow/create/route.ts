// app/api/workflow/create/route.ts
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import {
  remapGeneratedWorkflowIds,
  type IncomingGeneratedConnection,
  type IncomingGeneratedNode,
} from "@/lib/remap-generated-workflow-ids";
import { ensureGeneratedWorkflow } from "@/lib/ensure-generated-workflow";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const isBenchmark = url.searchParams.get("benchmark") === "true";

    let userId: string;

    if (isBenchmark) {
      // For benchmarks, we use a dedicated benchmark user or bypass auth
      // In a real research scenario, you'd have a 'benchmark-user' in the DB
      userId = "rtCTm1oS1UFJe1cO5cWnSLsQTds3heTP";

      // Ensure the benchmark user exists in the DB
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: "benchmark@zerak.ai",
          name: "Benchmark User",
        },
      });
    } else {
      const { user } = await requireAuth();
      userId = user.id;
    }

    const body = await req.json();
    const { name, nodes: rawNodes, connections: rawConnections } = body;

    if (!Array.isArray(rawNodes) || !Array.isArray(rawConnections)) {
      return NextResponse.json(
        { error: "Invalid payload: nodes and connections must be arrays" },
        { status: 400 },
      );
    }

    const { nodes, connections } = ensureGeneratedWorkflow(
      rawNodes as IncomingGeneratedNode[],
      rawConnections as IncomingGeneratedConnection[],
    );

    const { remappedNodes, remappedConnections } = remapGeneratedWorkflowIds(
      nodes as IncomingGeneratedNode[],
      connections as IncomingGeneratedConnection[],
    );

    const workflow = await prisma.workflow.create({
      data: {
        name,
        userId,
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
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 },
    );
  }
}
