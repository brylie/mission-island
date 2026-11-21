import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import { carriedMaterial, materialsOpen, repairMaterials, repairQuantity, sourceOpen } from './materials-work.ts'
import type { Player, Snapshot } from './protocol.ts'
import { walkingHeight } from './terrain.ts'
import { distance, type Point } from './world.ts'
import { materialSources, repairChoices, repairSite, sampleTray } from './worlds/starter/materials.ts'

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
  if (!materialsOpen(state) || !player.grounded || player.onBed || player.truckSurface ||
    state.items.some(item => item.holder === player.id)) return []
  const options: InteractionOption<MaterialsAction>[] = []
  const { checkout, request, readyAt } = state.materialsWork
  for (const [subject, material] of repairMaterials.entries()) {
    const source = materialSources[material]
    if (sourceOpen(state, material) && distance(player, source) < 2) {
      const full = carriedMaterial(player, material) >= repairQuantity
      const available = readyAt[material] <= state.islandTime
      options.push({ ...target(source, .36, source.name, .64), subject,
        action: available && !full ? 'gather-material' : 'check-material',
        label: full ? `Inspect marker · Your ${material} pocket is full` : available ? `Gather ${material}` : 'Inspect marker · Check back shortly' })
    }
    if (checkout === 'qualified' && !request && distance(player, repairChoices[material]) < 1.8) {
      options.push({ ...target(repairChoices[material], .78, repairSite.name, .47), subject,
        action: 'choose-repair-material', label: `Choose ${repairQuantity} ${material} for the edging` })
    }
  }
  if (checkout !== 'qualified' && carriedMaterial(player, checkout) && distance(player, sampleTray) < 1.9) {
    options.push({ ...target(sampleTray, .7, 'Wren’s sample tray', .43), action: 'return-material-sample',
      subject: repairMaterials.indexOf(checkout), label: `Turn in the ${checkout} sample` })
  }
  if (request && request.delivered < repairQuantity && carriedMaterial(player, request.material) && distance(player, repairSite) < 2.5) {
    options.push({ ...target(repairSite, .6, repairSite.name, .64), action: 'deliver-repair-material',
      subject: repairMaterials.indexOf(request.material),
      label: `Deliver 1 ${request.material} · ${repairQuantity - request.delivered} still needed` })
  }
  return options.sort((a, b) => distance(player, a.at!) - distance(player, b.at!))
}
