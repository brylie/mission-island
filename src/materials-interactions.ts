import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import { carriedMaterial, materialsOpen, repairMaterials, repairQuantity, sourceOpen } from './materials-work.ts'
import type { Player, Snapshot } from './protocol.ts'
import { walkingHeight } from './terrain.ts'
import { distance, type Point } from './world.ts'
import { materialSources, repairChoices, repairSite, sampleTray } from './worlds/starter/materials.ts'

const sourceReach = 2
const sourceAimHeight = 0.36
const sourceAimRadius = 0.64
const choiceReach = 1.8
const choiceAimHeight = 0.78
const choiceAimRadius = 0.47
const sampleTrayReach = 1.9
const trayAimHeight = 0.7
const trayAimRadius = 0.43
const repairReach = 2.5
const repairAimHeight = 0.6
const repairAimRadius = 0.64

export const materialsActions = {
  'gather-material': 'explicit',
  'check-material': 'explicit',
  'return-material-sample': 'explicit',
  'choose-repair-material': 'explicit',
  'deliver-repair-material': 'explicit',
} as const satisfies InteractionPolicies
export type MaterialsAction = keyof typeof materialsActions

function target(point: Point, height: number, name: string, radius: number) {
  return { name, at: { ...point, y: walkingHeight(point) + height }, radius, key: 'E' }
}

export function materialsInteractions(state: Snapshot, player: Player): InteractionOption<MaterialsAction>[] {
  if (!materialsOpen(state) || !player.grounded || player.onBed || player.truckSurface
    || state.items.some((item) => item.holder === player.id)) return []
  const options: InteractionOption<MaterialsAction>[] = []
  const { checkout, request, readyAt } = state.materialsWork
  for (const [subject, material] of repairMaterials.entries()) {
    const source = materialSources[material]
    if (sourceOpen(state, material) && distance(player, source) < sourceReach) {
      const full = carriedMaterial(player, material) >= repairQuantity
      const available = readyAt[material] <= state.islandTime
      options.push({ ...target(source, sourceAimHeight, source.name, sourceAimRadius), subject, action: available && !full ? 'gather-material' : 'check-material', label: full ? `Inspect marker · Your ${material} pocket is full` : available ? `Gather ${material}` : 'Inspect marker · Check back shortly' })
    }
    if (checkout === 'qualified' && !request && distance(player, repairChoices[material]) < choiceReach) {
      options.push({ ...target(repairChoices[material], choiceAimHeight, repairSite.name, choiceAimRadius), subject, action: 'choose-repair-material', label: `Choose ${repairQuantity} ${material} for the edging` })
    }
  }
  if (checkout !== 'qualified' && carriedMaterial(player, checkout) && distance(player, sampleTray) < sampleTrayReach) {
    options.push({ ...target(sampleTray, trayAimHeight, 'Wren’s sample tray', trayAimRadius), action: 'return-material-sample', subject: repairMaterials.indexOf(checkout), label: `Turn in the ${checkout} sample` })
  }
  if (request && request.delivered < repairQuantity && carriedMaterial(player, request.material) && distance(player, repairSite) < repairReach) {
    options.push({ ...target(repairSite, repairAimHeight, repairSite.name, repairAimRadius), action: 'deliver-repair-material', subject: repairMaterials.indexOf(request.material), label: `Deliver 1 ${request.material} · ${repairQuantity - request.delivered} still needed` })
  }
  return options.sort((a, b) => distance(player, a.at!) - distance(player, b.at!))
}
