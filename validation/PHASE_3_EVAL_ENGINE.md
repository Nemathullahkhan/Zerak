# Phase 3: Evaluation Engine

## 1. Description
Build the automated evaluation logic to measure NLP accuracy, validation effectiveness, and execution reliability. This phase involves creating the evaluation scripts and a dedicated benchmark validation endpoint.
- **Files:** `benchmark/scripts/evaluate-nlp.ts`, `benchmark/scripts/evaluate-validation.ts`, `src/app/api/benchmark/validate/route.ts`
- **Inputs:** `benchmark/dataset/prompts.json`, `benchmark/dataset/invalid-dags.json`
- **Outputs:** CSV results in `benchmark/results/`
- **Out of scope:** Running the full 5-run experiments across all 140 prompts

## 2. Purpose / Business Logic
- **Hypothesis:** Foundations for H2 (NLP Accuracy) and H3 (Validation Effectiveness)
- **Metric:** Node Precision, Node Recall, Node F1, Edge Accuracy, Var Accuracy, Validation Recall
- **Decision:** Provides the quantitative evidence required for the research paper's results section
- **Rules:**
  - All metrics must be computed against the ground truth in `prompts.json`
  - Results must include token usage and duration for efficiency analysis (H4)
  - Scripts must be idempotent and support resumption if interrupted

## 3. Context & Constraints
- **Tech stack:** Next.js 15 (API route), TypeScript, Vercel AI SDK
- **Relevant directories:** `benchmark/scripts/`, `src/app/api/benchmark/`, `src/lib/`
- **Existing patterns:** SSE parsing for NLP stream, tRPC validation logic
- **Dependencies:** `tsx`, `fast-csv`, `zod`, `dotenv`
- **Constraints:**
  - All results must be written to `benchmark/results/` as CSV
  - Use `fast-csv` for writing to ensure correct quoting and header formatting

## 4. Implementation Plan
- **NLP Evaluator:** A script that iterates through the dataset, calls the streaming API, parses the response, and computes accuracy metrics
- **Validation Evaluator:** A script that sends invalid DAGs to a new `/api/benchmark/validate` endpoint and reports the recall rate
- **Data flow:** Dataset → Script → API Request → Metric Computation → CSV Output
- **Integration:** Call the existing `/api/workflow/stream` with `benchmark=true` to get deterministic outputs

## 5. Implementation Steps

**Step 1: Create validation endpoint for benchmarks**
- File: `src/app/api/benchmark/validate/route.ts`
- Action: Create
- Details: Expose the internal validation logic (e.g., cycle detection, missing credentials) via a POST endpoint for testing.
```typescript
import { NextResponse } from 'next/server';
import { validateWorkflow } from '@/lib/validation'; // hypothetical core validation helper

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
import fs from 'fs';
import { PromptSchema } from './validate-dataset';
import { createWriteStream } from 'fs';
import { format } from '@fast-csv/format';

// 1. Read dataset
const prompts = JSON.parse(fs.readFileSync('benchmark/dataset/prompts.json', 'utf8'));

// 2. Setup CSV writer
const csvStream = format({ headers: true });
const writableStream = createWriteStream('benchmark/results/nlp-accuracy.csv');
csvStream.pipe(writableStream);

// 3. Evaluation Loop (simplified)
async function evaluate() {
  for (const p of prompts) {
    const result = await fetch(`http://localhost:3000/api/workflow/stream?benchmark=true`, {
      method: 'POST',
      body: JSON.stringify({ prompt: p.prompt })
    });
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
const invalidDags = JSON.parse(fs.readFileSync('benchmark/dataset/invalid-dags.json', 'utf8'));

async function evaluateValidation() {
  for (const dag of invalidDags) {
    const res = await fetch(`http://localhost:3000/api/benchmark/validate`, {
      method: 'POST',
      body: JSON.stringify(dag)
    });
    const { errors } = await res.json();
    // Record if caught, categorise by error type
  }
}
```

## 6. Edge Cases & Pitfalls
- **Common mistakes:** Forgetting to handle malformed JSON from the LLM stream, causing the evaluator to crash. Mitigation: Use `try-catch` and record `success=false` in the CSV.
- **Files NOT to touch:** `src/app/api/workflow/stream/route.ts` (except for benchmark flag integration in Phase 1).
- **Null states:** Empty `expected_variables` in the dataset should result in a 1.0 accuracy score if the generator also produces none.
- **Failure scenarios:** HTTP 500 from the streaming endpoint. Mitigation: Retry with exponential backoff (3 retries).

## 7. Expected Behavior
- **Happy path:** Running `npx tsx benchmark/scripts/evaluate-nlp.ts` prints progress (e.g., "Evaluating wf_001... [Success]") and writes rows to `benchmark/results/nlp-accuracy.csv`.
- **Error path:** If the server is not running, the script exits with "ECONNREFUSED".
- **Verification:** `head -n 2 benchmark/results/nlp-accuracy.csv` shows the header and one row of metrics.
- **Performance:** Single prompt evaluation should take < 30 seconds.
