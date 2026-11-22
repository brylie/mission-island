import { runSimulation, simulationVersion, type RecordedInput, type SimEvent, type SimRun } from './runner.ts'
import { summarizeSeed } from './summary.ts'

// One seed's complete output. The worker digests the lines so a replay can prove it reproduced the same events.
export function simulateSeed(run: SimRun, replay?: readonly RecordedInput[]) {
  const events: SimEvent[] = []
  const result = runSimulation(run, (event) => void events.push(event), replay)
  const lines = events.map((event) => JSON.stringify(event))
  return { run, version: simulationVersion, lines, inputs: result.inputs, ticks: result.ticks, summary: summarizeSeed(result, events) }
}
