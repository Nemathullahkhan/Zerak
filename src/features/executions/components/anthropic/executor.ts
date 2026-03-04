import { NodeExecutor } from "@/features/executions/types";
import Handlebars from "handlebars";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { anthropicChannel } from "@/app/inngest/channels/anthropic";

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

type AnthropicData = {
  variableName?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const AnthropicExecutor: NodeExecutor<AnthropicData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    anthropicChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Anthropic node: Variable Name is missing!");
  }

  if (!data.userPrompt) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Anthropic node: User Prompt is missing!");
  }

  // TODO: Fetch credential that user selected
  const credentialValue = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant";

  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const anthropic = createAnthropic({
    apiKey: credentialValue,
  });

  try {
    const result = await step.ai.wrap("anthropic-generate-text", generateText, {
      model: anthropic(data.model || "claude-3-5-sonnet"),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    await publish(
      anthropicChannel().status({
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
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );

    throw error;
  }
};
