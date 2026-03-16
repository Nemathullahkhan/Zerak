import Handlebars from "handlebars";
import { decode } from "html-entities";

// Register {{json variable}} helper for stringifying objects
Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

/**
 * Resolves a Handlebars template string against the workflow context.
 * Supports:
 *   {{variableName}}           → simple value
 *   {{json variableName}}      → JSON stringified object
 *   {{variableName.nested}}    → dot-notation path
 */
export function resolveTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  const compiled = Handlebars.compile(template);
  const raw = compiled(context);
  return decode(raw); // decode HTML entities Handlebars may encode
}
