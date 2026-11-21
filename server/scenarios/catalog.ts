import type { TrialRun } from '../../src/live-checkpoints.ts'
import { fieldOutingScenario } from './field-outing.ts'
import { ferryScenarios } from './ferry.ts'
import { harborScenarios } from './harbor.ts'
import { materialsScenario } from './materials.ts'
import { residentScenarios } from './residents.ts'
import { ridgeScenarios } from './ridge.ts'
import { wrenScenarios } from './wren.ts'

// The first entry is the default for an unconfigured playtest host.
const scenarios = [...wrenScenarios, ...harborScenarios, ...ridgeScenarios, ...residentScenarios, materialsScenario, ...ferryScenarios, fieldOutingScenario]
const byId = new Map(scenarios.map(scenario => [scenario.id, scenario]))
if (byId.size !== scenarios.length) throw new Error('Live scenario IDs must be unique')

export const scenarioCatalog = scenarios.map(({ id, title, island }) => ({ id, title, island }))

export function scenarioFor(id: string) {
  const scenario = byId.get(id)
  if (!scenario) throw new Error(`Unknown live scenario: ${id}`)
  return scenario
}

export function checkpointSettings(checkpoint: unknown, count: unknown) {
  if (typeof checkpoint !== 'string' || !byId.has(checkpoint) || (count !== '1' && count !== '2')) return undefined
  const seats: TrialRun['seats'] = count === '1' ? 1 : 2
  return { checkpoint, seats }
}
