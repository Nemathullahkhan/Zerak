import { InitialNode } from "@/components/initial-node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { CodeNode } from "@/features/executions/components/code/node";
import { ContentSourceNode } from "@/features/executions/components/content-source/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { FilterNode } from "@/features/executions/components/filter/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { MistralNode } from "@/features/executions/components/mistral/node";
import { GmailNode } from "@/features/executions/components/gmail/node";
import { GoogleDriveNode } from "@/features/executions/components/google-drive/node";
import { GoogleSheetsNode } from "@/features/executions/components/google-sheet/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { IfConditionNode } from "@/features/executions/components/if-condition/node";
import { LoopNode } from "@/features/executions/components/loop/node";
import { OpenAiNode } from "@/features/executions/components/openai/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { SwitchNode } from "@/features/executions/components/switch/node";
import { GoogleFormTrigger } from "@/features/triggers/components/google-form-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { NodeType } from "@/generated/prisma/enums";
import { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.IF]: IfConditionNode,
  [NodeType.SWITCH]: SwitchNode,
  [NodeType.CODE]: CodeNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.MISTRAL]: MistralNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.CONTENT_SOURCE]: ContentSourceNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.GMAIL]: GmailNode,
  [NodeType.GOOGLE_DRIVE]: GoogleDriveNode,
  [NodeType.GOOGLE_SHEETS]: GoogleSheetsNode,
  [NodeType.FILTER]: FilterNode,
  [NodeType.LOOP]: LoopNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
