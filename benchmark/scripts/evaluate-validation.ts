import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || "http://localhost:3000";
const RESULTS_DIR = path.resolve(__dirname, "../results");
const DATASET_PATH = path.resolve(__dirname, "../dataset/invalid-dags.json");
const OUTPUT_PATH = path.resolve(RESULTS_DIR, "validation-effectiveness.csv");

async function evaluateValidation() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const invalidDags = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const csvStream = format({ headers: true });
  const writableStream = createWriteStream(OUTPUT_PATH);
  csvStream.pipe(writableStream);

  console.log(
    `--- Zerak Validation Effectiveness Benchmark (${invalidDags.length} DAGs) ---`,
  );

  for (const dag of invalidDags) {
    process.stdout.write(`Testing ${dag.id} (${dag.category})... `);
    const start = Date.now();

    try {
      const response = await fetch(`${BASE_URL}/api/benchmark/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: dag.nodes,
          connections: dag.connections || [],
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const { isValid, errors } = await response.json();
      const caught = !isValid || errors.length > 0;
      const duration = Date.now() - start;

      const correctClassification = errors.some(
        (e: any) =>
          e.code === dag.category ||
          e.message.toLowerCase().includes(dag.category.toLowerCase()),
      );

      csvStream.write({
        dag_id: dag.id,
        category: dag.category,
        caught,
        correct_classification: correctClassification,
        error_count: errors.length,
        duration_ms: duration,
        success: true,
        timestamp: new Date().toISOString(),
      });

      console.log(`${caught ? "✅ CAUGHT" : "❌ MISSED"} (${duration}ms)`);
    } catch (error) {
      console.log(
        `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      csvStream.write({
        dag_id: dag.id,
        category: dag.category,
        success: false,
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  csvStream.end();
  console.log(`\nResults written to: ${OUTPUT_PATH}`);
}

// Direct call for ES modules
evaluateValidation().catch(console.error);
