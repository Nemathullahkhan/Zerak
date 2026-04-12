import { streamText } from "ai";
import { NextResponse } from "next/server";
import { STREAMING_SYSTEM_PROMPT } from "@/lib/prompts";
import { getModel } from "@/lib/benchmark-model";

export const runtime = "edge"; // optional, improves streaming performance

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    const url = new URL(req.url);
    const isBenchmark = url.searchParams.get("benchmark") === "true";

    const result = streamText({
      model: getModel(isBenchmark),
      system: STREAMING_SYSTEM_PROMPT,
      prompt,
      temperature: isBenchmark ? 0 : 0.7,
      maxOutputTokens: isBenchmark ? 8192 : 4096,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Streaming error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
