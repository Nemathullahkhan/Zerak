import fs from "fs";
import path from "path";

const categories = [
  "Cycle",
  "Orphan node",
  "Bad variable reference",
  "Missing credential",
  "No trigger",
  "Multiple triggers",
];

const templates = [
  {
    id: "inv_001",
    category: "Cycle",
    nodes: [
      { id: "A", type: "MISTRAL" },
      { id: "B", type: "SLACK" },
    ],
    connections: [
      { fromNodeId: "A", toNodeId: "B" },
      { fromNodeId: "B", toNodeId: "A" },
    ],
  },
  {
    id: "inv_002",
    category: "Orphan node",
    nodes: [
      { id: "A", type: "MANUAL_TRIGGER" },
      { id: "B", type: "SLACK" },
    ],
    connections: [],
  },
  {
    id: "inv_003",
    category: "Bad variable reference",
    nodes: [
      { id: "A", type: "MANUAL_TRIGGER" },
      { id: "B", type: "SLACK", data: { content: "{{missing_var}}" } },
    ],
    connections: [{ fromNodeId: "A", toNodeId: "B" }],
  },
  {
    id: "inv_004",
    category: "No trigger",
    nodes: [
      { id: "A", type: "MISTRAL" },
      { id: "B", type: "SLACK" },
    ],
    connections: [{ fromNodeId: "A", toNodeId: "B" }],
  },
  {
    id: "inv_005",
    category: "Multiple triggers",
    nodes: [
      { id: "A", type: "MANUAL_TRIGGER" },
      { id: "B", type: "GOOGLE_FORM_TRIGGER" },
      { id: "C", type: "SLACK" },
    ],
    connections: [
      { fromNodeId: "A", toNodeId: "C" },
      { fromNodeId: "B", toNodeId: "C" },
    ],
  },
];

function generate() {
  const invalidDags = [];
  for (let i = 0; i < 30; i++) {
    const base = templates[i % templates.length];
    invalidDags.push({
      ...base,
      id: `inv_${(i + 1).toString().padStart(3, "0")}`,
    });
  }

  fs.writeFileSync(
    path.resolve(__dirname, "../dataset/invalid-dags.json"),
    JSON.stringify(invalidDags, null, 2),
  );
  console.log(
    `Generated ${invalidDags.length} invalid DAGs in benchmark/dataset/invalid-dags.json`,
  );
}

generate();
