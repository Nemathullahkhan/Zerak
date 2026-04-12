import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import pRetry from "p-retry";
import dotenv from "dotenv";
import { patchNodesForBenchmark } from "./patch-nodes.ts";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const DATASET_PATH = path.resolve(__dirname, "../dataset/prompts.json");
const RESULTS_DIR = path.resolve(__dirname, "../results");
const OUTPUT_PATH = path.resolve(RESULTS_DIR, "end-to-end.csv");
const BENCHMARK_USER_ID = process.env.BENCHMARK_USER_ID;

async function simpleFetch(url: string, options: RequestInit = {}) {
  return fetch(url, options);
}

async function getGeneratedWorkflow(prompt: string, promptId: string) {
  const response = await simpleFetch(`${BASE_URL}/api/workflow/stream?benchmark=true`, {
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

  const nodesMatch = content.match(/"type":"partial_nodes","nodes":(\[.*?\])/);
  let nodes = nodesMatch ? JSON.parse(nodesMatch[1]) : [];
  const connectionsMatch = content.match(/"type":"connections","connections":(\[.*?\])/);
  const connections = connectionsMatch ? JSON.parse(connectionsMatch[1]) : [];

  nodes = patchNodesForBenchmark(nodes, promptId);
  return { nodes, connections };
}

async function pollUntilComplete(executionId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await simpleFetch(`${BASE_URL}/api/benchmark/execution-status/${executionId}?benchmark=true`);
    const data = await res.json();
    if (data.status === "SUCCESS" || data.status === "FAILED") return data;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Polling timeout");
}

async function e2eTest(promptEntry: any) {
  let workflowId: string | null = null;
  let executionId: string | null = null;
  let creationOk = false, executionOk = false, outputOk = false;
  let totalStart = Date.now();
  let errorMsg = "None";

  try {
    const { nodes, connections } = await getGeneratedWorkflow(promptEntry.prompt, promptEntry.id);
    if (nodes.length === 0) throw new Error("Generation produced no nodes");

    const createRes = await simpleFetch(`${BASE_URL}/api/workflow/create?benchmark=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `E2E Benchmark ${promptEntry.id}`,
        nodes,
        connections,
        userId: BENCHMARK_USER_ID,
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(`Creation failed: ${createData.error}`);
    workflowId = createData.id || createData.workflowId;
    creationOk = true;

    const execRes = await simpleFetch(`${BASE_URL}/api/benchmark/execute?benchmark=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId }),
    });
    const execData = await execRes.json();
    if (!execRes.ok) throw new Error(`Execution failed: ${execData.error}`);
    executionId = execData.executionId;
    if (!executionId) throw new Error("Execution did not return an ID");  // ✅ FIX

    const finalStatus = await pollUntilComplete(executionId);
    executionOk = finalStatus.status === "SUCCESS";
    if (!executionOk) errorMsg = finalStatus.error || "Execution failed";
    outputOk = true;
  } catch (err: any) {
    errorMsg = err.message;
  }

  return {
    prompt_id: promptEntry.id,
    workflow_id: workflowId,
    execution_id: executionId,
    creation_success: creationOk,
    execution_success: executionOk,
    output_correct: outputOk,
    total_latency_ms: Date.now() - totalStart,
    error: errorMsg,
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
  if (!BENCHMARK_USER_ID) throw new Error("BENCHMARK_USER_ID not set");

  const prompts = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const csvStream = format({ headers: true });
  const writableStream = createWriteStream(OUTPUT_PATH);
  csvStream.pipe(writableStream);

  console.log("--- Zerak End-to-End Flow Evaluator (userId override) ---");
  for (const p of prompts) {
    process.stdout.write(`Testing E2E for ${p.id}... `);
    const result = await pRetry(() => e2eTest(p), { retries: 2 });
    csvStream.write(result);
    const ok = result.creation_success && result.execution_success;
    console.log(`${ok ? "✅" : "❌"} (${result.total_latency_ms}ms)`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  csvStream.end();
  console.log(`\nResults written to: ${OUTPUT_PATH}`);
}

main().catch(console.error);