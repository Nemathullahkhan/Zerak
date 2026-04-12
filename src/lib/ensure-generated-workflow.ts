import { createId } from "@paralleldrive/cuid2";

type IncomingNode = {
  id: string;
  name: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
};

type IncomingConn = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromOutput?: string;
  toInput?: string;
};

function hasTriggerNode(nodes: IncomingNode[]): boolean {
  return nodes.some((n) => String(n.type).includes("TRIGGER"));
}

function normalizeConnection(c: IncomingConn): IncomingConn {
  return {
    id: c.id || createId(),
    fromNodeId: c.fromNodeId,
    toNodeId: c.toNodeId,
    fromOutput: c.fromOutput ?? "source-1",
    toInput: c.toInput ?? "target-1",
  };
}

function edgeKey(from: string, to: string) {
  return `${from}\0${to}`;
}

function hasDirectedEdge(
  conns: IncomingConn[],
  fromId: string,
  toId: string,
): boolean {
  return conns.some((c) => c.fromNodeId === fromId && c.toNodeId === toId);
}

/**
 * LLM output often omits triggers, handles, or edges. Normalize before remap/persist.
 */
export function ensureGeneratedWorkflow(
  nodes: IncomingNode[],
  connections: IncomingConn[],
): { nodes: IncomingNode[]; connections: IncomingConn[] } {
  const originallyNoEdges = (connections || []).length === 0;

  const outNodes = nodes.map((n) => ({
    ...n,
    position: { ...n.position },
    data: { ...n.data },
  }));
  let outConns = (connections || []).map(normalizeConnection);

  const seen = new Set<string>();
  outConns = outConns.filter((c) => {
    const k = edgeKey(c.fromNodeId, c.toNodeId);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (outNodes.length === 0) {
    return { nodes: outNodes, connections: outConns };
  }

  if (!hasTriggerNode(outNodes)) {
    const tid = createId();
    const previousHead = outNodes[0];
    if (!previousHead?.id) {
      return { nodes: outNodes, connections: outConns };
    }
    outNodes.unshift({
      id: tid,
      name: "Manual Trigger",
      type: "MANUAL_TRIGGER",
      data: {},
      position: { x: 100, y: 100 },
    });
    outNodes.forEach((n, i) => {
      n.position = { x: 100 + i * 160, y: 100 };
    });
    const mk = edgeKey(tid, previousHead.id);
    if (!seen.has(mk)) {
      seen.add(mk);
      outConns.unshift({
        id: createId(),
        fromNodeId: tid,
        toNodeId: previousHead.id,
        fromOutput: "source-1",
        toInput: "target-1",
      });
    }
  }

  if (originallyNoEdges && outNodes.length >= 2) {
    for (let i = 0; i < outNodes.length - 1; i++) {
      const a = outNodes[i].id;
      const b = outNodes[i + 1].id;
      if (!a || !b) continue;
      if (hasDirectedEdge(outConns, a, b)) continue;
      const k = edgeKey(a, b);
      if (seen.has(k)) continue;
      seen.add(k);
      outConns.push({
        id: createId(),
        fromNodeId: a,
        toNodeId: b,
        fromOutput: "source-1",
        toInput: "target-1",
      });
    }
  }

  return { nodes: outNodes, connections: outConns };
}
