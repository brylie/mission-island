import { starterMapLook as look } from './assets/geometry/starter-map'
import { inSkiff } from './actions'
import { defaultAppearance, shirtColor } from './crew-appearance'
import { farm, market } from './farm'
import { drawFarmMap } from './farm-order-ui'
import { activeJob, deliveryDrop, jobBoard } from './jobs'
import { materialsWaypoint } from './materials-work'
import type { Player, Snapshot } from './protocol'
import { learnerVehicleIds, practiceStop } from './learner-vehicles'
import { drawRidgeMap } from './ridge-ui'
import { footpaths, roads, walkways } from './routes'
import { northernRegions, starterDiscoveries } from './scenery'
import { boundaryBuoys, buoyBoundaryPoint, coastBounds, coastPoint, coastSegments, offshoreLimitMetres } from './terrain'
import { crewHomes, ferryTerminal, harbor, lookout } from './world'

type MapDot = (x: number, z: number, color: string, radius: number) => void

const half = 0.5
const fullTurn = Math.PI + Math.PI
const coast = coastBounds()
const mapCentre = { x: (coast.east + coast.west) * half, z: (coast.north + coast.south) * half }
const mapWidth = coast.east - coast.west + look.margin
const mapHeight = coast.north - coast.south + look.margin
const rings = Array.from({ length: coastSegments }, (_, i) => {
  const angle = i * fullTurn / coastSegments
  return { shore: coastPoint(angle), grass: coastPoint(angle, look.grassRing), boundary: buoyBoundaryPoint(angle) }
})

function drawShift(state: Snapshot, dot: MapDot) {
  if (state.mission === 'fire') dot(lookout.x, lookout.z, look.fire.color, look.fire.radius)
  else {
    const drop = deliveryDrop(state)
    if (drop) {
      dot(harbor.x, harbor.z, look.harbor.color, look.harbor.radius)
      dot(drop.x, drop.z, look.delivery.color, look.delivery.radius)
    }
  }
}

function drawWork(state: Snapshot, local: Player | undefined, dot: MapDot) {
  const marketOrder = activeJob(state)?.kind === 'market'
  dot(market.x, market.z, marketOrder ? look.market.activeColor : look.market.color, marketOrder ? look.market.activeRadius : look.market.radius)
  if (state.mission === 'complete' && !state.jobs.active) dot(jobBoard.x, jobBoard.z, look.jobBoard.color, look.jobBoard.radius)
  const supplies = local && materialsWaypoint(state, local)
  if (supplies) dot(supplies.x, supplies.z, look.supplies.color, look.supplies.radius)
  drawFarmMap(state, dot)
  drawRidgeMap(state, dot)
}

function drawIslandPaths(drawRoute: (points: readonly { x: number, z: number }[], width: number, color: string) => void) {
  for (const { points, surface } of footpaths) {
    const { width, color } = look.paths[surface]
    drawRoute(points, width, color)
  }
  const { pavement, road } = look.paths
  for (const { points } of walkways) drawRoute(points, pavement.width, pavement.color)
  for (const path of roads) drawRoute(path, road.width, road.color)
}

// Learner vehicles carry a letter as well as their paint, and the stop for
// anyone aboard draws as a hollow ring.
function drawLearners(ink: CanvasRenderingContext2D, state: Snapshot, local: Player | undefined, mx: (x: number) => number, mz: (z: number) => number) {
  const { learners, practiceStop: ring } = look
  ink.textAlign = 'center'
  ink.textBaseline = 'middle'
  ink.font = learners.font
  for (const vehicleId of learnerVehicleIds) {
    const { x, z } = state.vehicles[vehicleId]
    ink.fillStyle = learners[vehicleId]
    ink.fillRect(mx(x) - learners.width * half, mz(z) - learners.height * half, learners.width, learners.height)
    ink.fillStyle = learners.letterColor
    ink.fillText(learners.letters[vehicleId], mx(x), mz(z))
  }
  if (!local?.seat || !local.vehicle) return
  const stop = practiceStop(local.vehicle, state.practice[local.vehicle])
  ink.lineWidth = ring.lineWidth
  for (const [color, grow] of [[ring.outline, ring.lineWidth], [ring.color, 0]] as const) {
    ink.strokeStyle = color
    ink.beginPath()
    ink.arc(mx(stop.x), mz(stop.z), ring.radius + grow * half, 0, fullTurn)
    ink.stroke()
  }
  ink.fillStyle = ring.color
  ink.beginPath()
  ink.arc(mx(stop.x), mz(stop.z), ring.dot, 0, fullTurn)
  ink.fill()
}

export function drawIslandMap(map: HTMLCanvasElement, id: number, state?: Snapshot) {
  const ink = map.getContext('2d')
  if (!ink) return
  const { width, height } = map
  const local = state?.players.find((player) => player.id === id)
  const afloat = local && inSkiff(local.seat)
  const offshore = afloat ? offshoreLimitMetres + offshoreLimitMetres : 0
  const scale = Math.min(width / (mapWidth + offshore), height / (mapHeight + offshore))
  const mx = (x: number) => width * half + (x - mapCentre.x) * scale
  const mz = (z: number) => height * half - (z - mapCentre.z) * scale
  const dot = (x: number, z: number, color: string, radius: number) => {
    ink.fillStyle = color
    ink.beginPath()
    ink.arc(mx(x), mz(z), radius, 0, fullTurn)
    ink.fill()
  }
  const traceRing = (ring: 'shore' | 'grass' | 'boundary') => {
    ink.beginPath()
    for (const [i, points] of rings.entries()) {
      const { x, z } = points[ring]
      if (i === 0) ink.moveTo(mx(x), mz(z))
      else ink.lineTo(mx(x), mz(z))
    }
    ink.closePath()
  }
  ink.fillStyle = look.water
  ink.fillRect(0, 0, width, height)
  if (afloat) {
    traceRing('boundary')
    ink.strokeStyle = look.boundary.color
    ink.lineWidth = look.boundary.lineWidth
    ink.stroke()
    for (const { x, z } of boundaryBuoys) dot(x, z, look.boundary.buoy.color, look.boundary.buoy.radius)
  }
  for (const [ring, color] of look.land) {
    ink.fillStyle = color
    traceRing(ring)
    ink.fill()
  }
  for (const region of northernRegions) {
    dot(region.at.x, region.at.z, region.color, region.spread * scale * look.regionSpread)
  }
  for (const region of starterDiscoveries) if (local?.discoveries?.includes(region.id)) {
    dot(region.site.x, region.site.z, look.discovery.color, look.discovery.radius)
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
  ink.fillStyle = look.truck.color
  ink.fillRect(mx(state.truck.x) - look.truck.width * half, mz(state.truck.z) - look.truck.height * half, look.truck.width, look.truck.height)
  drawLearners(ink, state, local, mx, mz)
  if (state.skiff) dot(state.skiff.x, state.skiff.z, look.skiff.color, look.skiff.radius)
  dot(farm.x, farm.z, look.farm.color, look.farm.radius)
  dot(ferryTerminal.x, ferryTerminal.z, look.ferry.color, look.ferry.radius)
  drawWork(state, local, dot)
  const home = crewHomes[id]
  if (home) dot(home.chest.x, home.chest.z, look.chest.color, look.chest.radius)
  for (const player of state.players) {
    if (!player.connected) continue
    dot(player.x, player.z, look.player.border, look.player.radius)
    dot(player.x, player.z, shirtColor(player.appearance ?? defaultAppearance, player.appearanceBase ?? player.id).color, look.player.fillRadius)
  }
}
