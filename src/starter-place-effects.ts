import type { MeshFactory } from './island-meshes'
import { createOilLantern } from './assets/effect-props'
import { market } from './farm'
import { juniperCenter } from './juniper-habitat'
import { jobBoard } from './jobs'
import { marketAwningHem } from './market-shower'
import type { MarketRunoff } from './market-runoff'
import { coastPoint, fernfallSection, groundHeight, pool, streamX, waterLevel } from './terrain'
import { daylight, nightLighting } from './weather'
import { lampPosts } from './worlds/starter/sites'
import { phenomenonStrength, smoothRange } from './wildlife-motion'
import type { WildlifeFrame } from './wildlife'
import { createLocalEffects, type LocalEffect } from './world-particles'
import type { Point } from './world'

const at = (point: Point, lift: number) => ({ ...point, y: groundHeight(point) + lift })
const dryDay = ({ weather }: WildlifeFrame) => daylight(weather.hour) * (1 - weather.rain)
const gust = ({ time, weather }: WildlifeFrame) => (.25 + .75 * Math.max(0, Math.sin(time * .62)) ** 2) * (1 - weather.rain * .62)
const curtain = { x: market.x, y: marketAwningHem.y - .127, z: marketAwningHem.z + .095 }

function shore(angle: number): LocalEffect {
  const point = coastPoint(angle, 1.003)
  const anchor = { ...point, y: waterLevel + .035, yaw: Math.atan2(-point.x, -point.z), floor: waterLevel + .012 }
  return {
    id: 'shore-splash', anchor, tuning: { strength: .47, footprint: .63 },
    origin: phase => phase % 2.4 < .34 ? anchor : undefined,
    cycle: 9.6, range: 21, opacity: frame => .55 + .3 * frame.weather.rain,
  }
}

function createMarketEffects(meshes: MeshFactory) {
  const floor = groundHeight({ x: market.x, z: 6.98 }) + .044
  let runoff: MarketRunoff | undefined
  const draw = createLocalEffects(meshes.scene, [
    {
      id: 'canvas-runoff', anchor: curtain, tuning: { strength: .68, footprint: .88 },
      origin: (_, index) => ({ ...curtain, x: curtain.x + ((index % 5) - 2) * .54, floor }),
      range: 22, opacity: frame => frame.weather.rain * .8,
    },
    {
      id: 'roof-drips', anchor: { ...curtain, floor }, tuning: { strength: .61, footprint: .79 },
      range: 18, opacity: frame => (runoff?.drip ?? 0) * (1 - frame.weather.rain),
    },
    {
      id: 'puddle-strike-rings', anchor: { x: market.x - 1.29, y: floor, z: 7.02 }, tuning: { strength: .79, footprint: .49 },
      range: 18, opacity: frame => Math.min(frame.weather.rain, (runoff?.puddle ?? 0) * 1.8),
    },
  ])
  return (frame: WildlifeFrame, overview: boolean, current: MarketRunoff) => {
    runoff = current
    draw(frame, overview)
  }
}

export function createStarterPlaces(meshes: MeshFactory) {
  const splashZ = 89.4
  const lamp = createOilLantern(meshes)
  const shelf = at({ x: jobBoard.x + .6, z: jobBoard.z + .11 }, 1.05)
  lamp.root.position.set(shelf.x, shelf.y, shelf.z)
  meshes.box(.04, -.026, -.044, .37, .049, .31, '#79664c', lamp.root)
  meshes.box(.065, -.14, -.094, .128, .225, .09, '#675b46', lamp.root)
  const lantern = { ...shelf, y: shelf.y + .24 }
  const fernfall = { x: streamX(splashZ), y: fernfallSection(splashZ).y + .07, z: splashZ, yaw: Math.PI }
  const placements: LocalEffect[] = [
    {
      id: 'waterfall-spray', anchor: fernfall, range: 40, tuning: { strength: .58, footprint: .69 },
      opacity: frame => phenomenonStrength('spray', frame.weather),
    },
    shore(-.99), shore(-.86),
    ...[-1, 1].map((side): LocalEffect => ({
      id: 'ground-mist', anchor: { x: pool.x + side * 9.8, y: waterLevel + .185, z: pool.z + side * 2.6 },
      range: 50, tuning: { strength: .67, footprint: 1.3 },
      opacity: frame => phenomenonStrength('mist', frame.weather) * .88,
    })),
    ...[at({ x: 31, z: -25 }, .34), at({ x: 35.8, z: -23.7 }, .39), at(juniperCenter, .43)].map((anchor): LocalEffect => ({
      id: 'pollen-motes', anchor, range: 17, tuning: { strength: .35, footprint: .94 }, opacity: dryDay,
    })),
    {
      id: 'seed-parachutes', anchor: at({ x: 36.2, z: -29.9 }, .53), range: 19,
      tuning: { strength: .39, footprint: .75, wind: .3 },
      opacity: frame => dryDay(frame) * gust(frame),
    },
    {
      id: 'windblown-leaves', anchor: at({ x: -29, z: 20.7 }, 1.42), range: 23,
      tuning: { strength: .47, footprint: .89, wind: .22 }, opacity: gust,
    },
    {
      id: 'sunbeam-dust', anchor: at({ x: -23.8, z: 23.7 }, 1.23), range: 19,
      tuning: { strength: .38, footprint: .84 },
      opacity: frame => dryDay(frame) * (1 - smoothRange(.36, .64, daylight(frame.weather.hour))),
    },
    {
      id: 'sand-skitter', anchor: at(coastPoint(-.98, .961), .06), range: 20,
      tuning: { strength: .57, footprint: .82, wind: .31 },
      opacity: frame => gust(frame) * (1 - frame.weather.rain) * .68,
    },
    ...lampPosts.map((point): LocalEffect => {
      const anchor = at({ x: point.x, z: point.z - .31 }, 2.52)
      return { id: 'lantern-moths', anchor, range: 22, tuning: { strength: .54, footprint: .83 },
        opacity: frame => (1 - frame.weather.rain) * nightLighting(frame.weather.hour),
        origin: (time, i) => ({ ...anchor, x: anchor.x + Math.cos(i * 1.8 + time) * .44, z: anchor.z + Math.sin(i * 1.8 + time) * .44,
          orbit: { x: anchor.x, z: anchor.z, angularSpeed: i % 3 ? 3 : -2.2, peelAfter: 1.55 } }) }
    }),
    {
      id: 'lantern-snuff-curl', anchor: lantern, range: 13, tuning: { strength: .52, footprint: .66 },
      opacity: ({ weather }) => weather.hour >= 6.15 && weather.hour < 6.27 ? .79 : 0,
    },
  ]
  const draw = createLocalEffects(meshes.scene, placements)
  const marketFx = createMarketEffects(meshes)
  return (frame: WildlifeFrame, overview: boolean, runoff: MarketRunoff) => {
    const lit = frame.weather.hour >= 18 || frame.weather.hour < 6.15
    lamp.flame.setEnabled(lit)
    lamp.globe.visibility = lit ? .9 : .24
    draw(frame, overview)
    marketFx(frame, overview, runoff)
  }
}
