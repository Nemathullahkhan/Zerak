import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || "http://localhost:3000";
const RESULTS_DIR = path.resolve(__dirname, "../results");
const DATASET_PATH = path.resolve(__dirname, "../dataset/prompts.json");
const OUTPUT_PATH = path.resolve(RESULTS_DIR, "nlp-accuracy.csv");

// ─── Parse streamed NDJSON (one JSON object per non-empty line) ───────────────

function parseStreamedWorkflow(raw: string): {
  nodes: any[];
  connections: any[];
} {
  let nodes: any[] = [];
  let connections: any[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as Record<string, unknown>;
      if (obj.type === "partial_nodes" && Array.isArray(obj.nodes)) {
        nodes = obj.nodes as any[];
      }
      if (obj.type === "connections" && Array.isArray(obj.connections)) {
        connections = obj.connections as any[];
      }
      if (obj.type === "final" && obj.workflow && typeof obj.workflow === "object") {
        const w = obj.workflow as { nodes?: any[]; connections?: any[] };
        if (Array.isArray(w.nodes)) nodes = w.nodes;
        if (Array.isArray(w.connections)) connections = w.connections;
      }
    } catch {
      // ignore partial lines / markdown
    }
  }

  return { nodes, connections };
}

function typeByNodeId(nodes: any[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const n of nodes || []) {
    if (n?.id && n?.type) m.set(String(n.id), String(n.type));
  }
  return m;
}

function edgeTypePairs(nodes: any[], connections: any[]): [string, string][] {
  const idToType = typeByNodeId(nodes);
  const out: [string, string][] = [];
  for (const e of connections || []) {
    const from = e?.fromNodeId ?? e?.source;
    const to = e?.toNodeId ?? e?.target;
    if (from == null || to == null) continue;
    const ft = idToType.get(String(from));
    const tt = idToType.get(String(to));
    if (ft && tt) out.push([ft, tt]);
  }
  return out;
}

/** Multiset overlap: how many expected (type,type) pairs are realized in actual. */
function edgeMultisetRecall(
  expected: [string, string][],
  actualPairs: [string, string][],
): number {
  if (expected.length === 0) return 1;
  const bag = new Map<string, number>();
  for (const [a, b] of actualPairs) {
    const k = `${a}\0${b}`;
    bag.set(k, (bag.get(k) ?? 0) + 1);
  }
  let hits = 0;
  for (const [a, b] of expected) {
    const k = `${a}\0${b}`;
    const n = bag.get(k) ?? 0;
    if (n > 0) {
      bag.set(k, n - 1);
      hits++;
    }
  }
  return hits / expected.length;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function computeMetrics(expected: any, actual: any) {
  const expectedNodes = expected.expected_nodes || [];
  const actualNodes = actual.nodes?.map((n: any) => n.type) || [];

  const correctNodes = actualNodes.filter((type: string) =>
    expectedNodes.includes(type),
  );

  const precision =
    actualNodes.length > 0 ? correctNodes.length / actualNodes.length : 0;
  const recall =
    expectedNodes.length > 0 ? correctNodes.length / expectedNodes.length : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  const expectedEdges: [string, string][] = expected.expected_edges || [];
  const actualPairs = edgeTypePairs(actual.nodes || [], actual.connections || []);
  const edgeAcc = edgeMultisetRecall(expectedEdges, actualPairs);

  const expectedVars = expected.expected_variables || [];
  const actualVars =
    actual.nodes?.flatMap((n: any) => n.data?.variableName || []) || [];
  const correctVars = actualVars.filter((v: string) =>
    expectedVars.includes(v),
  );
  const varAcc =
    expectedVars.length > 0 ? correctVars.length / expectedVars.length : 1;

  return { precision, recall, f1, edgeAcc, varAcc };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function evaluate() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const prompts = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const csvStream = format({ headers: true });
  const writableStream = createWriteStream(OUTPUT_PATH);
  csvStream.pipe(writableStream);

  console.log(
    `--- Zerak NLP Accuracy Benchmark (${prompts.length} prompts) ---`,
  );

  for (const p of prompts) {
    process.stdout.write(`Evaluating ${p.id}... `);
    const start = Date.now();

    try {
      const response = await fetch(
        `${BASE_URL}/api/workflow/stream?benchmark=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: p.prompt }),
        },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let content = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }

      const { nodes: actualNodes, connections: actualConnections } =
        parseStreamedWorkflow(content);

      const metrics = computeMetrics(p, {
        nodes: actualNodes,
        connections: actualConnections,
      });
      const duration = Date.now() - start;

      csvStream.write({
        prompt_id: p.id,
        complexity: p.complexity,
        node_f1: metrics.f1.toFixed(4),
        edge_acc: metrics.edgeAcc.toFixed(4),
        var_acc: metrics.varAcc.toFixed(4),
        duration_ms: duration,
        success: true,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ F1: ${metrics.f1.toFixed(2)} (${duration}ms)`);
    } catch (error) {
      console.log(
        `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      csvStream.write({
        prompt_id: p.id,
        complexity: p.complexity,
        success: false,
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  csvStream.end();
  console.log(`\nResults written to: ${OUTPUT_PATH}`);
}

evaluate().catch(console.error);
