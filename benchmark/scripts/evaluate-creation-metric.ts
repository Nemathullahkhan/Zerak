import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import dotenv from "dotenv";
import { patchNodesForBenchmark } from "./patch-nodes.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const RESULTS_DIR = path.resolve(__dirname, "../results");
const OUTPUT_PATH = path.resolve(RESULTS_DIR, "creation-metric.csv");
const DATASET_PATH = path.resolve(__dirname, "../dataset/prompts.json");

async function testCreation(workflow: any) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/workflow/create?benchmark=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    const data = await res.json();
    return {
      success: res.ok,
      workflowId: data.id || data.workflowId,
      error: res.ok ? null : data.error || JSON.stringify(data),
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      latencyMs: Date.now() - start,
    };
  }
}

async function main() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const csvStream = format({ headers: true });
  const writableStream = createWriteStream(OUTPUT_PATH);
  csvStream.pipe(writableStream);

  console.log("--- Zerak Creation Metric Evaluator (with patching) ---");

  const prompts = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));

  // Test all prompts (or slice as needed)
  for (const p of prompts) {
    process.stdout.write(`Testing creation for ${p.id}... `);

    // Build base nodes from expected structure
    const nodes = p.expected_nodes.map((type: string, i: number) => ({
      id: `n${i + 1}`,
      type,
      name: `${type} Node`,
      position: { x: i * 200, y: 100 },
      data: { variableName: p.expected_variables[i] || `var${i}` },
    }));

    const connections = Array.isArray(p.expected_connection_indices)
      ? p.expected_connection_indices.map(
          ([fromIdx, toIdx]: [number, number], i: number) => ({
            id: `c${i + 1}`,
            fromNodeId: `n${fromIdx + 1}`,
            toNodeId: `n${toIdx + 1}`,
          }),
        )
      : p.expected_edges.map(
          ([from, to]: [string, string], i: number) => ({
            id: `c${i + 1}`,
            fromNodeId: `n${p.expected_nodes.indexOf(from) + 1}`,
            toNodeId: `n${p.expected_nodes.indexOf(to) + 1}`,
          }),
        );

    // Apply credential and Google Sheet patching
    const patchedNodes = patchNodesForBenchmark(nodes, p.id);

    const workflow = {
      name: `Benchmark Workflow ${p.id}`,
      nodes: patchedNodes,
      connections,
      // No userId – route will assign "benchmark-user-id"
    };

    const result = await testCreation(workflow);

    csvStream.write({
      prompt_id: p.id,
      success: result.success,
      workflow_id: result.workflowId || "N/A",
      latency_ms: result.latencyMs,
      error: result.error || "None",
      timestamp: new Date().toISOString(),
    });

    console.log(
      result.success ? `✅ (${result.latencyMs}ms)` : `❌ ${result.error}`,
    );
    await new Promise((r) => setTimeout(r, 200));
  }

  csvStream.end();
  console.log(`\nResults written to: ${OUTPUT_PATH}`);
}

main().catch(console.error);
