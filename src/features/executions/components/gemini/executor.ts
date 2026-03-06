import { NodeExecutor } from "@/features/executions/types";
import Handlebars from "handlebars";
import { geminiChannel } from "@/app/inngest/channels/gemini";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

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

type GeminiData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const geminiExecutor: NodeExecutor<GeminiData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(
    geminiChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: Variable Name is missing!");
  }

  if (!data.credentialId) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: Credential is required!");
  }

  if (!data.userPrompt) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: User Prompt is missing!");
  }

  const credential = await step.run("get-credential", () => {
    return prisma.credential.findUnique({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    throw new NonRetriableError("Gemini node: Credential is required!");
  }

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant";

  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const google = createGoogleGenerativeAI({
    apiKey: decrypt(credential.value),
  });

  try {
    const result = await step.ai.wrap("gemini-generate-text", generateText, {
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });
    console.log(`GEMINI VALUE - decrypt(credential.value)`);

    await publish(
      geminiChannel().status({
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
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );

    throw error;
  }
};
