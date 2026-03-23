import { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { ifConditionChannel } from "@/app/inngest/channels/if-condition";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

// ─── Types ────────────────────────────────────────────────────────────────────

type IfConditionData = {
  variableName?: string;
  condition?: string;
};

// ─── Operator table ───────────────────────────────────────────────────────────

// Longest first to avoid ">" matching ">="
const BINARY_OPS: [string, (a: unknown, b: unknown) => boolean][] = [
  ["===", (a, b) => a === b],
  ["!==", (a, b) => a !== b],
  ["==", (a, b) => a == b], // eslint-disable-line eqeqeq
  ["!=", (a, b) => a != b], // eslint-disable-line eqeqeq
  [">=", (a, b) => Number(a) >= Number(b)],
  ["<=", (a, b) => Number(a) <= Number(b)],
  [">", (a, b) => Number(a) > Number(b)],
  ["<", (a, b) => Number(a) < Number(b)],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNumeric(v: string) {
  return v.trim() !== "" && !isNaN(Number(v));
}

/**
 * Coerces a resolved Handlebars string token into its natural JS primitive.
 * Handlebars always produces strings — "true" → true, "42" → 42, etc.
 */
function coerce(raw: string): unknown {
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (v === "undefined") return undefined;
  if (isNumeric(v)) return Number(v);
  return v;
}

/**
 * Safely evaluates a resolved expression string.
 * No eval / Function — only parses the known operator set above.
 */
function safeEval(expression: string): boolean {
  const trimmed = expression.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  for (const [op, fn] of BINARY_OPS) {
    const idx = trimmed.indexOf(op);
    if (idx === -1) continue;

    const leftRaw = trimmed.slice(0, idx).trim();
    const rightRaw = trimmed.slice(idx + op.length).trim();
    if (!leftRaw || !rightRaw) continue;

    return fn(coerce(leftRaw), coerce(rightRaw));
  }

  // Bare value — truthy check
  const coerced = coerce(trimmed);
  return (
    Boolean(coerced) && coerced !== 0 && coerced !== "" && coerced !== null
  );
}

// ─── Executor ─────────────────────────────────────────────────────────────────

export const ifConditionExecutor: NodeExecutor<IfConditionData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(ifConditionChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("if-condition", async () => {
      if (!data.variableName) {
        await publish(ifConditionChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("IF node: variableName is required");
      }

      if (!data.condition) {
        await publish(ifConditionChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("IF node: condition is required");
      }

      const resolved = Handlebars.compile(data.condition)(context);
      const evalResult = safeEval(resolved);
      const branch = evalResult ? "true" : "false";

      return {
        ...context,
        [data.variableName]: {
          condition: data.condition,
          resolved,
          result: evalResult,
          branch,
        },
        __branch__: { type: "if", taken: branch },
      };
    });

    await publish(ifConditionChannel().status({ nodeId, status: "success" }));

    return result;
  } catch (error) {
    await publish(ifConditionChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
