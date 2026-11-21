import { createCrew, poseCrew } from './assets/crew'
import type { MeshFactory } from './island-meshes'
import { moveTo } from './island-render-pose'
import { createObjectiveMarker } from './objective-marker'
import type { Snapshot } from './protocol'
import type { ResidentDefinition } from './residents/definition'
import { activeFavor } from './residents/favors'
import { residentAt } from './residents/schedule'
import { walkingHeight } from './terrain'

// One crew rig per resident, dressed from the appearance trait and moved by the shared schedule.
// Rig ids follow the crew's, so each resident keeps a stable base palette.
export function createResidentFigures(meshes: MeshFactory, registry: readonly ResidentDefinition[], firstId: number) {
  const figures = registry.map((resident, index) => {
    const rig = createCrew(meshes, firstId + index)
    rig.setAppearance(resident.appearance.look, { dye: resident.appearance.dye })
    rig.root.setEnabled(false)
    // A cargo favor marks where the crate goes while the favor is under way.
    const bays = resident.favors.flatMap((favor) => 'cargo' in favor.kind
      ? [{ favor: favor.id, marker: createObjectiveMarker(meshes, favor.kind.drop, favor.kind.radius * 2, '#ffd166') }]
      : [])
    for (const { marker } of bays) marker.setEnabled(false)
    return { resident, rig, cycle: 0, bays }
  })
  return {
    labels: figures.map(({ resident, rig }) => ({ root: rig.root, title: `${resident.identity.name} · ${resident.identity.role}` })),
    update(state: Pick<Snapshot, 'islandTime' | 'gateRepair' | 'residents'>, factor: number, delta: number, time: number) {
      for (const figure of figures) {
        const active = activeFavor(figure.resident, state)?.id
        for (const { favor, marker } of figure.bays) marker.setEnabled(active === favor)
        const spot = residentAt(figure.resident.schedule, state)
        moveTo(figure.rig.root, spot, walkingHeight(spot), factor)
        figure.rig.root.setEnabled(!spot.indoors)
        if (spot.walking) figure.cycle += delta * 1.8
        poseCrew(figure.rig, figure.cycle, spot.walking ? 0.65 : 0, false, undefined, 0, factor)
        figure.rig.blink(time)
      }
    },
  }
}
