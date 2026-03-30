import { createId } from "@paralleldrive/cuid2";
import { NodeType } from "@/generated/prisma/enums";

export type IncomingGeneratedNode = {
  id: string;
  name: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
};

export type IncomingGeneratedConnection = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromOutput: string;
  toInput: string;
};

/** LLM / client ids are reused across generations; Node.id and Connection.id are globally unique in DB. */
export function remapGeneratedWorkflowIds(
  nodes: IncomingGeneratedNode[],
  connections: IncomingGeneratedConnection[],
) {
  const nodeIdMap = new Map<string, string>();
  const seenIds = new Set<string>();
  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      throw new Error("DUPLICATE_NODE_ID");
    }
    seenIds.add(node.id);
    nodeIdMap.set(node.id, createId());
  }

  for (const conn of connections) {
    if (!nodeIdMap.has(conn.fromNodeId) || !nodeIdMap.has(conn.toNodeId)) {
      throw new Error("UNKNOWN_CONNECTION_NODE");
    }
  }

  const remappedNodes = nodes.map((node) => ({
    id: nodeIdMap.get(node.id)!,
    name: node.name,
    type: node.type as NodeType,
    data: node.data,
    position: node.position,
  }));

  const remappedConnections = connections.map((conn) => ({
    id: createId(),
    fromNodeId: nodeIdMap.get(conn.fromNodeId)!,
    toNodeId: nodeIdMap.get(conn.toNodeId)!,
    fromOutput: conn.fromOutput,
    toInput: conn.toInput,
  }));

  return { remappedNodes, remappedConnections };
}
