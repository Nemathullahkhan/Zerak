/**
 * evaluate-nlp.ts
 * Zerak Benchmark Module 1 — NLP to DAG Accuracy
 *
 * Usage:
 *   npx tsx benchmark/scripts/evaluate-nlp.ts
 *   npx tsx benchmark/scripts/evaluate-nlp.ts --sample 5 --runs 1    # smoke test
 *   npx tsx benchmark/scripts/evaluate-nlp.ts --runs 5               # full run
 *   npx tsx benchmark/scripts/evaluate-nlp.ts --out custom-name.csv  # custom output file
 */

import fs from 'fs'
import path from 'path'
import { createObjectCsvWriter } from 'csv-writer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoldenEntry {
  id: string
  prompt: string
  complexity: 'easy' | 'medium' | 'hard'
  expected_nodes: string[]
  expected_edges: [string, string][]
  expected_variables: string[]
  integration_count: number
  has_branch: boolean
  has_loop: boolean
  has_ai: boolean
  notes?: string
}

interface ParsedDAG {
  nodes: string[]        // node type strings e.g. ["GOOGLE_SHEETS", "SLACK"]
  edges: [string, string][] // [sourceType, targetType] pairs
  variables: string[]   // variableName strings
  rawResponse: string
}

interface BenchmarkRow {
  prompt_id: string
  run: number
  node_f1: number
  node_precision: number
  node_recall: number
  edge_accuracy: number
  var_accuracy: number
  tokens_input: number
  tokens_output: number
  duration_ms: number
  complexity: string
  model: string
  success: boolean
  timestamp: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag: string, defaultVal: string) =>
  args[args.indexOf(flag) + 1] ?? defaultVal

const RUNS    = parseInt(getArg('--runs', '5'))
const SAMPLE  = parseInt(getArg('--sample', '0'))  // 0 = all prompts
const OUT     = getArg('--out', 'nlp-accuracy.csv')
const BASE_URL = process.env.BENCHMARK_BASE_URL ?? 'http://localhost:3000'
const MODEL   = process.env.BENCHMARK_MODEL ?? 'mistral'

const RESULTS_DIR = path.join(process.cwd(), 'benchmark', 'results')
const DATASET_PATH = path.join(process.cwd(), 'benchmark', 'dataset', 'prompts.json')
const OUTPUT_PATH = path.join(RESULTS_DIR, OUT)

// ─── Dataset loading ──────────────────────────────────────────────────────────

function loadDataset(): GoldenEntry[] {
  const raw = fs.readFileSync(DATASET_PATH, 'utf8')
  let entries: GoldenEntry[] = JSON.parse(raw)

  if (SAMPLE > 0) {
    // Stratified sample: equal distribution across complexity tiers
    const easy   = entries.filter(e => e.complexity === 'easy').slice(0, Math.ceil(SAMPLE * 0.3))
    const medium = entries.filter(e => e.complexity === 'medium').slice(0, Math.ceil(SAMPLE * 0.4))
    const hard   = entries.filter(e => e.complexity === 'hard').slice(0, Math.ceil(SAMPLE * 0.3))
    entries = [...easy, ...medium, ...hard].slice(0, SAMPLE)
  }

  return entries
}

// ─── Stream parsing ───────────────────────────────────────────────────────────

