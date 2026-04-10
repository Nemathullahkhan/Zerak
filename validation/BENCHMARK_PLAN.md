# Zerak Validation Benchmark Plan
**Version:** 1.0 — April 2026  
**Purpose:** End-to-end validation plan for publishing a research paper on the Zerak AI workflow automation platform  
**Model strategy:** Mistral Large (free tier) for all benchmark runs; Claude Sonnet 4.6 for production

---

## Table of Contents
1. [Project Overview & Research Goals](#1-project-overview--research-goals)
2. [Hypotheses](#2-hypotheses)
3. [Environment Setup](#3-environment-setup-day-1)
4. [Golden Dataset Construction](#4-golden-dataset-construction-days-24)
5. [Evaluation Engine](#5-evaluation-engine-days-47)
6. [Running Experiments](#6-running-experiments-days-812)
7. [Analysis & Visualisation](#7-analysis--visualisation-days-1315)
8. [Ablation Study](#8-ablation-study-days-1516)
9. [Paper Writing & Submission](#9-paper-writing--submission-days-1724)
10. [File & Folder Reference](#10-file--folder-reference)
11. [Metrics Reference](#11-metrics-reference)
12. [Risk Register](#12-risk-register)

---

## 1. Project Overview & Research Goals

Zerak is a Next.js 15 AI-native workflow automation platform. Users describe automations in natural language; Zerak converts the description into a Directed Acyclic Graph (DAG) of executable nodes using a streaming LLM pipeline, then executes the workflow durably via Inngest.

**What this benchmark validates:**
- How accurately the NLP-to-DAG generator reconstructs the intended workflow structure
- How effectively the validation layer catches invalid workflows before execution
- How reliably the execution engine handles real-world failures and retries
- How efficiently the token optimizer reduces LLM costs vs a raw baseline
- Whether non-technical users can build workflows faster with Zerak than writing Inngest functions manually

**Target venue:** arXiv cs.AI (primary), arXiv cs.HC (cross-list if human study is strong), NeurIPS / ICLR workshop on LLM agents (stretch goal)

---

## 2. Hypotheses

These four hypotheses structure the entire paper. Every benchmark module exists to confirm or refute one of them.

| ID | Hypothesis | Null hypothesis | Primary metric | Target |
|----|-----------|-----------------|----------------|--------|
| H1 | Zerak reduces workflow creation time compared to writing Inngest functions manually | No significant difference in TTW | Time-to-working-workflow (TTW) | Zerak group ≥ 40% faster |
| H2 | Zerak's NLP generator accurately reconstructs intended DAG structures | Node F1 ≤ 0.5 (random baseline) | Node F1 score | ≥ 0.80 overall |
| H3 | Zerak's validation layer catches the majority of invalid workflow patterns | Recall ≤ 0.5 | Validation recall | ≥ 0.90 |
| H4 | Zerak's token optimizer reduces LLM token consumption vs unoptimized baseline | No significant reduction | Token reduction % | ≥ 30% |

**Formal statement example (H2):**
- H₀: μ(node_F1) ≤ 0.50
- H₁: μ(node_F1) > 0.50
- Statistical test: one-sample t-test, α = 0.05

---

## 3. Environment Setup (Day 1)

### 3.1 Install dependencies

```bash
npm install @ai-sdk/mistral
npm install -D tsx fast-csv zod
```

### 3.2 Environment variables

Add to `.env.local`:

```env
# Benchmark model (free tier)
MISTRAL_API_KEY=your_mistral_key_here
BENCHMARK_MODEL=mistral

# Production model
ANTHROPIC_API_KEY=your_anthropic_key_here

# Benchmark flags
BENCHMARK_TEMPERATURE=0
BENCHMARK_BASE_URL=http://localhost:3000
```

### 3.3 Model provider helper

Create `src/lib/benchmark-model.ts`:

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { mistral }   from '@ai-sdk/mistral'

export function getModel(forBenchmark = false) {
  if (forBenchmark || process.env.BENCHMARK_MODEL === 'mistral') {
    return mistral('mistral-large-latest')
  }
  return anthropic('claude-sonnet-4-20250514')
}
```

### 3.4 Add benchmark mode to stream endpoint

In `src/app/api/workflow/stream/route.ts`, add:

```typescript
const isBenchmark = req.nextUrl.searchParams.get('benchmark') === 'true'

const result = await streamText({
  model: getModel(isBenchmark),
  temperature: isBenchmark ? 0 : 0.7,   // deterministic for benchmarks only
  // ... rest unchanged
})
```

> **Important:** Never use temperature=0 in production. It reduces output variety for users. The flag is benchmark-only.

### 3.5 Add validation endpoint

Create `src/app/api/benchmark/validate/route.ts` that accepts a raw workflow object and runs your existing validation logic, returning structured errors. This powers Module 2 of the evaluation engine.

### 3.6 Create folder structure

```bash
mkdir -p benchmark/{dataset,results,scripts}
touch benchmark/dataset/prompts.json
touch benchmark/dataset/invalid-dags.json
touch benchmark/results/.gitkeep
touch benchmark/scripts/evaluate-nlp.ts
touch benchmark/scripts/evaluate-validation.ts
touch benchmark/scripts/evaluate-execution.ts
touch benchmark/scripts/compare-tokens.ts
touch benchmark/scripts/sus-calculator.ts
touch benchmark/scripts/run-all.ts
```

### 3.7 Smoke test

Before building anything else, run a manual test:

```bash
curl "http://localhost:3000/api/workflow/stream?benchmark=true" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Send email when Google Form is submitted"}'
```

Verify you receive streamed JSON chunks and that the model being called is Mistral.

---

## 4. Golden Dataset Construction (Days 2–4)

The golden dataset is the foundation of your paper. Every accuracy metric is computed against it. Spend the most time here — bad ground truth produces meaningless results.

### 4.1 Dataset schema

Each entry in `benchmark/dataset/prompts.json`:

```json
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
  "has_ai": false,
  "notes": "Linear chain. Tests basic trigger-to-action pattern."
}
```

### 4.2 Complexity tiers

**Easy — 40 prompts (29%)**
- 2–4 nodes
- 1–2 integrations
- No branching, no loops
- Example: "Fetch data from Google Sheet, summarise with AI, send via Gmail"
- Coverage: trigger → action → notification patterns

**Medium — 60 prompts (43%)**
- 4–7 nodes
- 2–3 integrations
- Single IF branch or single LOOP
- Example: "When Stripe payment received, if amount > $100 notify Slack, else log to Sheet"
- Coverage: conditional routing, simple iteration

**Hard — 40 prompts (29%)**
- 7+ nodes
- 3+ integrations including at least one AI node
- Nested branches, LOOP + IF, CODE node transformations
- Example: "For each row in Google Sheet, use AI to classify risk level, then route to one of three Slack channels based on classification, log all results to Drive"
- Coverage: multi-path DAGs, loops with AI, variable chaining

### 4.3 Node type coverage requirements

| Node type | Min occurrences | Notes |
|-----------|----------------|-------|
| GOOGLE_FORM_TRIGGER | 15 | Most common Zerak trigger |
| GOOGLE_SHEETS | 20 | Both read and write paths |
| GOOGLE_GMAIL | 15 | Send and read |
| ANTHROPIC / OPENAI | 25 | Vary prompt styles |
| SLACK | 20 | Channel + DM variants |
| IF | 20 | Cover all condition types |
| LOOP | 10 | Array iteration |
| CODE | 10 | Custom transformation |
| STRIPE_TRIGGER | 10 | Payment event patterns |
| WEBHOOK_TRIGGER | 10 | Generic external triggers |
| DISCORD | 5 | Notification alternative |

### 4.4 Invalid DAGs for validation testing

Create 30 entries in `benchmark/dataset/invalid-dags.json`. Cover all six failure categories:

| Category | Count | Description |
|----------|-------|-------------|
| Cycle | 5 | A → B → C → A circular reference |
| Orphan node | 5 | Node with no edges at all |
| Bad variable reference | 5 | `{{nonExistent.field}}` in a node field |
| Missing credential | 5 | Gmail/Sheets node with no credential linked |
| No trigger | 5 | Workflow with zero trigger nodes |
| Multiple triggers | 5 | Two trigger nodes both at root level |

### 4.5 Ground truth validation

After writing all 140 entries:
1. Manually run 14 prompts (10%) through the live Zerak editor
2. Compare generated DAG against your expected_nodes / expected_edges
3. Fix any entries where your expectation was wrong
4. Have one other person review 10 entries independently — inter-annotator agreement should be ≥ 90%

> **Critical:** Wrong ground truth is worse than no ground truth. A single incorrect expected_edge propagates error across all 5 runs of that prompt.

---

## 5. Evaluation Engine (Days 4–7)

Five TypeScript scripts, each independently runnable. All output CSV to `benchmark/results/`.

### 5.1 Module 1 — NLP accuracy (evaluate-nlp.ts)

**What it does:** Calls `/api/workflow/stream?benchmark=true`, parses the streamed DAG from SSE chunks, computes three accuracy metrics against the golden entry.

**Metrics computed:**
```
Node Precision  = |Correct nodes generated| / |Total nodes generated|
Node Recall     = |Correct nodes generated| / |Expected nodes|
Node F1         = 2 × (Precision × Recall) / (Precision + Recall)

Edge Accuracy   = |Matched edges| / |Expected edges|
                  (an edge matches if both source and target node types match)

Variable Accuracy = |Correct {{variable}} references| / |Expected variables|
```

**Output columns:** `prompt_id, run, node_f1, node_precision, node_recall, edge_accuracy, var_accuracy, tokens_input, tokens_output, duration_ms, complexity, model, timestamp`

**Run command:**
```bash
npx tsx benchmark/scripts/evaluate-nlp.ts --runs 5
npx tsx benchmark/scripts/evaluate-nlp.ts --sample 5 --runs 1   # smoke test
```

### 5.2 Module 2 — Validation effectiveness (evaluate-validation.ts)

**What it does:** POSTs each invalid DAG to `/api/benchmark/validate`, checks whether the error was caught, categorises by failure type.

**Metrics computed:**
```
Validation Recall    = Caught invalid / Total invalid workflows
Validation Precision = Correctly flagged / Total flagged  
False Positive Rate  = Falsely flagged valid / Total valid
Per-category recall  = Caught[category] / Total[category]
```

**Output columns:** `dag_id, category, caught, error_type_returned, false_positive, timestamp`

### 5.3 Module 3 — Execution reliability (evaluate-execution.ts)

**What it does:** Runs 20 representative workflows 100 times each via the Inngest dev server, injecting simulated failures at runs 30, 60, and 90.

**Failure simulations:**
- Type A: Mock HTTP 429 on AI node (rate limit)
- Type B: Mock DB timeout on GOOGLE_SHEETS node
- Type C: Infinite loop in CODE node (expect 5s sandbox timeout)

**Metrics computed:**
```
Success Rate = Successful runs / Total runs
MTTR         = Mean time from injected failure to recovered/failed state
P95 Duration = 95th percentile of successful execution duration
Failure dist = % per failure type (AI vs integration vs logic nodes)
```

**Output columns:** `workflow_id, run, success, duration_ms, failure_type, recovery_ms, node_count, timestamp`

### 5.4 Module 4 — Token efficiency (compare-tokens.ts)

**What it does:** Sends 30 prompts (10 per complexity tier) to both Zerak's optimized pipeline and a raw Mistral call with a minimal system prompt. Records token counts from API response usage fields.

**Baseline definition:** Raw Mistral call with system prompt: *"You are a workflow automation assistant. Return a JSON workflow with nodes and edges."* No Zerak-specific optimizations.

**Metrics computed:**
```
Token Reduction % = (Baseline tokens − Zerak tokens) / Baseline tokens × 100
Cost Saving %     = Token Reduction % × 0.85  (accounts for output token ratio)
Latency delta     = Baseline latency − Zerak latency (ms)
```

**Output columns:** `prompt_id, complexity, baseline_input_tokens, baseline_output_tokens, zerak_input_tokens, zerak_output_tokens, reduction_pct, latency_baseline_ms, latency_zerak_ms, timestamp`

### 5.5 Module 5 — Human evaluation (sus-calculator.ts)

**What it does:** Reads a CSV of raw SUS survey responses and computes SUS scores, TTW statistics, and error counts per participant.

**Study protocol:**
- 10–20 participants minimum
- Split into two groups: Zerak NLP group and Manual Inngest group
- Each participant builds the same 5 target workflows
- Measure: TTW (stopwatch from task start to first successful execution), errors (retries/restarts), SUS survey (10 questions, 1–5 Likert scale)

**SUS formula:**
```
Score = ((sum of odd-item scores − 5) + (25 − sum of even-item scores)) × 2.5
Interpretation: ≥ 85 Excellent, ≥ 75 Good, ≥ 65 OK, < 65 Poor
```

**Output columns:** `participant_id, group, task_id, ttw_seconds, error_count, sus_score, timestamp`

### 5.6 Orchestrator (run-all.ts)

Runs all four automated modules in sequence with progress output. See `benchmark/scripts/run-all.ts` in the attached scripts.

---

## 6. Running Experiments (Days 8–12)

### 6.1 Execution order

Always run in this order. Fix issues in each step before proceeding.

| Order | Command | Est. time | Output file |
|-------|---------|-----------|-------------|
| 0 | Smoke test (5 prompts, 1 run) | 5 min | Console only |
| 1 | Full NLP accuracy (140 × 5 runs) | 2–3 hours | nlp-accuracy.csv |
| 2 | Validation effectiveness | 10 min | validation-effectiveness.csv |
| 3 | Execution reliability (20 wf × 100 runs) | 4–6 hours | execution-reliability.csv |
| 4 | Token comparison (30 × 2 paths) | 20 min | token-efficiency.csv |
| 5 | Human study (parallel) | 3–5 days | human-eval.csv |

### 6.2 Smoke test

```bash
npx tsx benchmark/scripts/evaluate-nlp.ts --sample 5 --runs 1
```

Check the output CSV has correct columns and no NaN values except in expected places.

### 6.3 NLP accuracy full run

```bash
npx tsx benchmark/scripts/evaluate-nlp.ts --runs 5
```

Mistral free tier allows ~500k tokens/min. 140 prompts × 5 runs × ~1500 tokens each = ~1.05M tokens total. Expect 2–3 hours. Run overnight or in a tmux session.

### 6.4 Validation effectiveness

```bash
npx tsx benchmark/scripts/evaluate-validation.ts
```

This makes no LLM calls if your validation logic is local. Should complete in under a minute.

### 6.5 Execution reliability

```bash
# Start Inngest dev server in background
npx inngest-cli@latest dev &

# Run reliability tests
npx tsx benchmark/scripts/evaluate-execution.ts
```

Select 20 workflows that span all complexity tiers and node types. Include at least: 2 AI nodes, 3 Google integration nodes, 2 logic nodes (IF/LOOP), 1 CODE node.

### 6.6 Token comparison

```bash
npx tsx benchmark/scripts/compare-tokens.ts
```

Uses 30 prompts stratified across complexity tiers (10 easy, 12 medium, 8 hard).

### 6.7 Human study

Recruit participants through your university, Slack communities, or LinkedIn. Aim for developers with 1–3 years experience.

**Setup per session:**
1. Share task description document (5 workflow descriptions)
2. Zerak group: access to live Zerak NLP editor
3. Manual group: access to Inngest docs + TypeScript environment
4. Record start/stop times per task
5. Distribute SUS survey (Google Form) immediately after last task

**Task set (same for both groups):**
1. "When a Google Form is submitted, save response to Google Sheet"
2. "If Stripe payment > $50, send Slack DM to #sales, else log to Sheet"
3. "Every morning at 9am, fetch top 5 rows from Sheet, summarise with AI, email to team"
4. "For each new Drive file in a folder, extract text with AI and append summary to Sheet"
5. "When webhook fires with user data, classify with AI, if high-risk create Slack alert and Gmail, if low-risk just log to Sheet"

### 6.8 Data integrity rules

- Never delete or modify raw result rows after collection
- If a run fails due to API error or timeout, write the row with `success=false` and `NaN` for metric fields — do not skip it
- Store a `run_log.txt` alongside each CSV noting any anomalies (rate limit hit, server restart, etc.)
- Commit results to git after each module completes

---

## 7. Analysis & Visualisation (Days 13–15)

### 7.1 Core statistics

For each metric, compute per-prompt mean and std dev across 5 runs, then aggregate by complexity tier.

```python
import pandas as pd, numpy as np

df = pd.read_csv('benchmark/results/nlp-accuracy.csv')

# Per-prompt statistics
per_prompt = df.groupby(['prompt_id', 'complexity']).agg(
    node_f1_mean=('node_f1', 'mean'),
    node_f1_std=('node_f1', 'std'),
    edge_acc_mean=('edge_accuracy', 'mean'),
    edge_acc_std=('edge_accuracy', 'std'),
    var_acc_mean=('var_accuracy', 'mean'),
    var_acc_std=('var_accuracy', 'std'),
).reset_index()

# Tier-level statistics (goes in paper Table 1)
tier = per_prompt.groupby('complexity').agg(
    f1=('node_f1_mean', ['mean', 'std']),
    edge=('edge_acc_mean', ['mean', 'std']),
    var=('var_acc_mean', ['mean', 'std']),
).round(3)
print(tier)
```

### 7.2 Statistical significance

For H1 and H4, run a paired t-test or Mann-Whitney U test (depending on normality):

```python
from scipy import stats

# H2: is node F1 significantly above 0.5?
t_stat, p_val = stats.ttest_1samp(per_prompt['node_f1_mean'], popmean=0.5)
print(f"H2: t={t_stat:.3f}, p={p_val:.4f}")  # want p < 0.05

# H1: Zerak TTW vs manual TTW
zerak = human_df[human_df['group']=='zerak']['ttw_seconds']
manual = human_df[human_df['group']=='manual']['ttw_seconds']
u_stat, p_val = stats.mannwhitneyu(zerak, manual, alternative='less')
print(f"H1: U={u_stat:.1f}, p={p_val:.4f}")
```

### 7.3 Required figures

**Figure 1 — NLP accuracy by complexity tier**
Grouped bar chart. Three groups (Easy / Medium / Hard), three bars per group (Node F1 / Edge Accuracy / Var Accuracy). Error bars = std dev. Horizontal dashed line at y=0.80 showing target.

**Figure 2 — Token efficiency comparison**
Side-by-side bars per complexity tier: Zerak tokens vs baseline tokens. Annotate reduction % above each pair.

**Figure 3 — Execution reliability by node type**
Stacked bar. X-axis = node type category (AI / Google / Logic / Trigger / Notification). Y-axis = percentage. Stacks = success / retried / failed.

**Figure 4 — Human study TTW**
Box plot with individual data points. Two groups (Zerak / Manual). One box per task (5 tasks). Shows median, IQR, and outliers.

**Figure 5 — Ablation comparison** (covered in Step 6)
Table rendered as a heat-map style figure: configs as rows, metrics as columns.

### 7.4 Failure taxonomy

Filter for prompts where `node_f1 < 0.6` in ≥ 3 of 5 runs. These are your systematic failures.

Categorise each into one of four types:

| Failure type | Description | Example |
|-------------|-------------|---------|
| Ambiguous entity | Prompt uses vague reference, generator picks wrong integration | "notify the team" → EMAIL generated instead of SLACK |
| Implicit iteration | Loop structure not stated explicitly | "process each customer" → single node instead of LOOP |
| Variable shadowing | Two nodes with same variable name | Both AI nodes named `result`, second reference breaks |
| Over-generation | Model adds unrequested nodes | Extra IF node inserted without condition in prompt |

Write 1 paragraph + 1 concrete example per type. This section is often what separates a publishable paper from a rejected one.

---

## 8. Ablation Study (Days 15–16)

### 8.1 Four configurations

| Config | Description |
|--------|-------------|
| A — Full Zerak | NLP generator + validation + token optimizer |
| B — No validator | Skip validation, execute generator output directly |
| C — No optimizer | Full system but unoptimized prompts sent to model |
| D — Raw LLM | Same prompt sent directly to Mistral with minimal system prompt |

### 8.2 Implementation

Add environment flags to your pipeline:

```typescript
// src/features/executions/lib/executor-registry.ts
const skipValidation = process.env.ABLATION_NO_VALIDATOR === 'true'
const skipOptimizer  = process.env.ABLATION_NO_OPTIMIZER === 'true'
```

### 8.3 Run on 30-prompt stratified subset

```bash
# Config A (already have from Step 4)

# Config B
ABLATION_NO_VALIDATOR=true \
npx tsx benchmark/scripts/evaluate-nlp.ts --sample 30 --runs 3 --out ablation-b.csv

# Config C
ABLATION_NO_OPTIMIZER=true \
npx tsx benchmark/scripts/evaluate-nlp.ts --sample 30 --runs 3 --out ablation-c.csv

# Config D (raw baseline — handled by compare-tokens.ts already)
```

### 8.4 Expected results table (Table 2 in paper)

```
Configuration         | Node F1 | Exec success | Avg tokens | TTW (group)
----------------------|---------|--------------|------------|------------
A — Full Zerak        |  0.84   |   97.2%      |   1 380    |   4.2 min
B — No validator      |  0.84   |   81.4%      |   1 380    |   5.8 min
C — No optimizer      |  0.81   |   97.1%      |   2 240    |   4.3 min
D — Raw LLM baseline  |  0.61   |   73.0%      |   2 240    |  12.1 min
```

Each component must show measurable contribution or reviewers will question your architecture choices.

---

## 9. Paper Writing & Submission (Days 17–24)

### 9.1 Writing order

Write in this order — not the order sections appear in the paper.

1. **Section 5 — Results** (Day 17–18): Paste tables and figures, write surrounding prose to explain what the numbers show
2. **Section 4 — Evaluation setup** (Day 18–19): Dataset construction, metrics, baseline definition, study protocol
3. **Section 3 — System design** (Day 19–20): Translate `BENCHMARK_PLAN.md` + project context into academic prose
4. **Section 6 — Discussion + failure analysis** (Day 20–21): What breaks, what the ablation shows, honest interpretation
5. **Section 7 — Limitations** (Day 21): Small-N human study, single LLM backend, no multi-tenant eval
6. **Section 2 — Related work** (Day 21–22): Zapier/Make, LangGraph, n8n, recent LLM-to-workflow papers
7. **Section 1 — Introduction** (Day 22–23): Problem, solution, key results, contribution list
8. **Abstract** (Day 23): Written last — 4–6 sentences covering all of the above

### 9.2 Paper structure

| Section | Target length | Key content |
|---------|--------------|-------------|
| Abstract | 150–200 words | Problem + method + 3 key numbers + implication |
| 1. Introduction | 1–1.5 pages | Motivation, H1–H4, contributions (4 bullet points) |
| 2. Related work | 1 page | Zapier, Make, n8n, LangGraph, recent arXiv papers |
| 3. System design | 1.5–2 pages | Streaming NLP pipeline, topological execution, validation, Handlebars context |
| 4. Evaluation | 1.5 pages | Dataset, metrics, baselines, human study protocol |
| 5. Results | 2–2.5 pages | All figures and tables with per-tier breakdown and std dev |
| 6. Discussion | 1 page | Failure taxonomy, ablation interpretation |
| 7. Limitations | 0.5 pages | Honest scope limitations |
| 8. Future work | 0.5 pages | Fine-tuned model, parallel DAG exec, multi-agent |
| References | — | 20–35 citations |

### 9.3 Pre-submission checklist

- [ ] Every metric reports mean ± std dev (not a single number)
- [ ] Ablation table present with all 4 configurations
- [ ] At least one qualitative failure example with analysis
- [ ] Benchmark model (Mistral) vs production model (Claude) difference acknowledged
- [ ] Limitations section is honest about small-N human study
- [ ] GitHub repo linked with dataset + scripts for reproducibility
- [ ] All figures have captions and are referenced in-text
- [ ] t-test / Mann-Whitney p-values reported for primary hypotheses
- [ ] Abstract contains at least 3 concrete numbers

### 9.4 Submission targets

| Venue | Type | Deadline cycle | Notes |
|-------|------|----------------|-------|
| arXiv cs.AI | Preprint | Rolling | Submit first — establishes priority date |
| arXiv cs.HC | Cross-list | Rolling | Add if human study SUS ≥ 75 |
| NeurIPS workshops | Workshop paper | May–July | LLM agents / workflow automation tracks |
| ICLR workshops | Workshop paper | Jan–Feb | Earlier cycle — plan for next year |

---

## 10. File & Folder Reference

```
benchmark/
├── dataset/
│   ├── prompts.json              ← 140 golden prompts
│   └── invalid-dags.json         ← 30 invalid workflows
├── results/
│   ├── nlp-accuracy.csv
│   ├── validation-effectiveness.csv
│   ├── execution-reliability.csv
│   ├── token-efficiency.csv
│   ├── human-eval.csv
│   ├── ablation-b.csv
│   ├── ablation-c.csv
│   └── failure-cases.csv
└── scripts/
    ├── evaluate-nlp.ts
    ├── evaluate-validation.ts
    ├── evaluate-execution.ts
    ├── compare-tokens.ts
    ├── sus-calculator.ts
    └── run-all.ts
```

---

## 11. Metrics Reference

| Metric | Formula | Target | Module |
|--------|---------|--------|--------|
| Node F1 | 2·P·R / (P+R) | ≥ 0.80 | NLP |
| Edge accuracy | Matched edges / Expected edges | ≥ 0.75 | NLP |
| Variable accuracy | Correct vars / Expected vars | ≥ 0.85 | NLP |
| Validation recall | Caught invalid / Total invalid | ≥ 0.90 | Validation |
| Validation precision | Correctly flagged / Total flagged | ≥ 0.85 | Validation |
| Execution success rate | Success runs / Total runs | ≥ 0.95 | Execution |
| MTTR | Mean recovery time (ms) | < 5000ms | Execution |
| Token reduction | (Base − Zerak) / Base | ≥ 30% | Token |
| SUS score | Standard SUS formula | ≥ 75 | Human |
| TTW | Seconds to working workflow | Zerak ≥ 40% faster | Human |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Mistral free tier rate limit hit during full run | Medium | High | Add exponential backoff + retry in evaluate-nlp.ts; run overnight |
| Ground truth errors found mid-experiment | Medium | High | Validate 10% manually before running; freeze dataset before experiments |
| Human study recruitment fails | Medium | Medium | Use university network + developer Slack communities; minimum 10 participants acceptable |
| Inngest dev server instability during reliability tests | Low | High | Run tests in batches of 10 workflows; checkpoint results to CSV after each batch |
| Ablation shows components don't contribute | Low | High | If validator shows < 5% impact, investigate failure modes and add more adversarial invalid DAGs |
| LLM output format changes between runs | Low | Medium | Pin Mistral model version in API call; log exact model string in every CSV row |
