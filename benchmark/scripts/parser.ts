export function extractJsonObjects(text: string): any[] {
  const objects: any[] = [];
  let depth = 0, startIndex = -1, inString = false, escapeNext = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escapeNext) escapeNext = false;
      else if (c === '\\') escapeNext = true;
      else if (c === '"') inString = false;
    } else {
      if (c === '"') inString = true;
      else if (c === '{') { if (depth === 0) startIndex = i; depth++; }
      else if (c === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          try { objects.push(JSON.parse(text.substring(startIndex, i + 1))); } catch (e) {}
          startIndex = -1;
        }
      }
    }
  }
  return objects;
}

export function parseStreamedWorkflow(raw: string) {
  let nodes: any[] = [];
  let connections: any[] = [];
  const objs = extractJsonObjects(raw);
  for (const obj of objs) {
    if (obj.type === "partial_nodes" && Array.isArray(obj.nodes)) nodes = obj.nodes;
    if (obj.type === "connections" && Array.isArray(obj.connections)) connections = obj.connections;
    if (obj.type === "final" && obj.workflow) {
      if (Array.isArray(obj.workflow.nodes)) nodes = obj.workflow.nodes;
      if (Array.isArray(obj.workflow.connections)) connections = obj.workflow.connections;
    }
  }
  return { nodes, connections };
}

export async function fetchWorkflowFromNLP(prompt: string, promptId: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/workflow/stream?benchmark=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error(`Streaming failed: ${response.statusText}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader");
  let content = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    content += decoder.decode(value, { stream: true });
  }
  
  return parseStreamedWorkflow(content);
}
