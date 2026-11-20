import { walkingHeight } from './terrain.ts'
import { distance, harborDock } from './world.ts'
import type { Player } from './protocol'

export const fisherName = 'Mara'
const dock = { x: harborDock.x - 0.7, z: -33.4 }
const landing = { x: dock.x, z: -28.4 }
const porch = { x: -38.6, z: -24 }
const route = [porch, landing, dock]
const firstLeg = distance(porch, landing)
const routeLength = firstLeg + distance(landing, dock)
const commuteHours = 0.25

export function fisherAt(hour: number) {
  if (hour < 6 || hour >= 18 + commuteHours) {
    return { ...porch, heading: Math.PI, walking: false }
  }
  if (hour >= 6 + commuteHours && hour < 18) {
    return { ...dock, heading: -Math.PI / 2, walking: false }
  }
  const returning = hour >= 18
  const along = routeLength * (returning ? 1 - (hour - 18) / commuteHours : (hour - 6) / commuteHours)
  const leg = along < firstLeg ? 0 : 1
  const [start, end] = [route[leg], route[leg + 1]]
  const fraction = leg === 0 ? along / firstLeg : (along - firstLeg) / (routeLength - firstLeg)
  return {
    x: start.x + (end.x - start.x) * fraction,
    z: start.z + (end.z - start.z) * fraction,
    heading: Math.atan2(end.x - start.x, end.z - start.z) + (returning ? Math.PI : 0),
    walking: true,
  }
}

export function atFisher(player: Player, hour: number) {
  const fisher = fisherAt(hour)
  return !player.seat && player.grounded && !player.onBed && !player.swimming &&
    distance(player, fisher) < 2.4 && Math.abs(player.y - walkingHeight(fisher)) < 1
}
