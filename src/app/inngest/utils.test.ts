import { describe, it, expect } from "vitest";
import { topologicalSort } from "./utils";
import { Node, Connection } from "@/generated/prisma/client";

describe("topologicalSort", () => {
  it("should sort nodes correctly in a linear DAG", () => {
    const nodes = [
      { id: "1", name: "Node 1" },
      { id: "2", name: "Node 2" },
      { id: "3", name: "Node 3" },
    ] as Node[];

    const connections = [
      { fromNodeId: "1", toNodeId: "2" },
      { fromNodeId: "2", toNodeId: "3" },
    ] as Connection[];

    const sorted = topologicalSort(nodes, connections);
    expect(sorted.map((n) => n.id)).toEqual(["1", "2", "3"]);
  });

  it("should handle independent nodes", () => {
    const nodes = [
      { id: "1", name: "Node 1" },
      { id: "2", name: "Node 2" },
    ] as Node[];

    const connections = [] as Connection[];

    const sorted = topologicalSort(nodes, connections);
    expect(sorted).toHaveLength(2);
    expect(sorted.map((n) => n.id)).toContain("1");
    expect(sorted.map((n) => n.id)).toContain("2");
  });

  it("should throw an error for cyclic graphs", () => {
    const nodes = [
      { id: "1", name: "Node 1" },
      { id: "2", name: "Node 2" },
    ] as Node[];

    const connections = [
      { fromNodeId: "1", toNodeId: "2" },
      { fromNodeId: "2", toNodeId: "1" },
    ] as Connection[];

    expect(() => topologicalSort(nodes, connections)).toThrow(
      "WOrkflow contains a cycle"
    );
  });

  it("should handle complex DAGs correctly", () => {
    const nodes = [
      { id: "1", name: "Node 1" },
      { id: "2", name: "Node 2" },
      { id: "3", name: "Node 3" },
      { id: "4", name: "Node 4" },
    ] as Node[];

    const connections = [
      { fromNodeId: "1", toNodeId: "2" },
      { fromNodeId: "1", toNodeId: "3" },
      { fromNodeId: "2", toNodeId: "4" },
      { fromNodeId: "3", toNodeId: "4" },
    ] as Connection[];

    const sorted = topologicalSort(nodes, connections);
    const id1 = sorted.findIndex((n) => n.id === "1");
    const id2 = sorted.findIndex((n) => n.id === "2");
    const id3 = sorted.findIndex((n) => n.id === "3");
    const id4 = sorted.findIndex((n) => n.id === "4");

    expect(id1).toBeLessThan(id2);
    expect(id1).toBeLessThan(id3);
    expect(id2).toBeLessThan(id4);
    expect(id3).toBeLessThan(id4);
  });
});