async function callStreamEndpoint(prompt: string): Promise<{
  dag: ParsedDAG | null
  tokensInput: number
  tokensOutput: number
  durationMs: number
}> {
  const start = Date.now()

  try {
    const response = await fetch(`${BASE_URL}/api/workflow/stream?benchmark=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(60_000), // 60s timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let fullText = ''
    let tokensInput = 0
    let tokensOutput = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      fullText += chunk

      // Extract token usage if present in stream metadata
      const usageMatch = chunk.match(/"usage":\s*\{"input_tokens":(\d+),"output_tokens":(\d+)\}/)
      if (usageMatch) {
        tokensInput  = parseInt(usageMatch[1])
        tokensOutput = parseInt(usageMatch[2])
      }
    }

    const dag = parseDAGFromStreamOutput(fullText)
    const durationMs = Date.now() - start

    return { dag, tokensInput, tokensOutput, durationMs }

  } catch (err) {
    console.error(`  Stream error: ${(err as Error).message}`)
    return { dag: null, tokensInput: 0, tokensOutput: 0, durationMs: Date.now() - start }
  }
}

function parseDAGFromStreamOutput(raw: string): ParsedDAG | null {
  try {
    // The stream emits JSON chunks. Extract the final complete workflow JSON.
    // Look for the last complete JSON object with nodes and edges arrays.
    const jsonMatches = [...raw.matchAll(/\{[^{}]*"nodes":\s*\[[^\]]*\][^{}]*"edges":\s*\[[^\]]*\][^{}]*\}/gs)]

    if (jsonMatches.length === 0) {
      // Fallback: try to find any JSON array of node objects
      const nodeMatches = [...raw.matchAll(/"type":\s*"([A-Z_]+)"/g)]
      const varMatches  = [...raw.matchAll(/"variableName":\s*"(\w+)"/g)]

      if (nodeMatches.length === 0) return null

      return {
        nodes: nodeMatches.map(m => m[1]),
        edges: [],  // can't reconstruct edges without full structure
        variables: varMatches.map(m => m[1]),
        rawResponse: raw,
      }
    }

    // Use the last (most complete) match
    const lastMatch = jsonMatches[jsonMatches.length - 1]
    const parsed = JSON.parse(lastMatch[0])

    const nodes: string[]        = parsed.nodes?.map((n: any) => n.type as string) ?? []
    const variables: string[]    = parsed.nodes?.map((n: any) => n.variableName as string).filter(Boolean) ?? []
    const edges: [string, string][] = []

    // Convert edge IDs to type pairs
    if (parsed.edges && parsed.nodes) {
      const nodeMap = new Map<string, string>(
        parsed.nodes.map((n: any) => [n.id, n.type])
      )
      for (const edge of parsed.edges) {
        const sourceType = nodeMap.get(edge.source)
        const targetType = nodeMap.get(edge.target)
        if (sourceType && targetType) {
          edges.push([sourceType, targetType])
        }
      }
    }

    return { nodes, edges, variables, rawResponse: raw }

  } catch {
    return null
  }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function computeNodeF1(
  generated: string[],
  expected: string[]
): { f1: number; precision: number; recall: number } {
  if (expected.length === 0 && generated.length === 0) {
    return { f1: 1.0, precision: 1.0, recall: 1.0 }
  }

  // Count matches using multiset intersection
  const genCounts  = countMap(generated)
  const expCounts  = countMap(expected)
  let correct = 0

  for (const [type, count] of genCounts) {
    correct += Math.min(count, expCounts.get(type) ?? 0)
  }

  const precision = generated.length > 0 ? correct / generated.length : 0
  const recall    = expected.length > 0  ? correct / expected.length  : 0
  const f1        = (precision + recall) > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0

  return { f1, precision, recall }
}

function computeEdgeAccuracy(
  generatedEdges: [string, string][],
  expectedEdges: [string, string][]
): number {
  if (expectedEdges.length === 0) return 1.0

  // Normalize edge representation for comparison
  const normalize = (e: [string, string]) => `${e[0]}→${e[1]}`
  const genSet = new Set(generatedEdges.map(normalize))
  const expSet = expectedEdges.map(normalize)

  const matched = expSet.filter(e => genSet.has(e)).length
  return matched / expectedEdges.length
}

function computeVariableAccuracy(
  generatedVars: string[],
  expectedVars: string[]
): number {
  if (expectedVars.length === 0) return 1.0

  const genSet = new Set(generatedVars)
  const matched = expectedVars.filter(v => genSet.has(v)).length
  return matched / expectedVars.length
}

function countMap(arr: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of arr) map.set(item, (map.get(item) ?? 0) + 1)
  return map
}

// ─── CSV writer setup ─────────────────────────────────────────────────────────

function createWriter() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  return createObjectCsvWriter({
    path: OUTPUT_PATH,
    header: [
      { id: 'prompt_id',       title: 'prompt_id' },
      { id: 'run',             title: 'run' },
      { id: 'node_f1',         title: 'node_f1' },
      { id: 'node_precision',  title: 'node_precision' },
      { id: 'node_recall',     title: 'node_recall' },
      { id: 'edge_accuracy',   title: 'edge_accuracy' },
      { id: 'var_accuracy',    title: 'var_accuracy' },
      { id: 'tokens_input',    title: 'tokens_input' },
      { id: 'tokens_output',   title: 'tokens_output' },
      { id: 'duration_ms',     title: 'duration_ms' },
      { id: 'complexity',      title: 'complexity' },
      { id: 'model',           title: 'model' },
      { id: 'success',         title: 'success' },
      { id: 'timestamp',       title: 'timestamp' },
    ],
    append: false,
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dataset = loadDataset()
  const writer  = createWriter()
  const rows: BenchmarkRow[] = []
  const total = dataset.length * RUNS

  console.log(`\nZerak NLP Accuracy Benchmark`)
  console.log(`Prompts: ${dataset.length} | Runs per prompt: ${RUNS} | Total calls: ${total}`)
  console.log(`Model: ${MODEL} | Output: ${OUTPUT_PATH}\n`)

  let completed = 0
  const stats = { easy: [] as number[], medium: [] as number[], hard: [] as number[] }

  for (const entry of dataset) {
    console.log(`[${entry.id}] (${entry.complexity}) "${entry.prompt.slice(0, 60)}..."`)

    for (let run = 1; run <= RUNS; run++) {
      process.stdout.write(`  Run ${run}/${RUNS}... `)

      const { dag, tokensInput, tokensOutput, durationMs } = await callStreamEndpoint(entry.prompt)

      let row: BenchmarkRow

      if (!dag) {
        row = {
          prompt_id: entry.id, run,
          node_f1: NaN, node_precision: NaN, node_recall: NaN,
          edge_accuracy: NaN, var_accuracy: NaN,
          tokens_input: tokensInput, tokens_output: tokensOutput,
          duration_ms: durationMs, complexity: entry.complexity,
          model: MODEL, success: false, timestamp: new Date().toISOString(),
        }
        console.log(`FAILED (no parseable DAG)`)
      } else {
        const { f1, precision, recall } = computeNodeF1(dag.nodes, entry.expected_nodes)
        const edgeAcc = computeEdgeAccuracy(dag.edges, entry.expected_edges)
        const varAcc  = computeVariableAccuracy(dag.variables, entry.expected_variables)

        row = {
          prompt_id: entry.id, run,
          node_f1: parseFloat(f1.toFixed(4)),
          node_precision: parseFloat(precision.toFixed(4)),
          node_recall: parseFloat(recall.toFixed(4)),
          edge_accuracy: parseFloat(edgeAcc.toFixed(4)),
          var_accuracy: parseFloat(varAcc.toFixed(4)),
          tokens_input: tokensInput, tokens_output: tokensOutput,
          duration_ms: durationMs, complexity: entry.complexity,
          model: MODEL, success: true, timestamp: new Date().toISOString(),
        }

        stats[entry.complexity].push(f1)
        console.log(`F1=${f1.toFixed(3)} edge=${edgeAcc.toFixed(3)} var=${varAcc.toFixed(3)} (${durationMs}ms)`)
      }

      rows.push(row)
      completed++

      // Write in batches of 50 to avoid data loss on long runs
      if (rows.length % 50 === 0) {
        await writer.writeRecords(rows.splice(0, 50))
      }

      // Rate limiting — 200ms between calls
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // Write remaining rows
  if (rows.length > 0) await writer.writeRecords(rows)

  // Print summary
  console.log('\n─── Summary ───────────────────────────────────────────')
  console.log(`Completed: ${completed}/${total} runs`)
  for (const tier of ['easy', 'medium', 'hard'] as const) {
    const vals = stats[tier]
    if (vals.length === 0) continue
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const std  = Math.sqrt(vals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length)
    const target = mean >= 0.80 ? '✓ meets target' : '✗ below target (0.80)'
    console.log(`  ${tier.padEnd(8)}: F1 = ${mean.toFixed(3)} ± ${std.toFixed(3)}  ${target}`)
  }
  console.log(`\nResults written to: ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
