import { createHash } from 'node:crypto'
import { parentPort } from 'node:worker_threads'
import { simulateSeed } from '../server/sim/sweep.ts'

parentPort.on('message', ({ run, replay }) => {
  const result = simulateSeed(run, replay)
  parentPort.postMessage({ ...result, digest: createHash('sha256').update(result.lines.join('\n')).digest('hex') })
})
