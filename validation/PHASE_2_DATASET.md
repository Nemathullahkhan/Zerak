# Phase 2: Golden Dataset Construction

## 1. Description

Create 140 high-fidelity "golden prompts" stratified by complexity, including expected nodes, edges, and variables. Additionally, create 30 intentionally invalid DAGs to test the validation layer's effectiveness.

- **Files:** `benchmark/dataset/prompts.json`, `benchmark/dataset/invalid-dags.json`
- **Inputs:** `NodeType` enum from Prisma, `BENCHMARK_PLAN.md` coverage requirements
- **Outputs:** Validated JSON dataset files
- **Out of scope:** Running the evaluation scripts or calling the LLM

## 2. Purpose / Business Logic

- **Hypothesis:** Foundations for H2 (NLP Accuracy) and H3 (Validation Effectiveness)
- **Metric:** Node F1 score, Edge accuracy, Validation recall
- **Decision:** Establishes the ground truth (oracle) against which the system's performance is measured
- **Rules:**
  - Every prompt must include `expected_nodes`, `expected_edges`, and `expected_variables`
  - Stratification must follow: 40 Easy (29%), 60 Medium (43%), 40 Hard (29%)
  - Node types must cover all 10+ supported types in the `executor-registry.ts`

## 3. Context & Constraints

- **Tech stack:** JSON, TypeScript (for type safety during construction)
- **Relevant directories:** `benchmark/dataset/`, `src/features/executions/lib/`
- **Existing patterns:** `NodeType` enum in `prisma/schema.prisma`
- **Dependencies:** `zod` (for schema validation of the dataset)
- **Constraints:**
  - Expected edges must only use node IDs from the `expected_nodes` list
  - Variable names must be consistent with the prompts (e.g., if the prompt mentions "log result", expected variable should be `result`)

## 4. Implementation Plan

- **Schema:** Define a Zod schema to ensure data integrity for both prompts and invalid DAGs
- **Stratification:** Populate `prompts.json` with 140 entries following the complexity tier definitions
- **Adversarial Cases:** Populate `invalid-dags.json` with 30 entries covering cycles, orphaned nodes, and missing credentials
- **Data flow:** Static JSON construction → Schema validation script → Final dataset

## 5. Implementation Steps

**Step 1: Define dataset schema**

- File: `benchmark/scripts/validate-dataset.ts`
- Action: Create
- Details: Define Zod schemas for `Prompt` and `InvalidDAG`.

```typescript
import { z } from "zod";
import { NodeType } from "../../src/generated/prisma/enums";

const PromptSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  complexity: z.enum(["easy", "medium", "hard"]),
  expected_nodes: z.array(z.nativeEnum(NodeType)),
  expected_edges: z.array(z.tuple([z.string(), z.string()])),
  expected_variables: z.array(z.string()),
  integration_count: z.number(),
  has_branch: z.boolean(),
  has_loop: z.boolean(),
  has_ai: z.boolean(),
  notes: z.string().optional(),
});

const InvalidDAGSchema = z.object({
  id: z.string(),
  category: z.enum([
    "Cycle",
    "Orphan node",
    "Bad variable reference",
    "Missing credential",
    "No trigger",
    "Multiple triggers",
  ]),
  nodes: z.array(z.any()),
  connections: z.array(z.any()),
});

export { PromptSchema, InvalidDAGSchema };
```

**Step 2: Create golden prompts dataset**

- File: `benchmark/dataset/prompts.json`
- Action: Create
- Details: Populate with 140 prompts as defined in the master plan.

```json
[
  {
    "id": "wf_001",
    "prompt": "When a Google Form is submitted, append the response to a Google Sheet and send a Slack notification",
    "complexity": "easy",
    "expected_nodes": ["GOOGLE_FORM_TRIGGER", "GOOGLE_SHEETS", "SLACK"],
    "expected_edges": [
      ["GOOGLE_FORM_TRIGGER", "GOOGLE_SHEETS"],
      ["GOOGLE_SHEETS", "SLACK"]
    ],
    "expected_variables": ["formData", "sheetResult"],
    "integration_count": 3,
    "has_branch": false,
    "has_loop": false,
    "has_ai": false
  }
  // ... rest of the 140 prompts
]
```

**Step 3: Create invalid DAGs dataset**

- File: `benchmark/dataset/invalid-dags.json`
- Action: Create
- Details: Populate with 30 adversarial cases.

```json
[
  {
    "id": "inv_001",
    "category": "Cycle",
    "nodes": [{ "id": "A" }, { "id": "B" }],
    "connections": [
      { "from": "A", "to": "B" },
      { "from": "B", "to": "A" }
    ]
  }
  // ... rest of the 30 invalid cases
]
```

**Step 4: Validate datasets**

- Action: Run command
- Command: `npx tsx benchmark/scripts/validate-dataset.ts`

## 6. Edge Cases & Pitfalls

- **Common mistakes:** Typoing `NodeType` names (e.g., `GOOGLE_SHEET` vs `GOOGLE_SHEETS`). Mitigation: Use the Zod schema with native enum.
- **Files NOT to touch:** `prisma/schema.prisma` or production database.
- **Null states:** Empty `expected_edges` for a multi-node workflow should be caught as an error.
- **Failure scenarios:** Duplicate `id` values in `prompts.json`.

## 7. Expected Behavior

- **Happy path:** Running `npx tsx benchmark/scripts/validate-dataset.ts` outputs "Datasets validated successfully".
- **Error path:** If a prompt complexity is "ultra-hard" (invalid enum), the validator throws "Invalid enum value".
- **Verification:** `cat benchmark/dataset/prompts.json | jq '. | length'` should return 140.
- **Performance:** Validation script should run in < 1 second.
