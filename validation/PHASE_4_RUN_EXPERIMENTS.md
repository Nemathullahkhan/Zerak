# Phase 4: Running Experiments

## 1. Description

Execute the full benchmark suite across all 140 prompts (5 runs each) to collect statistically significant results. This phase also includes the token efficiency comparison and execution reliability testing using Inngest simulations.

- **Files:** `benchmark/scripts/evaluate-nlp.ts`, `benchmark/scripts/compare-tokens.ts`, `benchmark/scripts/evaluate-execution.ts`
- **Inputs:** `benchmark/dataset/prompts.json`, `benchmark/dataset/invalid-dags.json`
- **Outputs:** `nlp-accuracy.csv`, `token-efficiency.csv`, `execution-reliability.csv`
- **Out of scope:** Human evaluation study (Phase 5)

## 2. Purpose / Business Logic

- **Hypothesis:** Supports H2 (NLP Accuracy), H3 (Validation Effectiveness), and H4 (Token Efficiency)
- **Metric:** Mean Node F1, Token reduction %, Success rate, MTTR
- **Decision:** Confirms if the system meets the pre-defined research targets (e.g., Node F1 ≥ 0.80, Token reduction ≥ 30%)
- **Rules:**
  - Every prompt in `prompts.json` must be run exactly 5 times for statistical significance
  - Execution reliability tests must include simulated failures at runs 30, 60, and 90

## 3. Context & Constraints

- **Tech stack:** Next.js 15, Inngest dev server, TypeScript
- **Relevant directories:** `benchmark/results/`, `benchmark/scripts/`
- **Existing patterns:** `npx tsx` for script execution
- **Dependencies:** `fast-csv`, `dotenv`, `tsx`
- **Constraints:**
  - Scripts must be idempotent (can be restarted from the last successful run)
  - All metrics must be written to `benchmark/results/` as CSV

## 4. Implementation Plan

- **Batch Processing:** Extend the NLP evaluator to support multiple runs per prompt and batching to respect API rate limits
- **Token Efficiency:** Implement `compare-tokens.ts` to compare Zerak's pipeline against a raw Mistral baseline
- **Reliability Simulation:** Implement `evaluate-execution.ts` to run workflows via the Inngest dev server and inject failures
- **Data flow:** Dataset → Execution Loop → API/Inngest → Results CSV

## 5. Implementation Steps

**Step 1: NLP full run execution**

- Action: Run command
- Command: `npx tsx benchmark/scripts/evaluate-nlp.ts --runs 5`
- Details: Script must iterate through all 140 prompts, running each 5 times.

**Step 2: Token efficiency comparison**

- File: `benchmark/scripts/compare-tokens.ts`
- Action: Create
- Details: Compare Zerak's token consumption against a raw Mistral baseline for 30 representative prompts.

```typescript
import { getModel } from '@/lib/benchmark-model';
import { streamText } from 'ai';

async function compareTokens(prompt: string) {
  // Path A: Zerak Pipeline
  const zerakRes = await fetch(`http://localhost:3000/api/workflow/stream?benchmark=true`, { ... });
  // Path B: Raw Baseline
  const rawRes = await streamText({
    model: getModel(true),
    system: "You are a workflow automation assistant. Return a JSON workflow with nodes and edges.",
    prompt: prompt
  });
  // Compare tokens from usage fields
}
```

**Step 3: Execution reliability testing**

- File: `benchmark/scripts/evaluate-execution.ts`
- Action: Create
- Details: Run 20 workflows 100 times each, injecting failures (e.g., HTTP 429, DB timeout) at specific runs.

```typescript
import { inngest } from "@/app/inngest/client";

async function runReliabilityTest(workflowId: string) {
  for (let i = 1; i <= 100; i++) {
    const injectFailure = i === 30 || i === 60 || i === 90;
    // Trigger inngest function with mock failure flag
    await inngest.send({
      name: "workflows/execute-workflow",
      data: { workflowId, injectFailure },
    });
  }
}
```

## 6. Edge Cases & Pitfalls

- **Common mistakes:** Running the full NLP suite without rate limiting, hitting 429s and corrupting the CSV. Mitigation: Implement 500ms delay between prompts.
- **Files NOT to touch:** Core production executors in `src/features/executions/components/*/executor.ts`.
- **Null states:** Missing `MISTRAL_API_KEY` mid-run. Mitigation: Check environment variables before starting the loop.
- **Failure scenarios:** Inngest dev server crashing during reliability tests. Mitigation: Log each run's status to the CSV immediately.

## 7. Expected Behavior

- **Happy path:** Running the scripts outputs progress logs (e.g., "Run 1/5 for wf_001 completed"). `nlp-accuracy.csv` grows to ~700 rows.
- **Error path:** If rate limit is hit, script logs "HTTP 429 - retrying in 5s..." and uses exponential backoff.
- **Verification:** `tail -n 5 benchmark/results/nlp-accuracy.csv` shows the last set of results.
- **Performance:** Full NLP suite expected runtime: ~3 hours.
