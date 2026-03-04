import { NodeExecutor } from "@/features/executions/types";
import { contentSourceChannel } from "@/app/inngest/channels/content-source";
import { NonRetriableError } from "inngest";
import { YoutubeTranscript } from "youtube-transcript-plus";

type ContentSourceData = {
  variableName?: string;
  url?: string;
};

const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;

function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  try {
    if (trimmed.includes("youtu.be/")) {
      const id = trimmed.split("youtu.be/")[1]?.split("?")[0]?.trim();
      return id && id.length === 11 ? id : null;
    }
    const u = new URL(trimmed);
    if (u.hostname?.includes("youtube.com") && u.searchParams.has("v")) {
      const id = u.searchParams.get("v")?.trim();
      return id && id.length === 11 ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export const contentSourceExecutor: NodeExecutor<ContentSourceData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    contentSourceChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    await publish(
      contentSourceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "Content Source node: Variable Name is required",
    );
  }

  if (!data.url || typeof data.url !== "string") {
    await publish(
      contentSourceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Content Source node: YouTube URL is required");
  }

  const trimmedUrl = data.url.trim();
  if (!YOUTUBE_URL_PATTERN.test(trimmedUrl)) {
    await publish(
      contentSourceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "Content Source node: Invalid YouTube URL format",
    );
  }

  const videoId = extractVideoId(trimmedUrl);
  if (!videoId) {
    await publish(
      contentSourceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "Content Source node: Could not extract video ID from URL.",
    );
  }

  try {
    const stepId = `content-source-fetch-transcript-v2-${videoId}`;
    const result = await step.run(stepId, async () => {
      const maxAttempts = 2;
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const transcriptItems = await YoutubeTranscript.fetchTranscript(
            videoId,
            {
              userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          );
          const transcript = transcriptItems
            .map((item) => item.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          return {
            transcript,
            title: undefined as string | undefined,
          };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
      throw lastError ?? new Error("Failed to fetch transcript");
    });

    if (!result.transcript || result.transcript.length === 0) {
      await publish(
        contentSourceChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw new NonRetriableError(
        "No transcript available for this video. The video may have captions disabled, or YouTube may be blocking requests from this environment (common in serverless). Try a different video with captions or run the workflow locally.",
      );
    }

    await publish(
      contentSourceChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: {
        transcript: result.transcript,
        title: result.title,
      },
    };
  } catch (error) {
    await publish(
      contentSourceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    const message =
      error instanceof Error ? error.message : "Failed to fetch transcript";
    throw new NonRetriableError(
      `Content Source node: ${message}. The video may have captions disabled or be unavailable.`,
    );
  }
};
