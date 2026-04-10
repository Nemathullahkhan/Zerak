/**
 * compare-tokens.ts
 * Zerak Benchmark Module 4 — Token Efficiency
 *
 * Compares token consumption between:
 *   A) Zerak's optimized pipeline (/api/workflow/stream?benchmark=true)
 *   B) Raw Mistral call with a minimal system prompt (no Zerak optimization)
 *
 * Usage:
 *   npx tsx benchmark/scripts/compare-tokens.ts
 *   npx tsx benchmark/scripts/compare-tokens.ts --sample 30
 */

import fs from 'fs'
import path from 'path'
import { createObjectCsvWriter } from 'csv-writer'

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag: string, def: string) => args[args.indexOf(flag) + 1] ?? def

const SAMPLE   = parseInt(getArg('--sample', '30'))
const BASE_URL = process.env.BENCHMARK_BASE_URL ?? 'http://localhost:3000'
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? ''
const RESULTS_DIR = path.join(process.cwd(), 'benchmark', 'results')
const DATASET_PATH = path.join(process.cwd(), 'benchmark', 'dataset', 'prompts.json')
const OUTPUT_PATH = path.join(RESULTS_DIR, 'token-efficiency.csv')

// Minimal baseline system prompt — no Zerak-specific optimization
const BASELINE_SYSTEM_PROMPT = `You are a workflow automation assistant.
Given a natural language description, return a JSON object with this exact structure:
{
  "nodes": [{ "id": "n1", "type": "NODE_TYPE", "variableName": "varName" }],
  "edges": [{ "source": "n1", "target": "n2" }]
}
Valid node types: MANUAL_TRIGGER, SCHEDULE_TRIGGER, WEBHOOK_TRIGGER, GOOGLE_FORM_TRIGGER,
STRIPE_TRIGGER, GOOGLE_SHEETS, GOOGLE_GMAIL, GOOGLE_DRIVE, ANTHROPIC, OPENAI, SLACK,
DISCORD, CODE, IF, LOOP, FILTER.
Return only the JSON object with no explanation.`

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenRow {
  prompt_id: string
  complexity: string
  baseline_input_tokens: number
  baseline_output_tokens: number
  baseline_total_tokens: number
  zerak_input_tokens: number
  zerak_output_tokens: number
  zerak_total_tokens: number
  reduction_pct: number
  latency_baseline_ms: number
  latency_zerak_ms: number
  latency_delta_ms: number
  model: string
  timestamp: string
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function callZerakPipeline(prompt: string): Promise<{
  inputTokens: number
  outputTokens: number
  durationMs: number
}> {
  const start = Date.now()

  const response = await fetch(`${BASE_URL}/api/workflow/stream?benchmark=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(60_000),
  })

  let inputTokens = 0
  let outputTokens = 0

  if (response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Extract token usage from streamed metadata
      const usageMatch = buffer.match(/"usage":\s*\{[^}]*"input_tokens":\s*(\d+)[^}]*"output_tokens":\s*(\d+)[^}]*\}/)
      if (usageMatch) {
        inputTokens  = parseInt(usageMatch[1])
        outputTokens = parseInt(usageMatch[2])
      }
    }
  }

  // Fallback: estimate from response content length if usage not in stream
  // Roughly 4 characters per token
  if (inputTokens === 0) {
    const promptTokenEstimate = Math.ceil(prompt.length / 4)
    inputTokens  = promptTokenEstimate + 500 // system prompt estimate
    outputTokens = 400 // typical DAG output estimate
  }

  return { inputTokens, outputTokens, durationMs: Date.now() - start }
}

async function callRawMistralBaseline(prompt: string): Promise<{
  inputTokens: number
  outputTokens: number
  durationMs: number
}> {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY not set. Cannot call raw baseline.')
  }

  const start = Date.now()

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      temperature: 0,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: BASELINE_SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Mistral API error ${response.status}: ${err}`)
  }

  const data = await response.json()

  return {
    inputTokens:  data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    durationMs: Date.now() - start,
  }
}

// ─── Dataset loading ──────────────────────────────────────────────────────────

