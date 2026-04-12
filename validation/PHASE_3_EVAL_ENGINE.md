# Phase 3: Evaluation Engine (Updated with End-to-End Flow Testing)

## 1. Description

Build the automated evaluation logic to measure NLP accuracy, validation effectiveness, and execution reliability (creation + execution). This phase involves creating the evaluation scripts and a dedicated benchmark validation endpoint.

- **Files:** `benchmark/scripts/evaluate-nlp.ts`, `benchmark/scripts/evaluate-validation.ts`, `benchmark/scripts/evaluate-creation-metric.ts`, `benchmark/scripts/evaluate-execution-metric.ts`, `benchmark/scripts/evaluate-end-to-end.ts`, `src/app/api/benchmark/validate/route.ts`
- **Inputs:** `benchmark/dataset/prompts.json`, `benchmark/dataset/invalid-dags.json`
- **Outputs:** CSV results in `benchmark/results/`
- **Out of scope:** Running the full 5-run experiments across all 140 prompts

## 2. Purpose / Business Logic

- **Hypotheses:** H2 (NLP Accuracy), H3 (Validation Effectiveness), and H4 (Execution Reliability)
- **Metrics:** Node Precision, Node Recall, Node F1, Edge Accuracy, Var Accuracy, Validation Recall, Creation Success Rate, Execution Completion Rate, Output Correctness, End-to-End Latency
- **Decision:** Provides the quantitative evidence required for the research paper's results section – now including whether generated workflows actually run and produce correct outputs.
- **Rules:**
  - All metrics must be computed against the ground truth in `prompts.json` (and optional `expected_outputs.json`)
  - Results must include token usage and duration for efficiency analysis (H4)
  - Scripts must be idempotent and support resumption if interrupted
  - Execution tests must not pollute production – use a dedicated test prefix or sandbox

## 3. Context & Constraints

- **Tech stack:** Next.js 15 (API route), TypeScript, Vercel AI SDK
- **Relevant directories:** `benchmark/scripts/`, `src/app/api/benchmark/`, `src/lib/`, `src/app/api/workflows/`, `src/app/api/executions/`
- **Existing patterns:** SSE parsing for NLP stream, tRPC validation logic, workflow engine execution endpoints
- **Dependencies:** `tsx`, `fast-csv`, `zod`, `dotenv`, `p-retry` (for retries)
- **Constraints:**
  - All results must be written to `benchmark/results/` as CSV
  - Use `fast-csv` for writing to ensure correct quoting and header formatting
  - Execution evaluator should test only a representative subset (e.g., first 10 workflows) to keep runtime reasonable

## 4. Implementation Plan

- **NLP Evaluator:** A script that iterates through the dataset, calls the streaming API, parses the response, and computes accuracy metrics
- **Validation Evaluator:** A script that sends invalid DAGs to a new `/api/benchmark/validate` endpoint and reports the recall rate
- **Creation Metric Evaluator (new):** A script that tests workflow creation API independently, measuring success rate and latency
- **Execution Metric Evaluator (new):** A script that tests workflow execution API independently (using pre-created workflows), measuring completion rate and runtime errors
- **End-to-End Flow Evaluator (new):** A script that combines creation + execution + output validation for a complete reliability score
- **Data flow:** Dataset → Script → API Request → Metric Computation → CSV Output
- **Integration:** Call the existing `/api/workflow/stream` with `benchmark=true` to get deterministic outputs; reuse creation/execution APIs

## 5. Implementation Steps

**Step 1: Create validation endpoint for benchmarks**

- File: `src/app/api/benchmark/validate/route.ts`
- Action: Create
- Details: Expose the internal validation logic (e.g., cycle detection, missing credentials) via a POST endpoint for testing.

```typescript
import { NextResponse } from "next/server";
import { validateWorkflow } from "@/lib/validation"; // hypothetical core validation helper

export async function POST(req: Request) {
  const body = await req.json();
  const errors = validateWorkflow(body.nodes, body.connections);
  return NextResponse.json({ errors });
}
```

**Step 2: Implement NLP accuracy evaluator**

- File: `benchmark/scripts/evaluate-nlp.ts`
- Action: Create
- Details: Implement the core scoring logic for Node F1, Edge accuracy, and Variable accuracy.

```typescript
import fs from "fs";
import { PromptSchema } from "./validate-dataset";
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";

// 1. Read dataset
const prompts = JSON.parse(
  fs.readFileSync("benchmark/dataset/prompts.json", "utf8"),
);

// 2. Setup CSV writer
const csvStream = format({ headers: true });
const writableStream = createWriteStream("benchmark/results/nlp-accuracy.csv");
csvStream.pipe(writableStream);

// 3. Evaluation Loop (simplified)
async function evaluate() {
  for (const p of prompts) {
    const result = await fetch(
      `http://localhost:3000/api/workflow/stream?benchmark=true`,
      {
        method: "POST",
        body: JSON.stringify({ prompt: p.prompt }),
      },
    );
    // Parse SSE, compute metrics (Node F1, Edge Accuracy, Var Accuracy)
    // Write row to CSV
    csvStream.write({
      prompt_id: p.id,
      node_f1: 0.85, // computed
      // ... rest of metrics
    });
  }
}
```

**Step 3: Implement validation effectiveness evaluator**

- File: `benchmark/scripts/evaluate-validation.ts`
- Action: Create
- Details: Send entries from `invalid-dags.json` to the new validation endpoint and record results.

```typescript
const invalidDags = JSON.parse(
  fs.readFileSync("benchmark/dataset/invalid-dags.json", "utf8"),
);

