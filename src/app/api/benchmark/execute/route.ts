import { NextResponse } from "next/server";
import { inngest } from "@/app/inngest/client";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const isBenchmark = url.searchParams.get("benchmark") === "true";

    if (!isBenchmark) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await req.json();

    if (!workflowId) {
      return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Trigger execution via Inngest
    const { ids } = await inngest.send({
      name: "workflows/execute-workflow",
      data: {
        workflowId,
        initialData: {
          triggeredAt: new Date().toISOString(),
          triggerType: "benchmark",
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      executionId: ids[0] // We use the Inngest event ID as the execution handle for polling
    });
  } catch (error) {
    console.error("Benchmark execution error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
