import type { MaterialsAction } from '../src/materials-interactions.ts'
import { carriedMaterial, emptyMaterialPockets, materialRefillSeconds, repairMaterials, repairQuantity } from '../src/materials-work.ts'
import type { Snapshot } from '../src/protocol.ts'
import { openOffer } from '../src/residents/favors.ts'
import { repairSupplyFavor, wren } from '../src/worlds/starter/residents/wren.ts'
import type { CrewNotice } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

// The interaction dispatcher checks reach, phase, stock and pocket counts against the current host state.
export function createMaterialsWork(state: Snapshot, notifyCrew: (message: CrewNotice) => void, keepRepair: () => void) {
  const interactions = {
    'check-material'(member, subject) {
      member.notify?.({ type: 'materials-step', step: 'inspected', material: repairMaterials[subject] })
    },
    'gather-material'(member, subject) {
      const material = repairMaterials[subject]
      const pocket = member.player.materials ??= emptyMaterialPockets()
      pocket[material]++
      state.materialsWork.readyAt[material] = state.islandTime + materialRefillSeconds
      member.notify?.({ type: 'materials-step', step: 'gathered', material })
    },
    'return-material-sample'({ player }, subject) {
      const material = repairMaterials[subject]
      player.materials![material] -= 1
      state.materialsWork.checkout = material === 'timber' ? 'stone' : 'qualified'
      notifyCrew({ type: 'materials-step', step: material === 'timber' ? 'timber-checked' : 'qualified', material })
    },
    'choose-repair-material'({ player }, subject) {
      if (openOffer(wren, state)?.id !== repairSupplyFavor.id) return
      state.materialsWork.request = { material: repairMaterials[subject], delivered: 0 }
      state.residents.wren.active = repairSupplyFavor.id
      notifyCrew({ type: 'favor-accepted', resident: wren.id, favor: repairSupplyFavor.id, playerId: player.id })
    },
    'deliver-repair-material'({ player }, subject) {
      const material = repairMaterials[subject]
      const { request } = state.materialsWork
      const wrenRecord = state.residents.wren
      if (!request || wrenRecord.active !== repairSupplyFavor.id || wrenRecord.kept.includes(repairSupplyFavor.id) ||
        carriedMaterial(player, material) === 0) return
      player.materials![material] -= 1
      const remaining = repairQuantity - ++request.delivered
      if (remaining === 0) keepRepair()
      else notifyCrew({ type: 'materials-step', step: 'delivered', material, remaining })
    },
  } satisfies InteractionHandlers<MaterialsAction>
  return { interactions }
}
