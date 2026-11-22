import { blend, valueNoise } from '../../math/noise.ts'
import { smoothstep } from '../../math/smoothstep.ts'
import type { Point } from '../../world.ts'
import { createStarterBeachWidth } from './coastline.ts'
import { beachWidthLayout, shoreStations, starterBeachLandforms } from './layout/terrain.ts'

type Footprint = Point & { alongM: number, acrossM: number, heading: number }

const square = 2
const minimumCoastalRadius = 0.64
const fringeHalfWidthM = 1.25
const exposedSandWidthM = 0.2
const steepSlopeWidthLossM = 1.6
const shelteredSandStrength = 1.65
const grassDuneStartM = 0.12
const grassDuneFadeM = 0.5
const wetSandReachM = 0.073
const saltGrassDryClearanceM = 0.14
const sandDominance = 0.5
const submergedRockFadeM = 0.24
const beachWidthAt = createStarterBeachWidth(beachWidthLayout.seed)

function oriented({ heading, ...footprint }: Footprint) {
  return { ...footprint, cos: Math.cos(heading), sin: Math.sin(heading) }
}

const broadBeach = oriented(starterBeachLandforms.driftwood)
const rockShore = oriented(starterBeachLandforms.splitstone)
const duneSand = oriented(starterBeachLandforms.duneSand)
const dunes = starterBeachLandforms.dunes.map((dune) => ({ ...oriented(dune), riseM: dune.riseM }))
const duneExtent = {
  west: Math.min(...dunes.map(({ x, alongM, acrossM }) => x - Math.max(alongM, acrossM))),
  east: Math.max(...dunes.map(({ x, alongM, acrossM }) => x + Math.max(alongM, acrossM))),
  south: Math.min(...dunes.map(({ z, alongM, acrossM }) => z - Math.max(alongM, acrossM))),
  north: Math.max(...dunes.map(({ z, alongM, acrossM }) => z + Math.max(alongM, acrossM))),
}

function footprintRadius({ x, z }: Point, site: ReturnType<typeof oriented>) {
  const dx = x - site.x, dz = z - site.z
  return Math.hypot((dx * site.cos + dz * site.sin) / site.alongM, (dz * site.cos - dx * site.sin) / site.acrossM)
}

function influence(point: Point, site: ReturnType<typeof oriented>) {
  return 1 - smoothstep(footprintRadius(point, site))
}

export function duneRelief(point: Point) {
  if (point.x <= duneExtent.west || point.x >= duneExtent.east || point.z <= duneExtent.south || point.z >= duneExtent.north) return 0
  let rise = 0
  for (const dune of dunes) {
    const radius = footprintRadius(point, dune)
    const crest = Math.max(0, 1 - radius * radius)
    rise += dune.riseM * crest ** square
  }
  return rise
}

function edgeNoise({ x, z }: Point) {
  const { seed, broadM, fineM, broadAmplitudeM, fineAmplitudeM } = starterBeachLandforms.edgeNoise
  const broad = valueNoise(x / broadM, z / broadM, 1, seed, 1, false)
  const fine = valueNoise(x / fineM, z / fineM, 1, seed + 1, 1, false)
  return (broad * square - 1) * broadAmplitudeM + (fine * square - 1) * fineAmplitudeM
}

const meadow = { sand: 0, rock: 0, wet: 0, duneGrass: 0 }
const seabed = { sand: 1, rock: 0, wet: 1, duneGrass: 0 }

export function sampleBeach(point: Point, { bearing, radius, rayLengthM }: { bearing: number, radius: number, rayLengthM: number }, height: number, slope: number) {
  if (radius < minimumCoastalRadius) return meadow
  if (radius > shoreStations.shoal.radius) return seabed
  const inlandM = (1 - radius) * rayLengthM
  const broad = influence(point, broadBeach)
  const exposed = influence(point, rockShore)
  const noise = edgeNoise(point)
  const dune = influence(point, duneSand)
  const baseWidthM = beachWidthAt(bearing, (1 - shoreStations.sandEdge.radius) * rayLengthM)
  const widthM = blend(baseWidthM + broad * starterBeachLandforms.driftwood.extraWidthM
    - slope * steepSlopeWidthLossM, exposedSandWidthM, exposed) + noise
  const beachCover = 1 - smoothstep((inlandM - widthM + fringeHalfWidthM) / (fringeHalfWidthM + fringeHalfWidthM))
  const duneCover = smoothstep(dune * shelteredSandStrength + noise / starterBeachLandforms.duneSand.acrossM)
    * smoothstep(dune * shelteredSandStrength)
  const rock = smoothstep(exposed * square) * (1 - smoothstep(Math.abs(inlandM) / starterBeachLandforms.splitstone.rockReachM))
    * (1 - smoothstep((shoreStations.waterline.y - height) / submergedRockFadeM))
  const sand = Math.max(beachCover, duneCover) * (1 - rock)
  const wet = 1 - smoothstep((height - shoreStations.waterline.y) / wetSandReachM)
  const grassyCrest = smoothstep((duneRelief(point) - grassDuneStartM) / grassDuneFadeM)
  const dry = smoothstep((height - shoreStations.waterline.y) / saltGrassDryClearanceM)
  return { sand, rock, wet, duneGrass: grassyCrest * dry * duneCover }
}

export function beachHasSand({ sand, rock }: Pick<ReturnType<typeof sampleBeach>, 'sand' | 'rock'>) {
  return sand >= sandDominance && sand > rock
}