async function evaluateValidation() {
  for (const dag of invalidDags) {
    const res = await fetch(`http://localhost:3000/api/benchmark/validate`, {
      method: "POST",
      body: JSON.stringify(dag),
    });
    const { errors } = await res.json();
    // Record if caught, categorise by error type
  }
}
```

**Step 4: Implement creation metric evaluator (new)**

- File: `benchmark/scripts/evaluate-creation-metric.ts`
- Action: Create
- Details: Test only the workflow creation API – send valid DAGs (from NLP-generated or golden dataset) and measure success rate, latency, and error types.

```typescript
import fs from "fs";
import { format } from "@fast-csv/format";

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const OUTPUT_PATH = "benchmark/results/creation-metric.csv";

async function testCreation(workflow: { nodes: any[]; edges: any[] }) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    const data = await res.json();
    return {
      success: res.ok,
      workflowId: data.id,
      error: res.ok ? null : data.error,
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
```

**Step 5: Implement execution metric evaluator (new)**

- File: `benchmark/scripts/evaluate-execution-metric.ts`
- Action: Create
- Details: Test only the execution API – start with pre-created workflow IDs (e.g., from Step 4), measure completion rate, runtime errors, and execution latency.

```typescript
async function testExecution(workflowId: string) {
  const start = Date.now();
  try {
    const execRes = await fetch(`${BASE_URL}/api/executions`, {
      method: "POST",
      body: JSON.stringify({ workflowId }),
    });
    const { executionId } = await execRes.json();
    // Poll for completion
    const final = await pollUntilComplete(executionId);
    return {
      success: true,
      executionId,
      latencyMs: Date.now() - start,
      output: final.output,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      latencyMs: Date.now() - start,
    };
  }
}
```

**Step 6: Implement end-to-end flow evaluator (new)**

- File: `benchmark/scripts/evaluate-end-to-end.ts`
- Action: Create
- Details: Combines creation, execution, and output validation for a complete reliability score. Uses the same subset of valid workflows as Step 4/5 but reports integrated metrics (e.g., end-to-end success rate, total latency, output correctness).

```typescript
import fs from "fs";
import { format } from "@fast-csv/format";
import pRetry from "p-retry";

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const DATASET_PATH = "benchmark/dataset/prompts.json";
const OUTPUT_PATH = "benchmark/results/end-to-end.csv";

async function e2eTest(promptEntry: any) {
  // 1. Get generated workflow (from NLP or pre-computed)
  const { nodes, edges } = await getGeneratedWorkflow(promptEntry.prompt);
  let workflowId: string | null = null;
  let executionId: string | null = null;
  let creationOk = false,
    executionOk = false,
    outputOk = false;
  let totalStart = Date.now();

  try {
    // Creation
    const createRes = await fetch(`${BASE_URL}/api/workflows`, {
      method: "POST",
      body: JSON.stringify({ nodes, edges }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(`Creation failed: ${createData.error}`);
    workflowId = createData.id;
    creationOk = true;

    // Execution
    const execRes = await fetch(`${BASE_URL}/api/executions`, {
      method: "POST",
      body: JSON.stringify({ workflowId }),
    });
    const execData = await execRes.json();
    executionId = execData.executionId;
    const finalStatus = await pollUntilComplete(executionId);
    executionOk = true;

    // Output comparison (if ground truth exists)
    if (promptEntry.expected_output) {
      outputOk =
        JSON.stringify(finalStatus.output) ===
        JSON.stringify(promptEntry.expected_output);
    } else {
      outputOk = true;
    }
  } catch (err: any) {
    // log error
  }

  return {
    prompt_id: promptEntry.id,
    workflow_id: workflowId,
    execution_id: executionId,
    creation_success: creationOk,
    execution_success: executionOk,
    output_correct: outputOk,
    total_latency_ms: Date.now() - totalStart,
    error: "errorMsg",
  };
}
```

## 6. Edge Cases & Pitfalls

- **Common mistakes:** Forgetting to handle malformed JSON from the LLM stream, causing the evaluator to crash. Mitigation: Use try-catch and record `success=false` in the CSV.
- **Files NOT to touch:** `src/app/api/workflow/stream/route.ts` (except for benchmark flag integration in Phase 1).
- **Null states:** Empty `expected_variables` in the dataset should result in a 1.0 accuracy score if the generator also produces none.
- **Failure scenarios:** HTTP 500 from the streaming endpoint. Mitigation: Retry with exponential backoff (3 retries).
- **Execution side effects:** Workflows may call real external APIs – for benchmarks use mock endpoints or sandbox mode.
- **Cleanup:** After execution tests, delete created workflows (e.g., via `DELETE /api/workflows/{id}`) to avoid database clutter.
- **Rate limiting:** Add delays between requests to avoid overwhelming the server.

## 7. Expected Behavior

- **Happy path:** Running each evaluator script writes corresponding CSV files:
  - `npx tsx benchmark/scripts/evaluate-nlp.ts` → `nlp-accuracy.csv`
  - `npx tsx benchmark/scripts/evaluate-validation.ts` → `validation-effectiveness.csv`
  - `npx tsx benchmark/scripts/evaluate-creation-metric.ts` → `creation-metric.csv`
  - `npx tsx benchmark/scripts/evaluate-execution-metric.ts` → `execution-metric.csv`
  - `npx tsx benchmark/scripts/evaluate-end-to-end.ts` → `end-to-end.csv`
- **Error path:** If the server is not running, the script exits with "ECONNREFUSED".
- **Verification:** `head -n 2 benchmark/results/end-to-end.csv` shows the header and one row with creation/execution timings.
- **Performance:** Single prompt evaluation (NLP) < 30 seconds. End-to-end test (creation + execution) for a simple workflow < 60 seconds.
