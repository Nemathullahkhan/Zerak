import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";

export function getModel(forBenchmark = false) {
  // Use benchmark model if explicitly requested or if configured in env
  if (forBenchmark || process.env.BENCHMARK_MODEL === "mistral") {
    const mistral = createMistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
    return mistral("mistral-large-latest");
  }

  // Default to Anthropic for production
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Using the same model version as in route.ts
  return anthropic("claude-sonnet-4-5");
}
