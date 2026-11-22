import { saltwindPlaceLooks as looks, saltwindWalkingLooks as steps } from '../assets/recipes/saltwind-world-effects'
import { saltwindEffectSites as anchors } from '../worlds/saltwind/layout/scenery'
import { createMillVent, createTimberSaw } from '../assets/effect-props'
import { longAcrePollenHeight } from '../assets/long-acre-flowers'
import { saltwindWindowRain, saltwindWindowRow } from '../assets/saltwind-window'
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

const workStartsHour = 8
const workEndsHour = 17
const workRainCutoff = 0.4
const half = 0.5
const sawdustFloorLift = 0.04
const steamOpacity = 0.81
const cuttingPeriod = 4
const cuttingSeconds = 0.91
const millDustOpacity = 0.89
const eddyBaseOpacity = 0.76
const eddyRainBoost = 0.21
const beeRainCutoff = 0.25
const maxContinuousStep = 2
const strideDistance = 0.78
const wadingDepthMax = 0.74
const wadingDepthMin = 0.05
const rainVisibleAt = 0.075

const daylightDry = ({ weather }: WildlifeFrame) => daylight(weather.hour) * (1 - weather.rain)
const working = ({ weather }: WildlifeFrame) => weather.hour >= workStartsHour && weather.hour < workEndsHour && weather.rain < workRainCutoff
const fromGround = ({ x, z }: MapPoint, lift: number) => ({ x, z, y: surfaceHeight(x, z) + lift })

function addMill(meshes: MeshFactory, solids: ScenerySolids) {
  const lot = buildings.find((building) => building.site === 'timber')!
  const mount = anchors.mill.ventFromLot
  const x = lot.x + mount.x, z = lot.z + mount.z
  const roofY = groundHeight(lot.x, lot.z) + lot.height + mount.roofLift
  const vent = createMillVent(meshes)
  vent.root.position.set(x, roofY, z)
  const saw = createTimberSaw(meshes)
  const base = fromGround(anchors.mill.saw, anchors.mill.saw.lift)
  saw.root.position.set(base.x, base.y, base.z)
  solids.capture(saw.root.getChildMeshes())
  const dust = { x: base.x + saw.dustOffset.x, y: base.y + saw.dustOffset.y, z: base.z + saw.dustOffset.z, floor: base.y + sawdustFloorLift }
  const placements: LocalEffect[] = [
    {
      id: 'workshop-vent-steam',
      anchor: { x, y: roofY + vent.outletHeight, z },
      ...looks.steam,
      opacity: (frame) => working(frame) ? steamOpacity : 0,
    },
    {
      id: 'sawdust-fan',
      anchor: dust,
      ...looks.dustFan,
      origin: (time) => time % cuttingPeriod < cuttingSeconds ? dust : undefined,
      opacity: (frame) => working(frame) ? 1 : 0,
    },
    {
      id: 'mill-dust',
      anchor: dust,
      ...looks.millDust,
      origin: (time) => time % cuttingPeriod < cuttingSeconds ? dust : undefined,
      opacity: (frame) => working(frame) ? millDustOpacity : 0,
    },
  ]
  return { placements, pose(frame: WildlifeFrame) {
    saw.pose(working(frame) ? frame.time : 0)
  } }
}

function eddy(): LocalEffect {
  const { fallsZ: z, sideRatio, lift, downstream } = anchors.eddy
  const orbit = looks.eddyOrbit
  const anchor = { x: fallsX(z) + sideRatio * fallsWidth(z), y: fallsY(z) + lift, z: z - downstream }
  return {
    id: 'eddy-foam-flecks',
    anchor,
    ...looks.eddy,
    opacity: (frame) => eddyBaseOpacity + eddyRainBoost * frame.weather.rain,
    origin: (time, i) => ({ ...anchor, x: anchor.x - orbit.xOffset + Math.sin(time * orbit.swayRate) * orbit.sway, z: anchor.z - orbit.zOffset + (i % orbit.lanes) * orbit.spacing, orbit: { x: anchor.x, z: anchor.z, angularSpeed: orbit.angularSpeed, peelAfter: orbit.peelAfter } }),
  }
}

