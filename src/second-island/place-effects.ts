import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createTimberSaw } from '../assets/effect-props'
import type { MeshFactory } from '../island-meshes'
import { daylight } from '../weather'
import type { WildlifeFrame } from '../wildlife'
import { phenomenonStrength } from '../wildlife-motion'
import { createLocalEffects, createMovingEffects, type LocalEffect } from '../world-particles'
import { flowerBeds, hiveEntrances } from './long-acre'
import { buildings } from './lots'
import { picnicLedge, sites } from './sites'
import type { MapPoint } from './sites'
import { fallsWidth, fallsX, fallsY, groundHeight, surfaceHeight, waterHeight } from './terrain'
import type { placeWalker, ScenerySolids } from './walking'
type Walker = ReturnType<typeof placeWalker>

const daylightDry = ({ weather }: WildlifeFrame) => daylight(weather.hour) * (1 - weather.rain)
const working = ({ weather }: WildlifeFrame) => weather.hour >= 8 && weather.hour < 17 && weather.rain < .4
const fromGround = ({ x, z }: MapPoint, lift: number) => ({ x, z, y: surfaceHeight(x, z) + lift })

function addMill(meshes: MeshFactory, solids: ScenerySolids) {
  const lot = buildings.find(building => building.site === 'timber')!
  const x = lot.x + 3.25, z = lot.z + .82
  const roofY = groundHeight(lot.x, lot.z) + lot.height + 1.64
  const vent = new TransformNode('Mill roof vent', meshes.scene)
  vent.position.set(x, roofY, z)
  meshes.cylinder(0, .06, 0, .46, .53, 1.55, 10, '#798985', vent)
  meshes.cylinder(0, .79, 0, .37, .43, .12, 10, '#545e55', vent)
  const saw = createTimberSaw(meshes)
  const base = fromGround({ x: -234, z: 167.8 }, .012)
  saw.root.position.set(base.x, base.y, base.z)
  solids.capture(saw.root.getChildMeshes())
  const dust = { x: base.x + .1, y: base.y + 1.12, z: base.z + .025, floor: base.y + .04 }
  const placements: LocalEffect[] = [
    {
      id: 'workshop-vent-steam', anchor: { x, y: roofY + .88, z }, range: 58,
      tuning: { strength: .55, footprint: 1.03, wind: .34 }, opacity: frame => working(frame) ? .81 : 0,
    },
    {
      id: 'sawdust-fan', anchor: dust, cycle: 8, range: 20, tuning: { strength: .65, footprint: .88 },
      origin: time => time % 4 < .91 ? dust : undefined, opacity: frame => working(frame) ? 1 : 0,
    },
    {
      id: 'mill-dust', anchor: dust, cycle: 8, range: 20, tuning: { strength: .57, footprint: .85 },
      origin: time => time % 4 < .91 ? dust : undefined, opacity: frame => working(frame) ? .89 : 0,
    },
  ]
  return { placements, pose(frame: WildlifeFrame) { saw.pose(working(frame) ? frame.time : 0) } }
}

function eddy(): LocalEffect {
  const z = 170.7
  const anchor = { x: fallsX(z) + .63 * fallsWidth(z), y: fallsY(z) + .039, z: z - 1.61 }
  return {
    id: 'eddy-foam-flecks', anchor, range: 34, tuning: { strength: .54, footprint: .84 },
    opacity: frame => .76 + .21 * frame.weather.rain,
    origin: (time, i) => ({ ...anchor, x: anchor.x - .92 + Math.sin(time * 2.7) * .33, z: anchor.z - .21 + (i % 4) * .15,
      orbit: { x: anchor.x, z: anchor.z, angularSpeed: -1.43, peelAfter: 1.17 } }),
  }
}

function longAcre(): LocalEffect[] {
  return [
    ...hiveEntrances.map((point): LocalEffect => {
      const anchor = fromGround(point, .40)
      return { id: 'hive-entrance-traffic', anchor, range: 15, tuning: { strength: .33, footprint: .59 },
        opacity: frame => daylightDry(frame) * (frame.weather.rain < .25 ? 1 : 0),
        origin: (_, i) => {
          const inbound = i % 3 === 0
          return { ...anchor, z: anchor.z - (inbound ? .63 : 0),
            yaw: inbound ? 0 : Math.PI, y: anchor.y + (inbound ? .2 : 0), pitch: inbound ? -.19 : .09 }
        } }
    }),
    ...flowerBeds.map((bed): LocalEffect => ({
      id: 'pollen-motes', anchor: fromGround(bed, .45), range: 18,
      tuning: { strength: .33, footprint: 1 }, opacity: daylightDry,
    })),
  ]
}

function rainyWindows(): LocalEffect[] {
  const lot = buildings.find(building => building.site === 'apartments')!
  return [-1, 1].map(side => {
    const x = lot.x + side * lot.width * .31
    const anchor = { x, y: groundHeight(lot.x, lot.z) + 2.06, z: lot.z + lot.depth / 2 + .148,
      floor: groundHeight(lot.x, lot.z) + 1.45 }
    return { id: 'window-spatter', anchor, range: 14, tuning: { strength: .63, footprint: .57 },
      opacity: frame => frame.weather.rain }
  })
}

function createWalkingEffects(meshes: MeshFactory) {
  const effects = createMovingEffects(meshes.scene)
  const mine = sites.find(site => site.id === 'mine')!
  let previous: Walker | undefined
  let traveled = 0
  return (frame: WildlifeFrame, point: Walker, overview: boolean, frozen: boolean) => {
    effects.begin(frame.time, frame.camera, !overview && !frozen)
    const stride = previous ? Math.hypot(point.x - previous.x, point.z - previous.z) : 0
    previous = { ...point }
    if (stride < 2 && !frozen) traveled += stride
    else traveled = 0
    if (traveled > .78) {
      traveled %= .78
      const depth = waterHeight(point.x, point.z)
      if (point.y >= depth - .74 && point.y < depth - .05 && point.grounded) {
        effects.burst('wading-crescents', { x: point.x, z: point.z, y: depth + .023 }, .76, .83, .095)
      }
      if (point.grounded && Math.hypot(point.x - mine.stop.x, point.z - (mine.stop.z + 13.4)) < 9) {
        effects.burst('loose-slate-tumble', { x: point.x, z: point.z, y: point.y + .082, floor: point.y + .012 }, .48, .7, .11)
      }
    }
    if (frame.weather.rain > .075) effects.emit('rain-streaks', 'walker',
      { x: point.x, z: point.z, y: point.y + 4.1, floor: point.y + .03 }, { strength: frame.weather.rain * .47, footprint: 1.35 })
    effects.finish()
  }
}

export function createSaltwindEffects(meshes: MeshFactory, solids: ScenerySolids) {
  const mill = addMill(meshes, solids)
  const walking = createWalkingEffects(meshes)
  const draw = createLocalEffects(meshes.scene, [
    eddy(), ...mill.placements, ...longAcre(), ...rainyWindows(),
    {
      id: 'ground-mist', anchor: fromGround({ x: picnicLedge.x - 4.1, z: picnicLedge.z - 4.4 }, .24), range: 43,
      tuning: { strength: .72, footprint: 1.5, wind: .25 },
      opacity: frame => phenomenonStrength('mist', frame.weather),
    },
  ])
  return (frame: WildlifeFrame, point: Walker, overview: boolean, frozen: boolean) => {
    draw(frame, overview)
    mill.pose(frame)
    walking(frame, point, overview, frozen)
  }
}
