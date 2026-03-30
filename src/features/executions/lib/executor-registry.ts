import { NodeType } from "@/generated/prisma/enums";
import { NodeExecutor } from "../types";
import { contentSourceExecutor } from "../components/content-source/executor";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { OpenAiExecutor } from "../components/openai/executor";
import { AnthropicExecutor } from "../components/anthropic/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";
import { gmailExecutor } from "../components/gmail/executor";
import { ifConditionExecutor } from "../components/if-condition/executor";
import { switchExecutor } from "../components/switch/executor";
import { codeExecutor } from "../components/code/executor";
import { googleDriveExecutor } from "../components/google-drive/executor";
import { googleSheetsExecutor } from "../components/google-sheet/executor";
import { filterExecutor } from "../components/filter/executor";
import { loopExecutor } from "../components/loop/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor, // TODO: fix types
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: manualTriggerExecutor, //TODO: ADD STRIPE EXECUTOR
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: AnthropicExecutor, // TODO: FIX later
  [NodeType.OPENAI]: OpenAiExecutor, // TODO: FIX later
  [NodeType.CONTENT_SOURCE]: contentSourceExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.SLACK]: slackExecutor,
  [NodeType.GMAIL]: gmailExecutor,
  [NodeType.GOOGLE_DRIVE]: googleDriveExecutor,
  [NodeType.IF]: ifConditionExecutor,
  [NodeType.CODE]: codeExecutor,
  [NodeType.SWITCH]: switchExecutor,
  [NodeType.GOOGLE_SHEETS]: googleSheetsExecutor,
  [NodeType.FILTER]: filterExecutor, // TODO: add filter executor
  [NodeType.LOOP]: loopExecutor, // TODO: add loop executor
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }
  return executor;
};
