# Phase 5: Analysis & Visualisation

## 1. Description

Perform statistical analysis and data visualisation on the collected benchmark results. This phase also includes the human usability study (SUS), the ablation study to isolate the contribution of each component, and the final draft of the research paper.

- **Files:** `benchmark/scripts/sus-calculator.ts`, `benchmark/results/analysis.ipynb` (or similar), `benchmark/results/ablation-b.csv`, `benchmark/results/ablation-c.csv`
- **Inputs:** `nlp-accuracy.csv`, `token-efficiency.csv`, `execution-reliability.csv`, human study survey data
- **Outputs:** Figures 1-5, Table 1-2, Final paper draft
- **Out of scope:** Further code modifications to the production system

## 2. Purpose / Business Logic

- **Hypothesis:** Supports H1 (Usability) and H4 (Token Efficiency)
- **Metric:** SUS Score, Time-to-Working-Workflow (TTW), Statistical Significance (p-values)
- **Decision:** Determines if the system's performance is statistically significant and publishable
- **Rules:**
  - Every metric must report mean ± standard deviation
  - Ablation study must cover all 4 configurations (Full, No-Validator, No-Optimizer, Raw LLM)
  - Human study must have a minimum of 10-20 participants

## 3. Context & Constraints

- **Tech stack:** Python (Pandas/Matplotlib) or TypeScript (Chart.js/D3.js) for visualization
- **Relevant directories:** `benchmark/results/`, `benchmark/scripts/`
- **Existing patterns:** Academic paper structure (Abstract, System Design, Results, etc.)
- **Dependencies:** `pandas`, `scipy` (for statistical tests), `fast-csv`
- **Constraints:**
  - Never delete or modify raw result rows from the CSV files
  - Ablation study runs must be clearly labeled (e.g., `ABLATION_NO_VALIDATOR=true`)

## 4. Implementation Plan

- **SUS Calculation:** Build a simple script to process human survey data and compute SUS scores and TTW
- **Ablation Runs:** Execute 30-prompt stratified runs with the validation and optimizer components disabled
- **Statistical Analysis:** Use Python or TypeScript to compute t-tests/U-tests for H1 and H4
- **Visualisation:** Generate the five required figures (Accuracy by Tier, Token Efficiency, Reliability, Human TTW, Ablation Comparison)

## 5. Implementation Steps

**Step 1: Implement SUS score calculator**

- File: `benchmark/scripts/sus-calculator.ts`
- Action: Create
- Details: Compute SUS scores from raw Likert scale (1-5) inputs.

```typescript
import fs from "fs";
import { format } from "@fast-csv/format";

function computeSUS(responses: number[]) {
  // responses: [q1, q2, ..., q10]
  // q1, q3, q5, q7, q9: positive statements (score - 1)
  // q2, q4, q6, q8, q10: negative statements (5 - score)
  const score =
    (responses[0] -
      1 +
      responses[2] -
      1 +
      responses[4] -
      1 +
      responses[6] -
      1 +
      responses[8] -
      1 +
      (5 -
        responses[1] +
        5 -
        responses[3] +
        5 -
        responses[5] +
        5 -
        responses[7] +
        5 -
        responses[9])) *
    2.5;
  return score;
}
```

**Step 2: Run ablation study**

- Action: Run command
- Command: `ABLATION_NO_VALIDATOR=true npx tsx benchmark/scripts/evaluate-nlp.ts --sample 30 --runs 3 --out ablation-b.csv`
- Command: `ABLATION_NO_OPTIMIZER=true npx tsx benchmark/scripts/evaluate-nlp.ts --sample 30 --runs 3 --out ablation-c.csv`

**Step 3: Generate core statistics and figures**

- File: `benchmark/scripts/generate-report.py` (or .ts)
- Action: Create
- Details: Aggregate CSV results into mean ± std dev and export to a markdown summary.

```python
import pandas as pd
df = pd.read_csv('benchmark/results/nlp-accuracy.csv')
summary = df.groupby('complexity').agg({'node_f1': ['mean', 'std']})
print(summary)
# Export to figures/tables
```

**Step 4: Draft final paper structure**

- File: `benchmark/results/paper-draft.md`
- Action: Create
- Details: Translate tables and figures into academic prose following the order: Results → Setup → Design → Discussion → Abstract.

## 6. Edge Cases & Pitfalls

- **Common mistakes:** Misinterpreting the SUS scoring formula (e.g., forgetting the 2.5 multiplier).
- **Files NOT to touch:** Raw `benchmark/results/*.csv` files (except for reading).
- **Null states:** Participants failing to complete a task. Mitigation: Record `TTW=NaN` and use non-parametric tests like Mann-Whitney U.
- **Failure scenarios:** Small sample size (N < 10) for human study. Mitigation: Acknowledge in the "Limitations" section.

## 7. Expected Behavior

- **Happy path:** Running `npx tsx benchmark/scripts/sus-calculator.ts` prints "Mean SUS Score: 82.5". `generate-report.py` produces `figure1.png`.
- **Error path:** If a CSV is missing, the script logs "Error: benchmark/results/nlp-accuracy.csv not found".
- **Verification:** Confirm that Table 2 (Ablation Comparison) contains all 4 configurations with consistent metrics.
- **Performance:** Analysis and report generation should complete in < 1 minute.
