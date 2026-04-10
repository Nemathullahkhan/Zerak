/**
 * run-all.ts
 * Zerak Benchmark Orchestrator
 *
 * Runs all benchmark modules in sequence.
 * Safe to interrupt — each module writes results incrementally.
 *
 * Usage:
 *   npx tsx benchmark/scripts/run-all.ts              # full run
 *   npx tsx benchmark/scripts/run-all.ts --smoke      # 5 prompts, 1 run (fast check)
 *   npx tsx benchmark/scripts/run-all.ts --skip nlp   # skip a module
 *   npx tsx benchmark/scripts/run-all.ts --only tokens # run one module
 */

import { execSync, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isSmoke  = args.includes('--smoke')
const skipMod  = args[args.indexOf('--skip') + 1] ?? null
const onlyMod  = args[args.indexOf('--only') + 1] ?? null

const SCRIPTS_DIR = path.join(process.cwd(), 'benchmark', 'scripts')
const LOG_PATH    = path.join(process.cwd(), 'benchmark', 'results', 'run-log.txt')

// ─── Module definitions ───────────────────────────────────────────────────────

const modules = [
  {
    id: 'nlp',
    name: 'NLP accuracy',
    script: 'evaluate-nlp.ts',
    args: isSmoke ? ['--sample', '5', '--runs', '1', '--out', 'nlp-smoke.csv'] : ['--runs', '5'],
    estimatedMinutes: isSmoke ? 1 : 180,
  },
  {
    id: 'validation',
    name: 'Validation effectiveness',
    script: 'evaluate-validation.ts',
    args: [],
    estimatedMinutes: 1,
  },
  {
    id: 'tokens',
    name: 'Token efficiency',
    script: 'compare-tokens.ts',
    args: isSmoke ? ['--sample', '5'] : ['--sample', '30'],
    estimatedMinutes: isSmoke ? 2 : 20,
  },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG_PATH, line + '\n')
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

async function runModule(mod: typeof modules[number]): Promise<boolean> {
  const scriptPath = path.join(SCRIPTS_DIR, mod.script)

  return new Promise(resolve => {
    const child = spawn('npx', ['tsx', scriptPath, ...mod.args], {
      stdio: 'inherit',
      env: { ...process.env },
    })

    child.on('close', code => {
      resolve(code === 0)
    })

    child.on('error', err => {
      log(`  Error spawning process: ${err.message}`)
      resolve(false)
    })
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(path.join(process.cwd(), 'benchmark', 'results'), { recursive: true })

  const mode = isSmoke ? 'SMOKE TEST' : 'FULL RUN'
  const separator = '─'.repeat(55)

  log(`\n${separator}`)
  log(`Zerak Benchmark Suite — ${mode}`)
  log(`Started: ${new Date().toLocaleString()}`)
  log(`Node: ${process.version}`)
  log(`Working dir: ${process.cwd()}`)
  log(separator)

  // Check server is running
  try {
    const base = process.env.BENCHMARK_BASE_URL ?? 'http://localhost:3000'
    await fetch(`${base}/api/trpc`, { signal: AbortSignal.timeout(3000) })
  } catch {
    log('\n✗ ERROR: Zerak server is not running.')
    log('  Start it with: npm run dev')
    log('  Then retry: npx tsx benchmark/scripts/run-all.ts')
    process.exit(1)
  }

  log('\n✓ Server is reachable\n')

  const activeModules = modules.filter(m => {
    if (onlyMod) return m.id === onlyMod
    if (skipMod === m.id) return false
    return true
  })

  if (activeModules.length === 0) {
    log('No modules to run. Check --only / --skip flags.')
    process.exit(1)
  }

  const totalEstimated = activeModules.reduce((s, m) => s + m.estimatedMinutes, 0)
  log(`Modules to run: ${activeModules.map(m => m.name).join(', ')}`)
  log(`Estimated total time: ~${totalEstimated < 60 ? totalEstimated + ' min' : Math.round(totalEstimated / 60) + ' hr'}\n`)

  const results: Record<string, { success: boolean; durationMs: number }> = {}

  for (let i = 0; i < activeModules.length; i++) {
    const mod = activeModules[i]
    log(`\n[${i + 1}/${activeModules.length}] ${mod.name}`)
    log(`  Script: ${mod.script}`)
    log(`  Args: ${mod.args.join(' ') || '(none)'}`)
    log(`  Estimated: ~${mod.estimatedMinutes} min`)

    const start = Date.now()
    const success = await runModule(mod)
    const duration = Date.now() - start

    results[mod.id] = { success, durationMs: duration }

    if (success) {
      log(`  ✓ Completed in ${formatDuration(duration)}`)
    } else {
      log(`  ✗ FAILED after ${formatDuration(duration)}`)
      log('  Results so far have been written. Continuing with next module...')
    }
  }

  // Final summary
  log(`\n${separator}`)
  log('Run summary')
  log(separator)

  let allPassed = true
  for (const [id, result] of Object.entries(results)) {
    const mod = modules.find(m => m.id === id)!
    const status = result.success ? '✓ PASSED' : '✗ FAILED'
    log(`  ${status}  ${mod.name.padEnd(30)} ${formatDuration(result.durationMs)}`)
    if (!result.success) allPassed = false
  }

  log(`\nResults directory: ${path.join(process.cwd(), 'benchmark', 'results')}`)
  log(`Run log: ${LOG_PATH}`)
  log('\nNext steps:')
  log('  1. Run analysis: python3 benchmark/scripts/analyse.py')
  log('  2. Review failure cases: benchmark/results/failure-cases.csv')
  log('  3. Run ablation study: ABLATION_NO_VALIDATOR=true npx tsx benchmark/scripts/evaluate-nlp.ts --sample 30 --runs 3 --out ablation-b.csv')

  if (!allPassed) {
    log('\n⚠  Some modules failed. Check run-log.txt for details.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error in run-all.ts:', err)
  process.exit(1)
})
