import { inngest } from "@/app/inngest/client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { sleep } from "@trpc/server/unstable-core-do-not-import";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const google = createGoogleGenerativeAI();
const openai = createOpenAI();
const anthropic = createAnthropic();

export const execute = inngest.createFunction(
  { id: "execute" },
  { event: "execute-ai" },
  async ({ event, step }) => {
    await step.sleep("pretend", "5s");

    const { steps: geminiSteps } = await step.ai.wrap(
      "gemini-generate-text",
      generateText,
      {
        model: google("gemini-2.5-flash"),
        system: "You are a helpful assistant.",
        prompt: "What is 2+2?",
      },
    );

    const { steps: openAiSteps } = await step.ai.wrap(
      "openai-generate-text",
      generateText,
      {
        model: openai("gpt-4o"),
        system: "You are a helpful assistant.",
        prompt: "What is 2+2?",
      },
    );

    const { steps: anthropicSteps } = await step.ai.wrap(
      "anthropic-generate-text",
      generateText,
      {
        model: anthropic("claude-3-5-sonnet-20241022"),
        system: "You are a helpful assistant.",
        prompt: "What is 2+2?",
      },
    );

    return {
      geminiSteps,
      openAiSteps,
      anthropicSteps,
    };
  },
);
