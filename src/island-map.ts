import { inSkiff } from './actions'
import { defaultAppearance, shirtColor } from './crew-appearance'
import { farm, market } from './farm'
import { drawFarmMap } from './farm-order-ui'
import { activeJob, deliveryDrop, jobBoard } from './jobs'
import { materialsWaypoint } from './materials-work'
import type { Player, Snapshot } from './protocol'
import { drawRidgeMap } from './ridge-ui'
import { footpaths, road, walkways } from './routes'
import { northernRegions, starterDiscoveries } from './scenery'
import { boundaryBuoys, buoyBoundaryPoint, coastPoint } from './terrain'
import { crewHomes, ferryTerminal, harbor, lookout } from './world'
import type { Point } from './world'

type MapDot = (x: number, z: number, color: string, radius: number) => void

function drawShift(state: Snapshot, dot: MapDot) {
  if (state.mission === 'fire') dot(lookout.x, lookout.z, '#f7a17d', 6)
  else {
    const drop = deliveryDrop(state)
    if (drop) {
      dot(harbor.x, harbor.z, '#fff0ae', 5)
      dot(drop.x, drop.z, '#acf3da', 5)
    }
  }
}

function drawWork(state: Snapshot, local: Player | undefined, dot: MapDot) {
  const marketOrder = activeJob(state)?.kind === 'market'
  dot(market.x, market.z, marketOrder ? '#acf3da' : '#f2d3bc', marketOrder ? 6 : 3.5)
  if (state.mission === 'complete' && !state.jobs.active) dot(jobBoard.x, jobBoard.z, '#ffd379', 5.5)
  const supplies = local && materialsWaypoint(state, local)
  if (supplies) dot(supplies.x, supplies.z, '#efac5b', 5.5)
  drawFarmMap(state, dot)
  drawRidgeMap(state, dot)
}

function drawIslandPaths(drawRoute: (points: typeof road, width: number, color: string) => void) {
  for (const { points, surface } of footpaths) {
    if (surface === 'desire') drawRoute(points, .85, '#b5a77e')
    else drawRoute(points, 2, surface === 'pavement' ? '#c4c9c1' : '#a5a77e')
  }
  for (const { points } of walkways) drawRoute(points, 2, '#c4c9c1')
  drawRoute(road, 4, '#c7bb9a')
}

export function drawIslandMap(map: HTMLCanvasElement, id: number, state?: Snapshot) {
  const ink = map.getContext('2d')
  if (!ink) return
  const { width, height } = map
  const local = state?.players.find((player) => player.id === id)
  const afloat = local && inSkiff(local.seat)
  const scale = Math.min(width / (afloat ? 390 : 224), height / (afloat ? 400 : 245))
  const mx = (x: number) => width / 2 + x * scale
  const mz = (z: number) => height / 2 - (z - 66) * scale
  const dot = (x: number, z: number, color: string, radius: number) => {
    ink.fillStyle = color
    ink.beginPath()
    ink.arc(mx(x), mz(z), radius, 0, Math.PI * 2)
    ink.fill()
  }
  const traceRing = (pointAt: (angle: number) => Point) => {
    ink.beginPath()
    for (let i = 0; i < 128; i++) {
      const { x, z } = pointAt(i / 128 * Math.PI * 2)
      if (i === 0) ink.moveTo(mx(x), mz(z))
      else ink.lineTo(mx(x), mz(z))
    }
    ink.closePath()
  }
  ink.fillStyle = '#245e68'
  ink.fillRect(0, 0, width, height)
  if (afloat) {
    traceRing(buoyBoundaryPoint)
    ink.strokeStyle = '#9abfc1'
    ink.lineWidth = 1
    ink.stroke()
    for (const { x, z } of boundaryBuoys) dot(x, z, '#ffd37b', 2)
  }
  for (const [radius, color] of [[1, '#acc293'], [0.916, '#6f9667']] as const) {
    ink.fillStyle = color
    traceRing((angle) => coastPoint(angle, radius))
    ink.fill()
  }
  for (const region of northernRegions) {
    dot(region.at.x, region.at.z, region.color, region.spread * scale * 0.55)
  }
  for (const region of starterDiscoveries) if (local?.discoveries?.includes(region.id)) {
    dot(region.site.x, region.site.z, '#e4ffe0', 2.25)
  }
  ink.lineJoin = 'round'
  ink.lineCap = 'round'
  drawIslandPaths((points, width, color) => {
    ink.lineWidth = width
    ink.strokeStyle = color
    ink.beginPath()
    for (const [i, { x, z }] of points.entries()) {
      if (i === 0) ink.moveTo(mx(x), mz(z))
      else ink.lineTo(mx(x), mz(z))
    }
    ink.stroke()
  })
  if (!state) return
  drawShift(state, dot)
  ink.fillStyle = '#38433a'
  ink.fillRect(mx(state.truck.x) - 5, mz(state.truck.z) - 4, 10, 8)
  if (state.skiff) dot(state.skiff.x, state.skiff.z, '#fff0ca', 3.5)
  dot(farm.x, farm.z, '#e3ba77', 3.5)
  dot(ferryTerminal.x, ferryTerminal.z, '#d7a07d', 3.5)
  drawWork(state, local, dot)
  const home = crewHomes[id]
  if (home) dot(home.chest.x, home.chest.z, '#fed487', 3)
  for (const player of state.players) {
    if (!player.connected) continue
    dot(player.x, player.z, '#234244', 6.5)
    dot(player.x, player.z, shirtColor(player.appearance ?? defaultAppearance, player.appearanceBase ?? player.id).color, 4.5)
  }
}
