import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { hideLandmark, landmarks } from './island-landmarks'
import { activeJob, deliveryDrop } from './jobs'
import { repairQuantity, sourceOpen } from './materials-work'
import type { Player, Snapshot } from './protocol'
import { northernRegions, starterDiscoveries } from './scenery'
import { groundHeight } from './terrain'
import { distance } from './world'

type Locate = (element: HTMLElement, x: number, y: number, z: number) => void

// Landmark, discovery and resident name labels that float over the island.
export function createPlaceLabels(markers: HTMLElement, residentRoots: { root: TransformNode; title: string }[]) {
  const places = [
    ...landmarks.map((place) => ({ ...place, discovery: '', mapOnly: false })),
    ...starterDiscoveries.map((region) => ({ point: region.site, title: region.name, kind: 'discovery',
      height: 2.8, discovery: region.id, mapOnly: false })),
    ...northernRegions.map((region) => ({ point: region.at, title: region.biome, kind: 'biome',
      height: 5, discovery: '', mapOnly: true })),
  ].map((place) => {
    const label = document.createElement('span')
    label.className = `place place--${place.kind}`
    label.textContent = place.title
    markers.append(label)
    return { ...place, label }
  })
  const residents = residentRoots.map(({ root, title }) => {
    const tag = document.createElement('span')
    Object.assign(tag, { className: 'place place--resident', textContent: title })
    markers.append(tag)
    return { root, tag }
  })

  type Place = typeof places[number]
  function hidden(place: Place, last: Snapshot | undefined, local: Player | undefined, close: boolean, range: number) {
    return (place.mapOnly && close) || hideLandmark(place, local?.id, close, range) ||
      Boolean(place.discovery && !local?.discoveries?.includes(place.discovery)) ||
      (place.kind === 'equipment' && last?.mission !== 'fire') || (place.kind === 'board' && last?.mission !== 'complete') ||
      materialsLabelHidden(place.kind, last)
  }
  function active(place: Place, last: Snapshot | undefined) {
    const job = last && activeJob(last)
    const drop = last && deliveryDrop(last)
    return Boolean(drop && (place.kind === 'harbor' || distance(place.point, drop) < 6)) ||
      (job?.kind === 'market' && place.kind === 'market') ||
      (last?.mission === 'complete' && !job && place.kind === 'board') ||
      (last?.mission === 'fire' && (place.kind === 'lookout' || place.kind === 'equipment'))
  }

  return {
    update(last: Snapshot | undefined, local: Player | undefined, close: boolean, locate: Locate) {
      for (const place of places) {
        const range = close && local ? distance(place.point, local) : 0
        const opacity = Math.min(1, Math.max(0, (80 - range) / 38))
        place.label.hidden = opacity === 0 || hidden(place, last, local, close, range)
        if (place.kind === 'materials-repair') {
          const request = last?.materialsWork.request
          const remaining = request ? repairQuantity - request.delivered : 0
          const title = request ? `${place.title} · ${remaining ? `${remaining} ${request.material} needed` : 'Repaired'}` : place.title
          if (place.label.textContent !== title) place.label.textContent = title
        }
        place.label.style.opacity = String(opacity)
        place.label.classList.toggle('place--active', active(place, last))
        locate(place.label, place.point.x, groundHeight(place.point) + place.height, place.point.z)
      }
      for (const { root, root: { position }, tag } of residents) {
        tag.hidden = !local || !root.isEnabled() || (close && distance(position, local) > 18)
        if (!tag.hidden) locate(tag, position.x, position.y + 2.1, position.z)
      }
    },
  }
}

function materialsLabelHidden(kind: string, state?: Snapshot) {
  switch (kind) {
    case 'materials-timber': return !state || !sourceOpen(state, 'timber')
    case 'materials-stone': return !state || !sourceOpen(state, 'stone')
    case 'materials-repair': return state?.materialsWork.checkout !== 'qualified'
    default: return false
  }
}
