import { createOilLantern } from './assets/effect-props'
import { streetLampGeometry } from './assets/geometry/site-props'
import { jobBoardLanternShelf } from './assets/geometry/starter-effect-mounts'
import { starterPlaceLooks as looks } from './assets/recipes/starter-world-effects'
import { market } from './farm'
import type { MeshFactory } from './island-meshes'
import { jobBoard } from './jobs'
import { juniperCenter } from './juniper-habitat'
import type { MarketRunoff } from './market-runoff'
import { coastPoint, fernfallSection, groundHeight, pool, streamX, waterLevel } from './terrain'
import { daylight, nightLighting } from './weather'
import { gustAt } from './wind'
import type { WildlifeFrame } from './wildlife'
import { phenomenonStrength, smoothRange } from './wildlife-motion'
import { createLocalEffects, type LocalEffect } from './world-particles'
import type { Point } from './world'
import { starterEffectSites as sites } from './worlds/starter/layout/places'
import { marketRunoffCurtain, marketRunoffLaneX } from './worlds/starter/market-awning'
import { lampPosts } from './worlds/starter/sites'

const at = ({ x, z }: Point, lift: number) => ({ x, z, y: groundHeight({ x, z }) + lift })
const dryDay = ({ weather }: WildlifeFrame) => daylight(weather.hour) * (1 - weather.rain)
const gust = ({ time, weather }: WildlifeFrame) => gustAt(time, weather.rain)

const beachBreakPeriod = 2.4
const beachBreakDuration = 0.34
const beachFoamOpacity = 0.55
const beachFoamRainBoost = 0.3
const canvasRainOpacity = 0.8
const puddleOpacityScale = 1.8
const poolMistOpacity = 0.88
const dustLightFadeStart = 0.36
const dustLightFadeEnd = 0.64
const sandOpacity = 0.68
const mothPhaseSpacing = 1.8
const mothRadius = 0.44
const counterOrbitEvery = 3
const forwardOrbit = 3
const reverseOrbit = -2.2
const mothPeelSeconds = 1.55
const lanternLightsHour = 18
const lanternSnuffHour = 6.15
const lanternSmokeEndHour = 6.27
const lanternSmokeOpacity = 0.79
const lanternLitVisibility = 0.9
const lanternUnlitVisibility = 0.24

function shore(angle: number): LocalEffect {
  const point = coastPoint(angle, sites.shore.shorelineRadius)
  const anchor = { ...point, y: waterLevel + sites.shore.lift, yaw: Math.atan2(-point.x, -point.z), floor: waterLevel + sites.shore.floor }
  return {
    id: 'shore-splash',
    anchor,
    ...looks.shore,
    origin: (phase) => phase % beachBreakPeriod < beachBreakDuration ? anchor : undefined,
    opacity: (frame) => beachFoamOpacity + beachFoamRainBoost * frame.weather.rain,
  }
}

function createMarketEffects(meshes: MeshFactory) {
  const { floor, ...curtain } = marketRunoffCurtain
  const { xFromMarket, z } = sites.marketRainRings
  let runoff: MarketRunoff | undefined
  const draw = createLocalEffects(meshes.scene, [
    {
      id: 'canvas-runoff',
      anchor: curtain,
      ...looks.marketRunoff,
      origin: (_, index) => ({ ...curtain, x: marketRunoffLaneX(index), floor }),
      opacity: (frame) => frame.weather.rain * canvasRainOpacity,
    },
    {
      id: 'roof-drips',
      anchor: { ...curtain, floor },
      ...looks.marketDrip,
      opacity: (frame) => (runoff?.drip ?? 0) * (1 - frame.weather.rain),
    },
    {
      id: 'puddle-strike-rings',
      anchor: { x: market.x + xFromMarket, y: floor, z },
      ...looks.marketRings,
      opacity: (frame) => Math.min(frame.weather.rain, (runoff?.puddle ?? 0) * puddleOpacityScale),
    },
  ])
  return (frame: WildlifeFrame, overview: boolean, current: MarketRunoff) => {
    runoff = current
    draw(frame, overview)
  }
}

