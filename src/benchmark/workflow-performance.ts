import { topologicalSort } from "../app/inngest/utils";
import { Node, Connection } from "@/generated/prisma/client";

/**
 * Benchmark utility for measuring topological sort performance
 * as a function of node and connection count.
 */
export function benchmarkTopologicalSort(nodeCount: number, connectivity: number) {
  const nodes: Node[] = [];
  const connections: Connection[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `${i}`, name: `Node ${i}` } as Node);
  }

  // Create a DAG with given connectivity
  for (let i = 0; i < nodeCount - 1; i++) {
    for (let j = 1; j <= connectivity && i + j < nodeCount; j++) {
      connections.push({
        fromNodeId: `${i}`,
        toNodeId: `${i + j}`,
      } as Connection);
    }
  }

  const start = performance.now();
  topologicalSort(nodes, connections);
  const end = performance.now();

  return {
    nodeCount,
    connectionCount: connections.length,
    durationMs: end - start,
  };
}

// Run benchmarks
if (require.main === module) {
  const scenarios = [
    { n: 10, c: 1 },
    { n: 100, c: 2 },
    { n: 500, c: 3 },
    { n: 1000, c: 5 },
  ];

  console.log("--- Topological Sort Benchmark ---");
  console.log("Nodes | Connections | Duration (ms)");
  console.log("------------------------------------");

  scenarios.forEach(({ n, c }) => {
    const result = benchmarkTopologicalSort(n, c);
    console.log(
      `${result.nodeCount.toString().padEnd(5)} | ` +
      `${result.connectionCount.toString().padEnd(11)} | ` +
      `${result.durationMs.toFixed(4)}`
    );
  });
}
