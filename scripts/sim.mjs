import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { URL } from 'node:url'
import { parseArgs } from 'node:util'
import { Worker } from 'node:worker_threads'
import { readSimOptions, simUsage } from '../server/sim/options.ts'
import { simulationVersion } from '../server/sim/runner.ts'
import { summarizeSweep } from '../server/sim/summary.ts'

const millisecondsPerSecond = 1000
const jsonIndent = 2

// Runs each seed in a worker so a sweep uses every core. Output order follows the seed list, not finishing order.
function runPool(jobs, workers, report) {
  const results = new Array(jobs.length)
  let next = 0, done = 0
  return new Promise((resolve, reject) => {
    const pool = Array.from({ length: Math.min(workers, jobs.length) }, () => new Worker(new URL('./sim-worker.mjs', import.meta.url)))
    const feed = (worker) => {
      if (next >= jobs.length) return void worker.terminate()
      const index = next++
      worker.once('message', (result) => {
        results[index] = result
        report(++done, jobs.length, result)
        if (done === jobs.length) resolve(results)
        feed(worker)
      })
      worker.postMessage(jobs[index])
    }
    for (const worker of pool) {
      worker.on('error', reject)
      feed(worker)
    }
  })
}

function loadRecording(path) {
  const recording = JSON.parse(readFileSync(path, 'utf8'))
  if (recording.version !== simulationVersion) throw new Error(`Recording version ${recording.version} needs sim version ${simulationVersion}.`)
  return recording
}

async function main() {
  const text = { type: 'string' }
  const { values } = parseArgs({ options: { scenario: text, days: text, seeds: text, crew: text, out: text, replay: text, workers: text, help: { type: 'boolean' } } })
  if (values.help) return void process.stdout.write(simUsage + '\n')
  const options = readSimOptions(values)
  const recording = options.replay && loadRecording(options.replay)
  const jobs = recording
    ? recording.runs.map(({ run, inputs }) => ({ run, replay: inputs }))
    : options.seeds.map((seed) => ({ run: { scenario: options.scenario, days: options.days, seed, crew: options.crew } }))
  const workers = options.workers ?? Math.max(1, availableParallelism() - 1)
  const started = performance.now()
  const results = await runPool(jobs, workers, (done, total, result) => process.stderr.write(`seed ${result.run.seed} · ${done}/${total}\n`))
  const seconds = (performance.now() - started) / millisecondsPerSecond
  if (recording) {
    const mismatched = results.filter((result, index) => result.digest !== recording.runs[index].digest)
    for (const result of mismatched) process.stderr.write(`Seed ${result.run.seed} diverged from the recording.\n`)
    process.stdout.write(`Replayed ${results.length} runs: ${mismatched.length ? `${mismatched.length} diverged` : 'all identical'}.\n`)
    process.exitCode = mismatched.length ? 1 : 0
    return
  }
  const folder = options.out ?? join('sims', options.scenario)
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'events.jsonl'), results.flatMap((result) => result.lines).join('\n') + '\n')
  const ticks = results[0].ticks
  const summary = {
    version: simulationVersion,
    commit: process.env.SIM_COMMIT || 'unknown',
    scenario: options.scenario,
    days: options.days,
    crew: options.crew,
    seeds: options.seeds,
    wallSeconds: Number(seconds.toFixed(1)),
    sweep: summarizeSweep(results.map((result) => result.summary), ticks),
    bySeed: results.map((result) => ({ ...result.summary, digest: result.digest })),
  }
  writeFileSync(join(folder, 'summary.json'), JSON.stringify(summary, null, jsonIndent) + '\n')
  writeFileSync(join(folder, 'recording.json'), JSON.stringify({ version: simulationVersion, commit: summary.commit, runs: results.map(({ run, inputs, digest }) => ({ run, inputs, digest })) }) + '\n')
  process.stdout.write(`Wrote ${folder}/events.jsonl, summary.json and recording.json for ${results.length} seeds in ${summary.wallSeconds} s.\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n${simUsage}\n`)
  process.exitCode = 1
})