function moths(point: Point): LocalEffect {
  const scent = streetLampGeometry.mothAnchor
  const anchor = at({ x: point.x, z: point.z + scent.z }, scent.height)
  return {
    id: 'lantern-moths',
    anchor,
    ...looks.moths,
    opacity: (frame) => (1 - frame.weather.rain) * nightLighting(frame.weather.hour),
    origin: (time, index) => {
      const angle = index * mothPhaseSpacing + time
      return {
        ...anchor,
        x: anchor.x + Math.cos(angle) * mothRadius,
        z: anchor.z + Math.sin(angle) * mothRadius,
        orbit: { x: anchor.x, z: anchor.z, angularSpeed: index % counterOrbitEvery ? forwardOrbit : reverseOrbit, peelAfter: mothPeelSeconds },
      }
    },
  }
}

export function createStarterPlaces(meshes: MeshFactory) {
  const lamp = createOilLantern(meshes)
  const mount = sites.jobBoardLantern
  const shelf = at({ x: jobBoard.x + mount.x, z: jobBoard.z + mount.z }, mount.shelfHeight)
  lamp.root.position.set(shelf.x, shelf.y, shelf.z)
  for (const [x, y, z, width, height, depth, color] of jobBoardLanternShelf) meshes.box(x, y, z, width, height, depth, color, lamp.root)
  const lantern = { ...shelf, y: shelf.y + mount.smokeLift }
  const { z: splashZ, lift } = sites.fernfall
  const fernfall = { x: streamX(splashZ), y: fernfallSection(splashZ).y + lift, z: splashZ, yaw: Math.PI }
  const placements: LocalEffect[] = [
    {
      id: 'waterfall-spray',
      anchor: fernfall,
      ...looks.waterfall,
      opacity: (frame) => phenomenonStrength('spray', frame.weather),
    },
    ...sites.shore.bearings.map(shore),
    ...[-1, 1].map((side): LocalEffect => ({
      id: 'ground-mist',
      anchor: { x: pool.x + side * sites.poolMist.x, y: waterLevel + sites.poolMist.lift, z: pool.z + side * sites.poolMist.z },
      ...looks.mist,
      opacity: (frame) => phenomenonStrength('mist', frame.weather) * poolMistOpacity,
    })),
    ...[...sites.pollen.beds.map((bed) => at(bed, bed.lift)), at(juniperCenter, sites.pollen.juniperLift)].map((anchor): LocalEffect => ({
      id: 'pollen-motes',
      anchor,
      ...looks.pollen,
      opacity: dryDay,
    })),
    {
      id: 'seed-parachutes',
      anchor: at(sites.seedPatch, sites.seedPatch.lift),
      ...looks.seeds,
      opacity: (frame) => dryDay(frame) * gust(frame),
    },
    {
      id: 'windblown-leaves',
      anchor: at(sites.woodsLeaves, sites.woodsLeaves.lift),
      ...looks.leaves,
      opacity: gust,
    },
    {
      id: 'sunbeam-dust',
      anchor: at(sites.meadowMotes, sites.meadowMotes.lift),
      ...looks.motes,
      opacity: (frame) => dryDay(frame) * (1 - smoothRange(dustLightFadeStart, dustLightFadeEnd, daylight(frame.weather.hour))),
    },
    {
      id: 'sand-skitter',
      anchor: at(coastPoint(sites.sand.bearing, sites.sand.shorelineRadius), sites.sand.lift),
      ...looks.sand,
      opacity: (frame) => gust(frame) * (1 - frame.weather.rain) * sandOpacity,
    },
    ...lampPosts.map(moths),
    {
      id: 'lantern-snuff-curl',
      anchor: lantern,
      ...looks.snuff,
      opacity: ({ weather }) => weather.hour >= lanternSnuffHour && weather.hour < lanternSmokeEndHour ? lanternSmokeOpacity : 0,
    },
  ]
  const draw = createLocalEffects(meshes.scene, placements)
  const marketFx = createMarketEffects(meshes)
  return (frame: WildlifeFrame, overview: boolean, runoff: MarketRunoff) => {
    const lit = frame.weather.hour >= lanternLightsHour || frame.weather.hour < lanternSnuffHour
    lamp.flame.setEnabled(lit)
    lamp.globe.visibility = lit ? lanternLitVisibility : lanternUnlitVisibility
    draw(frame, overview)
    marketFx(frame, overview, runoff)
  }
}
