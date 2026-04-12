import { NextResponse } from "next/server";
import toposort from "toposort";

const TEMPLATE_ROOT = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;

type LooseConn = {
  fromNodeId?: string;
  toNodeId?: string;
  source?: string;
  target?: string;
};

type LooseNode = {
  id?: string;
  type?: string;
  data?: Record<string, unknown>;
};

function walkStrings(obj: unknown, cb: (s: string) => void): void {
  if (typeof obj === "string") cb(obj);
  else if (Array.isArray(obj)) obj.forEach((x) => walkStrings(x, cb));
  else if (obj && typeof obj === "object")
    for (const v of Object.values(obj)) walkStrings(v, cb);
}

function collectDeclaredRootVars(nodes: LooseNode[]): Set<string> {
  const s = new Set<string>(["item"]);
  for (const n of nodes) {
    if (n.type === "GOOGLE_FORM_TRIGGER") s.add("formData");
    if (n.type === "STRIPE_TRIGGER") s.add("event");
    const d = n.data;
    if (!d || typeof d !== "object") continue;
    if (typeof d.variableName === "string" && d.variableName.trim())
      s.add(d.variableName.trim());
    if (
      n.type === "LOOP" &&
      typeof d.itemVariable === "string" &&
      d.itemVariable.trim()
    )
      s.add(d.itemVariable.trim());
    if (typeof d.sourceVariable === "string" && d.sourceVariable.trim()) {
      const root = d.sourceVariable.trim().split(".")[0];
      if (root) s.add(root);
    }
  }
  return s;
}

function validateVariableReferences(
  nodes: LooseNode[],
  errors: Array<{ code: string; message: string; nodeId?: string }>,
) {
  const declared = collectDeclaredRootVars(nodes);
  for (const node of nodes) {
    if (!node.data) continue;
    walkStrings(node.data, (str) => {
      TEMPLATE_ROOT.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = TEMPLATE_ROOT.exec(str)) !== null) {
        const root = m[1];
        if (!declared.has(root)) {
          errors.push({
            code: "Bad variable reference",
            message: `Template references unknown root "{{${root}}}"`,
            nodeId: node.id,
          });
        }
      }
    });
  }
}

/**
 * Validates a workflow structure for benchmarking.
 * Checks for cycles, orphaned nodes, trigger consistency, and obvious template variable issues.
 */
function validateWorkflow(nodes: LooseNode[], connections: LooseConn[]) {
  const errors: Array<{ code: string; message: string; nodeId?: string }> = [];

  if (connections.length > 0) {
    const edges: [string, string][] = connections.map((conn) => [
      conn.fromNodeId || conn.source || "",
      conn.toNodeId || conn.target || "",
    ]);
    try {
      toposort(edges);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cyclic")) {
        errors.push({ code: "Cycle", message: "Workflow contains a cycle" });
      }
    }
  }

  const triggers = nodes.filter((n) => String(n.type).includes("TRIGGER"));
  if (triggers.length === 0) {
    errors.push({
      code: "No trigger",
      message: "Workflow must have at least one trigger",
    });
  } else if (triggers.length > 1) {
    errors.push({
      code: "Multiple triggers",
      message: "Workflow cannot have more than one trigger",
    });
  }

  const connectedNodeIds = new Set<string>();
  connections.forEach((conn) => {
    const a = conn.fromNodeId || conn.source;
    const b = conn.toNodeId || conn.target;
    if (a) connectedNodeIds.add(a);
    if (b) connectedNodeIds.add(b);
  });

  if (nodes.length > 1) {
    nodes.forEach((node) => {
      if (node.id && !connectedNodeIds.has(node.id)) {
        errors.push({
          code: "Orphan node",
          message: `Node ${node.id} is not connected`,
          nodeId: node.id,
        });
      }
    });
  }

  validateVariableReferences(nodes, errors);

  return errors;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nodes, connections } = body;

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid nodes" }, { status: 400 });
    }

    const errors = validateWorkflow(nodes, connections || []);

    return NextResponse.json({
      isValid: errors.length === 0,
      errors,
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