function longAcre(): LocalEffect[] {
  return [
    ...hiveEntrances.map((point): LocalEffect => {
      const anchor = fromGround(point, looks.hiveApproach.lift)
      return { id: 'hive-entrance-traffic', anchor, ...looks.hive, opacity: (frame) => daylightDry(frame) * (frame.weather.rain < beeRainCutoff ? 1 : 0), origin: (_, i) => {
        const inbound = i % looks.hiveApproach.inboundEvery === 0
        return { ...anchor, z: anchor.z - (inbound ? looks.hiveApproach.inset : 0), yaw: inbound ? 0 : Math.PI, y: anchor.y + (inbound ? looks.hiveApproach.inboundLift : 0), pitch: inbound ? looks.hiveApproach.inboundPitch : looks.hiveApproach.outboundPitch }
      } }
    }),
    ...flowerBeds.map((bed): LocalEffect => ({
      id: 'pollen-motes',
      anchor: fromGround(bed, longAcrePollenHeight),
      ...looks.pollen,
      opacity: daylightDry,
    })),
  ]
}

function rainyWindows(): LocalEffect[] {
  const lot = buildings.find((building) => building.site === 'apartments')!
  const base = groundHeight(lot.x, lot.z)
  return [-1, 1].map((side) => {
    const x = lot.x + side * lot.width * saltwindWindowRow.edgeFraction
    const { y, z, floor } = saltwindWindowRain
    const anchor = { x, y: base + y, z: lot.z + lot.depth * half + z, floor: base + floor }
    return { id: 'window-spatter', anchor, ...looks.window, opacity: (frame) => frame.weather.rain }
  })
}

function createWalkingEffects(meshes: MeshFactory) {
  const effects = createMovingEffects(meshes.scene)
  const mine = sites.find((site) => site.id === 'mine')!
  let previous: Walker | undefined
  let traveled = 0
  return (frame: WildlifeFrame, point: Walker, overview: boolean, frozen: boolean) => {
    effects.begin(frame.time, frame.camera, !overview && !frozen)
    const stride = previous ? Math.hypot(point.x - previous.x, point.z - previous.z) : 0
    previous = { ...point }
    if (stride < maxContinuousStep && !frozen) traveled += stride
    else traveled = 0
    if (traveled > strideDistance) {
      traveled %= strideDistance
      const depth = waterHeight(point.x, point.z)
      if (point.y >= depth - wadingDepthMax && point.y < depth - wadingDepthMin && point.grounded) {
        effects.burst('wading-crescents', { x: point.x, z: point.z, y: depth + steps.wading.rise }, ...steps.wading.emission)
      }
      if (point.grounded && Math.hypot(point.x - mine.stop.x, point.z - (mine.stop.z + anchors.mineSlate.zFromStop)) < anchors.mineSlate.radius) {
        effects.burst('loose-slate-tumble', { x: point.x, z: point.z, y: point.y + steps.slate.rise, floor: point.y + steps.slate.floor }, ...steps.slate.emission)
      }
    }
    if (frame.weather.rain > rainVisibleAt) effects.emit('rain-streaks', 'walker', { x: point.x, z: point.z, y: point.y + steps.rain.height, floor: point.y + steps.rain.floor }, { strength: frame.weather.rain * steps.rain.strength, footprint: steps.rain.footprint })
    effects.finish()
  }
}

export function createSaltwindEffects(meshes: MeshFactory, solids: ScenerySolids) {
  const mill = addMill(meshes, solids)
  const walking = createWalkingEffects(meshes)
  const draw = createLocalEffects(meshes.scene, [
    eddy(),
    ...mill.placements,
    ...longAcre(),
    ...rainyWindows(),
    {
      id: 'ground-mist',
      anchor: fromGround({ x: picnicLedge.x + anchors.picnicMist.x, z: picnicLedge.z + anchors.picnicMist.z }, anchors.picnicMist.lift),
      ...looks.picnicMist,
      opacity: (frame) => phenomenonStrength('mist', frame.weather),
    },
  ])
  return (frame: WildlifeFrame, point: Walker, overview: boolean, frozen: boolean) => {
    draw(frame, overview)
    mill.pose(frame)
    walking(frame, point, overview, frozen)
  }
}
