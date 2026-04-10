/**
 * evaluate-validation.ts
 * Zerak Benchmark Module 2 — Validation Effectiveness
 *
 * POSTs each invalid DAG to /api/benchmark/validate
 * and checks whether the error was caught and correctly classified.
 *
 * Usage:
 *   npx tsx benchmark/scripts/evaluate-validation.ts
 */

import fs from 'fs'
import path from 'path'
import { createObjectCsvWriter } from 'csv-writer'

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.BENCHMARK_BASE_URL ?? 'http://localhost:3000'
const RESULTS_DIR = path.join(process.cwd(), 'benchmark', 'results')
const DATASET_PATH = path.join(process.cwd(), 'benchmark', 'dataset', 'invalid-dags.json')
const OUTPUT_PATH  = path.join(RESULTS_DIR, 'validation-effectiveness.csv')

// Also test a set of VALID workflows to measure false positive rate
const VALID_DATASET_PATH = path.join(process.cwd(), 'benchmark', 'dataset', 'prompts.json')

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvalidDAGEntry {
  id: string
  category: 'cycle' | 'orphan_node' | 'bad_variable_reference' | 'missing_credential' | 'no_trigger' | 'multiple_triggers'
  description: string
  nodes: any[]
  edges: any[]
  expected_error: string
  notes?: string
}

