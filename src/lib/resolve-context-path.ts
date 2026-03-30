/**
 * Resolve a value from execution context by key or dot path (e.g. rankedJobs.jobs).
 * Strips mistaken Handlebars fragments often pasted from prompts ({{json path}}).
 */
export function resolveContextPath(
  context: Record<string, unknown>,
  raw: string,
): unknown {
  let path = raw.trim();
  if (path.startsWith("{{") && path.endsWith("}}")) {
    path = path.slice(2, -2).trim();
  }
  if (path.startsWith("json ")) {
    path = path.slice(5).trim();
  }

  if (!path.includes(".")) {
    return context[path];
  }

  const parts = path.split(".").filter(Boolean);
  let cur: unknown = context;
  for (const key of parts) {
    if (cur == null || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}
