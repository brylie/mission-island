import type { Player, ServerMessage, Snapshot } from './protocol.ts'
import type { FavorGuide } from './residents/definition.ts'
import { materialSources, repairSite, sampleTray } from './worlds/starter/materials.ts'

export const repairMaterials = ['timber', 'stone'] as const
export type RepairMaterial = typeof repairMaterials[number]
export type MaterialPockets = Record<RepairMaterial, number>
export const repairQuantity = 2
export const materialRefillSeconds = 4

export interface MaterialsWork {
  checkout: RepairMaterial | 'qualified'
  request: { material: RepairMaterial, delivered: number } | null
  readyAt: Record<RepairMaterial, number>
}

export function emptyMaterialPockets(): MaterialPockets {
  return { timber: 0, stone: 0 }
}

export function initialMaterialsWork(): MaterialsWork {
  return { checkout: 'timber', request: null, readyAt: emptyMaterialPockets() }
}

export function materialsOpen(state: Pick<Snapshot, 'gateRepair'>) {
  return state.gateRepair.stage === 'mended'
}

export function sourceOpen(state: Pick<Snapshot, 'gateRepair' | 'materialsWork'>, material: RepairMaterial) {
  return materialsOpen(state) && (material === 'timber' || state.materialsWork.checkout !== 'timber')
}

export function carriedMaterial(player: Pick<Player, 'materials'>, material: RepairMaterial) {
  return player.materials?.[material] ?? 0
}

export const gatheringAdvice: Record<RepairMaterial, string> = {
  timber: 'Take the marked fallen branch for edging. Leave the big fallen logs as shelter for wildlife.',
  stone: 'Take the loose stone from the surface for edging. Leave the cleft and its embedded rocks in place.',
}

export function materialsWaypoint(state: Snapshot, player: Player) {
  if (!materialsOpen(state)) return
  const { checkout, request } = state.materialsWork
  if (checkout !== 'qualified') return carriedMaterial(player, checkout) ? sampleTray : materialSources[checkout]
  if (!request) return repairSite
  if (request.delivered === repairQuantity) return
  return carriedMaterial(player, request.material) ? repairSite : materialSources[request.material]
}

export function materialsGuide(state: Snapshot, player: Player): FavorGuide {
  const { checkout, request } = state.materialsWork
  const title = repairSite.name
  if (checkout !== 'qualified') {
    return { title: 'Materials checkout', detail: gatheringAdvice[checkout], next: carriedMaterial(player, checkout)
      ? `Bring your ${checkout} sample to Wren’s mending bench by the ferry.`
      : `Look for ${materialSources[checkout].name.toLowerCase()} beside ${materialSources[checkout].landmark}, then return to Wren’s bench.` }
  }
  if (!request) return { title, detail: 'Your crew earned the Materials qualification.', next: `Choose ${repairQuantity} timber or ${repairQuantity} stone at the edging beside Wren’s mending bench.` }
  const { material, delivered } = request
  const remaining = repairQuantity - delivered
  if (remaining === 0) return { title, detail: `Both sections of ${material} edging are in place.`, next: 'Revisit the repair by Wren’s mending bench. Marked supplies are still available for future work.' }
  return { title, detail: `${remaining} ${material} still needed at the ferry approach.`, next: carriedMaterial(player, material)
    ? `Deliver your ${material} at the edging beside Wren’s mending bench.`
    : `Gather ${material} beside ${materialSources[material].landmark}. Either crewmate can deliver it.` }
}

export function materialsFeedback(notice: Extract<ServerMessage, { type: 'materials-step' }>) {
  const { material, step } = notice
  switch (step) {
    case 'gathered': return `Picked up 1 ${material}. ${gatheringAdvice[material]}`
    case 'inspected': return gatheringAdvice[material]
    case 'timber-checked': return 'Timber checked. Find a loose stone beside Splitstone Strand and bring it to Wren’s bench.'
    case 'qualified': return 'Crew Materials qualification earned. Choose timber or stone at Ferry Approach Edging.'
    case 'delivered': return `Put in 1 section of ${material} edging. ${notice.remaining} ${material} still needed.`
  }
}
