# Phase 1: Environment Setup

## 1. Description
Establish the technical foundation for the Zerak validation benchmark. This phase involves installing benchmark-specific dependencies, configuring environment variables for reproducibility, and creating the necessary model provider abstractions and benchmark-only API flags.
- **Files:** `src/lib/benchmark-model.ts`, `src/app/api/workflow/stream/route.ts`, `.env.local`
- **Inputs:** `MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`
- **Outputs:** Verified connection to benchmark model provider, folder structure initialized
- **Out of scope:** Dataset creation, evaluation script implementation

## 2. Purpose / Business Logic
- **Hypothesis:** Foundations for H2 (NLP Accuracy) and H4 (Token Efficiency)
- **Metric:** Connection latency, successful model response in benchmark mode
- **Decision:** Validates that the benchmark model (Mistral) can be swapped in without affecting production (Claude)
- **Rules:** 
  - `BENCHMARK_TEMPERATURE` must be set to 0 to ensure deterministic results for research repeatability
  - Benchmark mode must only be active when explicitly triggered via the `?benchmark=true` query parameter

## 3. Context & Constraints
- **Tech stack:** Next.js 15, Vercel AI SDK, Mistral/Anthropic providers
- **Relevant directories:** `src/lib/`, `src/app/api/workflow/stream/`, `benchmark/`
- **Existing patterns:** Model provider usage via `streamText`
- **Dependencies:** `@ai-sdk/mistral`, `tsx`, `fast-csv`, `zod`, `dotenv`
- **Constraints:**
  - Never use temperature ≠ 0 in benchmark mode
  - Never hardcode API keys
  - Do not modify production flow unless guarded by the `benchmark` flag

## 4. Implementation Plan
- **Abstractions:** Create a `getModel` helper in `src/lib/benchmark-model.ts` to manage model switching logic
- **Endpoints:** Extend the existing `/api/workflow/stream` endpoint to respect a `benchmark` query parameter
- **Folders:** Initialize the `benchmark/` directory structure to store datasets and results
- **Data flow:** Request `?benchmark=true` → `route.ts` → `getModel(true)` → Mistral → Streamed Response

## 5. Implementation Steps

**Step 1: Install benchmark dependencies**
- Action: Run command
- Command: `npm install @ai-sdk/mistral tsx fast-csv zod dotenv`

**Step 2: Configure benchmark environment**
- File: `.env.local`
- Action: Modify
- Details: Add benchmark-specific keys.
```env
# Benchmark model (free tier)
MISTRAL_API_KEY=your_mistral_key_here
BENCHMARK_MODEL=mistral

# Benchmark flags
BENCHMARK_TEMPERATURE=0
BENCHMARK_BASE_URL=http://localhost:3000
```

**Step 3: Create model provider helper**
- File: `src/lib/benchmark-model.ts`
- Action: Create
- Details: Create a function `getModel(forBenchmark: boolean)` that returns the Mistral model if `forBenchmark` is true, otherwise returns the Anthropic model.
```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { mistral } from '@ai-sdk/mistral'

export function getModel(forBenchmark = false) {
  if (forBenchmark || process.env.BENCHMARK_MODEL === 'mistral') {
    return mistral('mistral-large-latest')
  }
  return anthropic('claude-3-5-sonnet-20241022')
}
```

**Step 4: Update streaming endpoint for benchmark mode**
- File: `src/app/api/workflow/stream/route.ts`
- Action: Modify
- Details: Extract `benchmark` query param and pass to `getModel`. Set temperature to 0 if in benchmark mode.
```typescript
const isBenchmark = req.nextUrl.searchParams.get('benchmark') === 'true'

const result = await streamText({
  model: getModel(isBenchmark),
  temperature: isBenchmark ? 0 : 0.7,
  // ... rest of stream logic
})
```

**Step 5: Initialize benchmark directory structure**
- Action: Run command
- Command: `mkdir -p benchmark/{dataset,results,scripts} && touch benchmark/results/.gitkeep`

## 6. Edge Cases & Pitfalls
- **Common mistakes:** Forgetting to pass the `benchmark` flag in curl commands, resulting in production model (Claude) usage during testing.
- **Files NOT to touch:** Core executor logic in `src/features/executions/`, as this phase only handles generation.
- **Null states:** If `MISTRAL_API_KEY` is missing, `getModel` should throw a clear error instead of failing silently.
- **Failure scenarios:** Rate limits on Mistral free tier. Mitigation: Implement exponential backoff in subsequent evaluation scripts (not this phase).

## 7. Expected Behavior
- **Happy path:** Running `curl "http://localhost:3000/api/workflow/stream?benchmark=true" -X POST -H "Content-Type: application/json" -d '{"prompt": "test"}'` returns a streamed response from Mistral.
- **Error path:** If API key is missing, server logs "Missing MISTRAL_API_KEY" and returns 500.
- **Verification:** Run `ls -R benchmark/` to confirm directory structure is created correctly.
- **Performance:** Model switching overhead should be < 50ms.
