# Benchmark Validation Strategy: Zerak AI Automation Platform

This document explains the rigorous validation and benchmarking framework used to measure the accuracy, reliability, and effectiveness of the Zerak platform's workflow generation and execution engine.

## 1. Core Validation Objectives

The benchmark suite is designed to confirm four primary hypotheses:
- **H1 (Efficiency)**: Zerak significantly reduces the time-to-working-workflow compared to manual coding.
- **H2 (NLP Accuracy)**: The NLP-to-DAG engine accurately reconstructs intended workflow structures (Node F1 ≥ 0.80).
- **H3 (Validation Effectiveness)**: The structural validation layer catches most invalid patterns (Recall ≥ 0.90).
- **H4 (Token Optimization)**: The optimization pipeline reduces LLM costs (Token reduction ≥ 30%).

## 2. Validation Layers

### A. NLP-to-DAG Structural Accuracy (`evaluate-nlp.ts`)
We compare AI-generated workflows against a **Golden Dataset** (`prompts.json`) of 25+ real-world automation scenarios.
- **Node F1 Score**: Measures the accuracy of generated node types (Precision vs. Recall).
- **Edge Accuracy**: Validates if the connections between nodes (source to target) match the ground truth.
- **Variable Accuracy**: Ensures variables like `{{formData}}` or `{{summary}}` are correctly mapped across nodes.

### B. Validation Effectiveness (`evaluate-validation.ts`)
We test the robustness of the system's structural integrity using a **Negative Dataset** (`invalid-dags.json`).
- **Catch Rate (Recall)**: Percentage of purposely broken DAGs correctly identified as invalid.
- **Classification Accuracy**: Whether the system correctly identifies the *reason* for failure (e.g., Circular Dependency, Missing Trigger, Bad Variable Reference).

### C. Execution Reliability (`evaluate-execution.ts`)
Workflows are executed through the engine (integrated with Inngest) to measure:
- **Success Rate**: Percentage of end-to-end runs that complete without errors.
- **MTTR (Mean Time to Recover)**: Speed of recovery after simulated failures (e.g., HTTP 429 rate limits, DB timeouts).
- **P95 Latency**: Total time from natural language prompt to successful workflow completion.

## 3. The Datasets

### 1. Golden Prompts (`dataset/prompts.json`)
Covers five critical domains (Marketing, IT, Sales, Document Ops, Support) with varying complexity:
- **Easy**: 2–4 nodes, linear chains.
- **Medium**: 4–7 nodes, single IF branch or LOOP.
- **Hard**: 7+ nodes, nested logic, multiple integrations, and AI-driven branching.

### 2. Invalid DAGs (`dataset/invalid-dags.json`)
Purposefully malformed workflows used for negative testing:
- **Cycles**: A → B → C → A loops.
- **Orphan Nodes**: Disconnected components.
- **Trigger Issues**: Missing triggers or multiple triggers at root.
- **Variable Errors**: References to non-existent data.

## 4. Script Pipeline: From Creation to Execution

The validation process follows a logical progression, moving from NLP generation to database persistence and finally to durable execution.

### Step 1: NLP Generation Accuracy (`evaluate-nlp.ts`)
- **Action**: Sends the natural language prompt to the AI streaming engine.
- **Validation**: Captures the streamed JSON chunks (nodes/connections) and compares them against the ground truth in `prompts.json`.
- **Primary Metric**: **Node F1 Score**.

### Step 2: Workflow Persistence (`evaluate-creation-metric.ts`)
- **Action**: Takes the generated (or golden) workflow DAG and attempts to save it via the `/api/workflow/create` endpoint.
- **Validation**: Measures database insertion latency and ensures the workflow schema is correctly handled by the backend.
- **Primary Metric**: **Creation Latency & Success Rate**.

### Step 3: Execution Reliability (`evaluate-execution-metric.ts`)
- **Action**: Triggers previously created workflows via the execution engine.
- **Validation**: Polls the execution status until completion (SUCCESS/FAILED). It ensures the workflow nodes can actually run and produce outputs.
- **Primary Metric**: **Execution Success Rate**.

### Step 4: End-to-End Flow (`evaluate-end-to-end.ts`)
- **Action**: Combines all steps into a single integrated test—Generation → Creation → Execution.
- **Validation**: Verifies that a prompt correctly results in a functional, executed workflow with the expected final output.
- **Primary Metric**: **Total E2E Latency & Accuracy**.

## 5. Benchmark Flow & API Endpoints

The benchmark orchestrator (`run-all.ts`) interacts with the platform via dedicated benchmark-only API flags:

1.  **Generation**: `POST /api/workflow/stream?benchmark=true`
- Uses **Mistral** for deterministic evaluation (Temperature = 0).
- Streams JSON chunks representing nodes and connections.
2.  **Structural Check**: `POST /api/benchmark/validate`
- Runs the DAG through the local validation engine.
3.  **Execution**: `POST /api/benchmark/execute?benchmark=true`
- Synchronously executes the workflow to capture immediate results.
4.  **Logging**: All results are saved as CSV files in `benchmark/results/` for historical analysis.

## 5. How we measure "Success"

| Metric | Target | Tool |
|--------|--------|------|
| **Node F1 Score** | ≥ 0.85 | `evaluate-nlp.ts` |
| **Validation Recall** | ≥ 0.95 | `evaluate-validation.ts` |
| **Execution Success** | ≥ 98% | `evaluate-execution.ts` |
| **Token Savings** | ≥ 30% | `compare-tokens.ts` |

---
*For technical details on running these benchmarks, see the [Benchmark Folder](./benchmark/)*.
