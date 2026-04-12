import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const RESULTS_DIR = path.resolve(__dirname, "../results");
const OUTPUT_PATH = path.resolve(RESULTS_DIR, "execution-metric.csv");
const CREATION_RESULTS_PATH = path.resolve(RESULTS_DIR, "creation-metric.csv");

async function pollUntilComplete(executionId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${BASE_URL}/api/benchmark/execution-status/${executionId}?benchmark=true`,
    );
    const data = await res.json();
    if (data.status === "SUCCESS" || data.status === "FAILED") {
      return data;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Polling timeout");
}

async function testExecution(workflowId: string) {
  const start = Date.now();
  try {
    const res = await fetch(
      `${BASE_URL}/api/benchmark/execute?benchmark=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const { executionId } = await res.json();
    const finalStatus = await pollUntilComplete(executionId);

    return {
      success: finalStatus.status === "SUCCESS",
      executionId,
      latencyMs: Date.now() - start,
      output: finalStatus.output,
      error: finalStatus.status === "FAILED" ? finalStatus.error : null,
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

  // Check if we have created workflows to test
  if (!fs.existsSync(CREATION_RESULTS_PATH)) {
    console.error(
      "❌ No creation-metric.csv found. Run evaluate-creation-metric.ts first.",
    );
    process.exit(1);
  }

  const csvStream = format({ headers: true });
  const writableStream = createWriteStream(OUTPUT_PATH);
  csvStream.pipe(writableStream);

  console.log("--- Zerak Execution Metric Evaluator ---");

  // Load created workflows (only successful ones)
  const creationResults = fs
    .readFileSync(CREATION_RESULTS_PATH, "utf8")
    .split("\n")
    .slice(1);
  const workflowsToTest = creationResults
    .map((line) => line.split(","))
    .filter((parts) => parts[1] === "true") // success is true
    .map((parts) => ({ prompt_id: parts[0], workflow_id: parts[2] }));

  for (const { prompt_id, workflow_id } of workflowsToTest) {
    process.stdout.write(
      `Testing execution for ${prompt_id} (${workflow_id})... `,
    );

    const result = await testExecution(workflow_id);

    csvStream.write({
      prompt_id,
      workflow_id,
      execution_id: result.executionId || "N/A",
      success: result.success,
      latency_ms: result.latencyMs,
      error: result.error || "None",
      timestamp: new Date().toISOString(),
    });

    console.log(
      result.success ? `✅ (${result.latencyMs}ms)` : `❌ ${result.error}`,
    );
    await new Promise((r) => setTimeout(r, 1000));
  }

  csvStream.end();
  console.log(`\nResults written to: ${OUTPUT_PATH}`);
}

main().catch(console.error);
