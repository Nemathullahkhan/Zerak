import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { executionId: string } }
) {
  try {
    const url = new URL(req.url);
    const isBenchmark = url.searchParams.get("benchmark") === "true";

    if (!isBenchmark) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { executionId } = params;

    if (!executionId) {
      return NextResponse.json({ error: "Missing executionId" }, { status: 400 });
    }

    // Polling based on inngestEventId which is stored in Execution record
    const execution = await prisma.execution.findUnique({
      where: { inngestEventId: executionId },
    });

    if (!execution) {
      return NextResponse.json({ status: "PENDING" });
    }

    return NextResponse.json({ 
      status: execution.status,
      output: execution.output,
      error: execution.error,
      completedAt: execution.completedAt,
    });
  } catch (error) {
    console.error("Benchmark status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