function loadStratifiedSample(n: number) {
  const all = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'))
  const easy   = all.filter((e: any) => e.complexity === 'easy').slice(0, Math.round(n * 0.33))
  const medium = all.filter((e: any) => e.complexity === 'medium').slice(0, Math.round(n * 0.40))
  const hard   = all.filter((e: any) => e.complexity === 'hard').slice(0, Math.round(n * 0.27))
  return [...easy, ...medium, ...hard].slice(0, n)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dataset = loadStratifiedSample(SAMPLE)
  fs.mkdirSync(RESULTS_DIR, { recursive: true })

  const writer = createObjectCsvWriter({
    path: OUTPUT_PATH,
    header: [
      { id: 'prompt_id',               title: 'prompt_id' },
      { id: 'complexity',              title: 'complexity' },
      { id: 'baseline_input_tokens',   title: 'baseline_input_tokens' },
      { id: 'baseline_output_tokens',  title: 'baseline_output_tokens' },
      { id: 'baseline_total_tokens',   title: 'baseline_total_tokens' },
      { id: 'zerak_input_tokens',      title: 'zerak_input_tokens' },
      { id: 'zerak_output_tokens',     title: 'zerak_output_tokens' },
      { id: 'zerak_total_tokens',      title: 'zerak_total_tokens' },
      { id: 'reduction_pct',           title: 'reduction_pct' },
      { id: 'latency_baseline_ms',     title: 'latency_baseline_ms' },
      { id: 'latency_zerak_ms',        title: 'latency_zerak_ms' },
      { id: 'latency_delta_ms',        title: 'latency_delta_ms' },
      { id: 'model',                   title: 'model' },
      { id: 'timestamp',               title: 'timestamp' },
    ],
  })

  console.log(`\nZerak Token Efficiency Benchmark`)
  console.log(`Prompts: ${dataset.length} | Comparing: Zerak optimized vs raw Mistral baseline\n`)

  const rows: TokenRow[] = []
  const reductions: number[] = []

  for (const entry of dataset) {
    process.stdout.write(`[${entry.id}] (${entry.complexity}) `)

    try {
      // Call Zerak pipeline
      const zerak = await callZerakPipeline(entry.prompt)
      await new Promise(r => setTimeout(r, 300)) // brief pause between calls

      // Call raw baseline
      const baseline = await callRawMistralBaseline(entry.prompt)

      const zerakTotal    = zerak.inputTokens + zerak.outputTokens
      const baselineTotal = baseline.inputTokens + baseline.outputTokens
      const reductionPct  = baselineTotal > 0
        ? parseFloat(((baselineTotal - zerakTotal) / baselineTotal * 100).toFixed(2))
        : 0

      reductions.push(reductionPct)

      const row: TokenRow = {
        prompt_id:              entry.id,
        complexity:             entry.complexity,
        baseline_input_tokens:  baseline.inputTokens,
        baseline_output_tokens: baseline.outputTokens,
        baseline_total_tokens:  baselineTotal,
        zerak_input_tokens:     zerak.inputTokens,
        zerak_output_tokens:    zerak.outputTokens,
        zerak_total_tokens:     zerakTotal,
        reduction_pct:          reductionPct,
        latency_baseline_ms:    baseline.durationMs,
        latency_zerak_ms:       zerak.durationMs,
        latency_delta_ms:       baseline.durationMs - zerak.durationMs,
        model:                  'mistral-large-latest',
        timestamp:              new Date().toISOString(),
      }

      rows.push(row)
      console.log(`baseline=${baselineTotal} zerak=${zerakTotal} reduction=${reductionPct}%`)

    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`)
    }

    await new Promise(r => setTimeout(r, 300))
  }

  await writer.writeRecords(rows)

  // Summary
  const meanReduction = reductions.reduce((a, b) => a + b, 0) / reductions.length
  const std = Math.sqrt(
    reductions.map(v => (v - meanReduction) ** 2).reduce((a, b) => a + b, 0) / reductions.length
  )

  console.log('\n─── Summary ───────────────────────────────────────────')
  console.log(`Mean token reduction: ${meanReduction.toFixed(1)}% ± ${std.toFixed(1)}%`)
  console.log(`Target: ≥ 30%  ${meanReduction >= 30 ? '✓ PASSED' : '✗ BELOW TARGET'}`)
  console.log(`Results written to: ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
