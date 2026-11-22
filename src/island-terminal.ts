import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { createFerryTerminalModel } from './assets/ferry-terminal'
import { deckSolids, ferryServiceRestored, ferryStages, initialFerryRepair, stageNeeds } from './ferry-repair'
import type { MeshFactory } from './island-meshes'
import type { Snapshot } from './protocol'

const deckedStage = 2
const maxCoins = Math.max(...ferryStages.map(({ coins }) => coins))
const maxCrates = Math.max(...ferryStages.map(({ crates }) => crates))

function showSwatch(options: Mesh[], index: number) {
  options.forEach((mesh, i) => void mesh.setEnabled(i === index))
}

export function createFerryTerminal(meshes: MeshFactory) {
  const { down, raised, stages, signs, board, stackedTimber } = createFerryTerminalModel(meshes, deckSolids, {
    stages: ferryStages.length,
    coins: maxCoins,
    crates: maxCrates,
  })
  const { pips, coins, crates, firstCrewSwatch, completedSwatch } = board

  function owners(ledger: number[], needed: number, length: number) {
    const slots = ledger.flatMap((amount, slot) => Array.from({ length: amount }, () => slot + firstCrewSwatch))
    return Array.from({ length }, (_, i) => i < slots.length ? slots[i] : i < needed ? 1 : 0)
  }

  function updateTally(state: Pick<Snapshot, 'ferryRepair'>) {
    const { ferryRepair } = state
    const needs = stageNeeds(state)
    const ledger = ferryRepair.ledger[ferryRepair.stage]
    pips.forEach((options, i) => void showSwatch(options, i < ferryRepair.stage ? completedSwatch : i === ferryRepair.stage ? 1 : 0))
    const coinCells = needs && ledger ? owners(ledger.coins, needs.coins, maxCoins) : coins.map(() => completedSwatch)
    const crateCells = needs && ledger ? owners(ledger.crates, needs.crates, maxCrates) : crates.map(() => completedSwatch)
    coins.forEach((options, i) => void showSwatch(options, coinCells[i]))
    crates.forEach((options, i) => void showSwatch(options, crateCells[i]))
  }

  let shown = ''

  function update(state: Pick<Snapshot, 'ferryRepair'>) {
    const { stage, ledger, haul } = state.ferryRepair
    const key = `${stage}:${haul}:${JSON.stringify(ledger[stage] ?? null)}`
    if (key === shown) return
    shown = key
    const restored = ferryServiceRestored(state)
    down.setEnabled(!restored)
    raised.setEnabled(restored)
    stages.broken.setEnabled(stage === 0)
    stages.braced.setEnabled(stage >= 1)
    stages.scaffold.setEnabled(stage >= 1 && !restored)
    stages.decked.setEnabled(stage >= deckedStage)
    signs.soon.setEnabled(stage === deckedStage)
    signs.open.setEnabled(restored)
    signs.lit.setEnabled(restored)
    signs.dark.setEnabled(!restored)
    updateTally(state)
    const stacked = stageNeeds(state)?.cratesGiven ?? 0
    stackedTimber.forEach((mesh, i) => void mesh.setEnabled(i < stacked))
  }

  update(initialFerryRepair())
  return { update }
}
