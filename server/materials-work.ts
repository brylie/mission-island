import type { MaterialsAction } from '../src/materials-interactions.ts'
import { carriedMaterial, emptyMaterialPockets, materialRefillSeconds, repairMaterials, repairQuantity } from '../src/materials-work.ts'
import type { Snapshot } from '../src/protocol.ts'
import { openOffer } from '../src/residents/favors.ts'
import { repairSupplyFavor, wren } from '../src/worlds/starter/residents/wren.ts'
import type { CrewMember, CrewNotice } from './crew.ts'

// The interaction dispatcher checks reach, phase, stock and pocket counts against the current host state.
export function createMaterialsWork(state: Snapshot, notifyCrew: (message: CrewNotice) => void, keepRepair: () => void) {
  function act(member: CrewMember, action: MaterialsAction, subject: number) {
    const material = repairMaterials[subject]
    const { player } = member
    const work = state.materialsWork
    const wrenRecord = state.residents.wren
    switch (action) {
      case 'check-material':
        member.notify?.({ type: 'materials-step', step: 'inspected', material })
        break
      case 'gather-material': {
        const pocket = player.materials ??= emptyMaterialPockets()
        pocket[material]++
        work.readyAt[material] = state.islandTime + materialRefillSeconds
        member.notify?.({ type: 'materials-step', step: 'gathered', material })
        break
      }
      case 'return-material-sample':
        player.materials![material] -= 1
        work.checkout = material === 'timber' ? 'stone' : 'qualified'
        notifyCrew({ type: 'materials-step', step: material === 'timber' ? 'timber-checked' : 'qualified', material })
        break
      case 'choose-repair-material':
        if (openOffer(wren, state)?.id !== repairSupplyFavor.id) return
        work.request = { material, delivered: 0 }
        wrenRecord.active = repairSupplyFavor.id
        notifyCrew({ type: 'favor-accepted', resident: wren.id, favor: repairSupplyFavor.id, playerId: player.id })
        break
      case 'deliver-repair-material': {
        const request = work.request
        if (!request || wrenRecord.active !== repairSupplyFavor.id || wrenRecord.kept.includes(repairSupplyFavor.id) ||
          carriedMaterial(player, material) === 0) return
        player.materials![material] -= 1
        const remaining = repairQuantity - ++request.delivered
        if (remaining === 0) keepRepair()
        else notifyCrew({ type: 'materials-step', step: 'delivered', material, remaining })
        break
      }
    }
  }

  return { act }
}