interface ValidationResult {
  dag_id: string
  category: string
  expected_error: string
  caught: boolean
  error_returned: string
  correct_error_type: boolean
  false_positive: boolean
  response_time_ms: number
  timestamp: string
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function validateWorkflow(workflow: { nodes: any[]; edges: any[] }): Promise<{
  isValid: boolean
  errors: Array<{ code: string; message: string; nodeId?: string }>
  responseTimeMs: number
}> {
  const start = Date.now()

  try {
    const response = await fetch(`${BASE_URL}/api/benchmark/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
      signal: AbortSignal.timeout(10_000),
    })

    const data = await response.json()

    return {
      isValid: data.isValid ?? response.ok,
      errors: data.errors ?? [],
      responseTimeMs: Date.now() - start,
    }
  } catch (err) {
    return {
      isValid: false,
      errors: [{ code: 'FETCH_ERROR', message: (err as Error).message }],
      responseTimeMs: Date.now() - start,
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const invalidDAGs: InvalidDAGEntry[] = JSON.parse(
    fs.readFileSync(DATASET_PATH, 'utf8')
  )
  const validWorkflows = JSON.parse(
    fs.readFileSync(VALID_DATASET_PATH, 'utf8')
  ).slice(0, 10) // test 10 valid workflows for false positive rate

  fs.mkdirSync(RESULTS_DIR, { recursive: true })

  const writer = createObjectCsvWriter({
    path: OUTPUT_PATH,
    header: [
      { id: 'dag_id',             title: 'dag_id' },
      { id: 'category',           title: 'category' },
      { id: 'expected_error',     title: 'expected_error' },
      { id: 'caught',             title: 'caught' },
      { id: 'error_returned',     title: 'error_returned' },
      { id: 'correct_error_type', title: 'correct_error_type' },
      { id: 'false_positive',     title: 'false_positive' },
      { id: 'response_time_ms',   title: 'response_time_ms' },
      { id: 'timestamp',          title: 'timestamp' },
    ],
  })

  console.log('\nZerak Validation Effectiveness Benchmark')
  console.log(`Invalid DAGs: ${invalidDAGs.length} | Valid workflows (FP test): ${validWorkflows.length}\n`)

  const rows: ValidationResult[] = []
  const categoryStats: Record<string, { total: number; caught: number }> = {}

  // ── Test invalid DAGs ──────────────────────────────────────────────────────
  console.log('Testing invalid DAGs...')

  for (const entry of invalidDAGs) {
    const { isValid, errors, responseTimeMs } = await validateWorkflow({
      nodes: entry.nodes,
      edges: entry.edges,
    })

    const caught = !isValid || errors.length > 0
    const errorReturned = errors[0]?.code ?? (isValid ? 'NONE' : 'UNKNOWN')
    const correctType = errorReturned === entry.expected_error ||
      errors.some(e => e.code === entry.expected_error)

    if (!categoryStats[entry.category]) {
      categoryStats[entry.category] = { total: 0, caught: 0 }
    }
    categoryStats[entry.category].total++
    if (caught) categoryStats[entry.category].caught++

    const status = caught
      ? (correctType ? '✓ CORRECT' : '~ CAUGHT (wrong type)')
      : '✗ MISSED'

    console.log(`  [${entry.id}] ${entry.category} — ${status} (expected: ${entry.expected_error}, got: ${errorReturned})`)

    rows.push({
      dag_id:             entry.id,
      category:           entry.category,
      expected_error:     entry.expected_error,
      caught,
      error_returned:     errorReturned,
      correct_error_type: correctType,
      false_positive:     false,
      response_time_ms:   responseTimeMs,
      timestamp:          new Date().toISOString(),
    })

    await new Promise(r => setTimeout(r, 50))
  }

  // ── Test valid workflows for false positives ───────────────────────────────
  console.log('\nTesting valid workflows (false positive check)...')
  let falsePositives = 0

  for (const entry of validWorkflows) {
    // Build a simple valid workflow structure from golden dataset entry
    const mockWorkflow = {
      nodes: entry.expected_nodes.map((type: string, i: number) => ({
        id: `n${i + 1}`,
        type,
        variableName: entry.expected_variables[i] ?? `var${i}`,
        credentialId: type.includes('TRIGGER') ? null : `mock-cred-${type.toLowerCase()}`,
      })),
      edges: entry.expected_edges.map(([src, tgt]: [string, string], i: number) => ({
        source: `n${entry.expected_nodes.indexOf(src) + 1}`,
        target: `n${entry.expected_nodes.indexOf(tgt) + 1}`,
        id: `e${i}`,
      })),
    }

    const { isValid, errors, responseTimeMs } = await validateWorkflow(mockWorkflow)
    const falsePositive = !isValid && errors.length > 0

    if (falsePositive) {
      falsePositives++
      console.log(`  [${entry.id}] ✗ FALSE POSITIVE — ${errors[0]?.code}`)
    } else {
      console.log(`  [${entry.id}] ✓ correctly passed validation`)
    }

    rows.push({
      dag_id:             entry.id + '_valid',
      category:           'valid_workflow',
      expected_error:     'NONE',
      caught:             false,
      error_returned:     errors[0]?.code ?? 'NONE',
      correct_error_type: !falsePositive,
      false_positive:     falsePositive,
      response_time_ms:   responseTimeMs,
      timestamp:          new Date().toISOString(),
    })

    await new Promise(r => setTimeout(r, 50))
  }

  await writer.writeRecords(rows)

  // ── Summary ────────────────────────────────────────────────────────────────
  const invalidRows = rows.filter(r => !r.false_positive && r.category !== 'valid_workflow')
  const totalCaught = invalidRows.filter(r => r.caught).length
  const recall      = invalidRows.length > 0 ? totalCaught / invalidRows.length : 0
  const correctType = invalidRows.filter(r => r.correct_error_type).length
  const precision   = totalCaught > 0 ? correctType / totalCaught : 0
  const fpRate      = validWorkflows.length > 0 ? falsePositives / validWorkflows.length : 0

  console.log('\n─── Summary ───────────────────────────────────────────')
  console.log(`Recall:           ${(recall * 100).toFixed(1)}%  ${recall >= 0.90 ? '✓ meets target (≥90%)' : '✗ below target'}`)
  console.log(`Precision:        ${(precision * 100).toFixed(1)}%`)
  console.log(`False positive:   ${(fpRate * 100).toFixed(1)}%  ${fpRate <= 0.05 ? '✓ acceptable (≤5%)' : '✗ too high'}`)
  console.log('\nPer category:')
  for (const [cat, s] of Object.entries(categoryStats)) {
    const r = (s.caught / s.total * 100).toFixed(0)
    console.log(`  ${cat.padEnd(30)} ${s.caught}/${s.total} (${r}%)`)
  }
  console.log(`\nResults written to: ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
