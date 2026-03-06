import { NodeExecutor } from "@/features/executions/types";
import Handlebars from "handlebars";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { openaiChannel } from "@/app/inngest/channels/openai";
import { prisma } from "@/lib/db";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

function extractTextFromSteps(result: unknown): string {
  const steps = (
    result as { steps?: Array<{ content?: Array<{ text?: string }> }> }
  )?.steps;
  if (!Array.isArray(steps) || steps.length === 0) return "";
  const last = steps[steps.length - 1];
  const content = last?.content;
  if (!Array.isArray(content)) return "";
  const textPart = content.find((c) => c?.text != null);
  return textPart?.text ?? "";
}

type OpenAiData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const OpenAiExecutor: NodeExecutor<OpenAiData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    openaiChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("OpenAi node: Variable Name is missing!");
  }

  if (!data.credentialId) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("OpenAi node: Credential is required!");
  }

  if (!data.userPrompt) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("OpenAi node: User Prompt is missing!");
  }

  const credential = await step.run("get-credential", () => {
    return prisma.credential.findUnique({
      where: {
        id: data.credentialId,
      },
    });
  });

  if (!credential) {
    throw new NonRetriableError("OpenAI node: Credential is required!");
  }

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant";

  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const openai = createOpenAI({
    apiKey: credential.value,
  });

  try {
    const result = await step.ai.wrap("openai-generate-text", generateText, {
      model: openai(data.model || "gpt-4o"),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    await publish(
      openaiChannel().status({
        nodeId,
        status: "success",
      }),
    );

    const text =
      result?.text ??
      (result as { _output?: string })?._output ??
      extractTextFromSteps(result);
    const outputText = text != null && text !== "" ? String(text) : "";
    return {
      ...context,
      [data.variableName]: {
        aiResponse: outputText,
        text: outputText, // same value, so {{variableName.text}} works as shown in the UI
      },
    };
  } catch (error) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      }),
    );

    throw error;
  }
};
