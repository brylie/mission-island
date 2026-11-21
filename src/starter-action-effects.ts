import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import { inSkiff } from './actions'
import type { createCrew, createFarmTools, createSkiffGear } from './assets/crew'
import { paddleBladeOffset, wateringRoseOffset } from './assets/crew'
import { farmPlots, plotSurfaceOffset } from './farm'
import { wakeStrength } from './interactive-shaders/skiff-wake'
import { juniperCenter, juniperLayout } from './juniper-habitat'
import type { ParticleSource } from './particle-motion'
import type { CultivationCue, Player, Snapshot } from './protocol'
import { distanceToRoads, distanceToRoute, footpaths } from './routes'
import { snapshotEffectCues } from './starter-effect-cues'
import { groundHeight, walkingHeight, waterDepth, waterLevel } from './terrain'
import { truckPoint } from './truck-pose'
import { flatbedGroundDrive } from './vehicles/flatbed'
import { distance, offset, onDock, type Point } from './world'
import { createMovingEffects } from './world-particles'

type Effects = ReturnType<typeof createMovingEffects>
type Crew = ReturnType<typeof createCrew>
const paddleBlade = new Vector3(...paddleBladeOffset)
const wateringRose = new Vector3(...wateringRoseOffset)
const surface = waterLevel + 0.019
const clover = juniperLayout.patches.filter((p) => p.kind === 'clover')
  .map((p) => ({ x: juniperCenter.x + p.x, z: juniperCenter.z + p.z }))

interface Rigs {
  boat: TransformNode
  crew: Crew[]
  farmTools: ReturnType<typeof createFarmTools>[]
  paddles: ReturnType<typeof createSkiffGear>[]
  ferns: readonly Point[]
}

function wake(effects: Effects, boat: TransformNode, skiff: Snapshot['skiff']) {
  const speed = Math.abs(skiff.speed)
  const pose = { x: boat.position.x, z: boat.position.z, heading: boat.rotation.y }
  if (speed < 0.5 || !wakeStrength(skiff, pose)) return
  const yaw = pose.heading + (skiff.speed < 0 ? Math.PI : 0)
  for (const side of [-1, 1]) {
    const source = offset({ ...pose, heading: yaw }, side * 0.65, -2.33)
    if (waterDepth(source) <= 0) continue
    effects.emit('skiff-wake-foam', String(side), { ...source, y: surface, yaw: yaw - 0.48 * side, speed: 0.73 + speed * 0.065 }, { strength: Math.min(0.91, speed * 0.17), footprint: 0.89 })
  }
}

function wheelEffects(effects: Effects, truck: Snapshot['truck'], rain: number) {
  const speed = Math.abs(truck.speed)
  if (speed < 1.8) return
  const { axles, halfTrack } = flatbedGroundDrive.wheels
  for (const side of [-1, 1]) {
    const owner = String(side)
    const point = truckPoint(truck, side * (halfTrack + 0.1), 0.045, axles[truck.braking ? 1 : 0])
    const depth = waterDepth(point)
    const paved = distanceToRoads(point) < 3.3
      || footpaths.some((path) => path.surface === 'pavement' && distanceToRoute(point, path.points) < path.width / 2)
    const strength = Math.min(1, speed / 8)
    const ground = groundHeight(point)
    const source = { ...point, y: Math.max(ground + 0.045, point.y), floor: ground + 0.017, yaw: truck.heading + (side < 0 ? -0.55 : 0.28) }
    if ((depth > 0.014 && depth < 0.24) || (rain > 0.42 && paved)) {
      effects.emit('slipway-tire-sheet', owner, { ...source, y: Math.max(source.y, surface), floor: Math.max(surface, source.floor) }, { strength: strength * (depth > 0.014 ? 0.8 : rain * 0.6), footprint: 0.78 })
    }
    else if (!paved && depth <= 0.014 && rain < 0.22) {
      if (truck.braking) effects.emit('gravel-brake-chips', owner, source, { strength: strength * 0.61, footprint: 0.8 })
      else effects.emit('track-dust', owner, { ...source, yaw: truck.heading + (side < 0 ? Math.PI * 0.79 : 0.05) }, { strength: strength * 0.49, footprint: 0.79 })
    }
  }
}

function row(effects: Effects, rigs: Rigs, player: Player, time: number) {
  const stroke = Math.sin(time * 5.2 + player.id * 2.2)
  const index = player.seat === 'port' ? 0 : 1
  const side = index ? 1 : -1
  const paddle = rigs.paddles[player.id][index].paddle
  paddle.rotation.x = -rigs.crew[player.id].arms[index].rotation.x + stroke * 0.41
  paddle.rotation.z = side * (1.02 + (stroke + 1) * 0.25)
  if (stroke > -0.32) return
  const blade = Vector3.TransformCoordinates(paddleBlade, paddle.computeWorldMatrix(true))
  const fallback = offset({ x: rigs.boat.position.x, z: rigs.boat.position.z, heading: rigs.boat.rotation.y }, side * 1.45, -0.15 + stroke * 0.81)
  const point = blade.y < waterLevel + 0.27 ? { x: blade.x, z: blade.z } : fallback
  effects.emit('paddle-droplets', String(player.id), { ...point, y: surface + 0.035, yaw: rigs.boat.rotation.y + (side < 0 ? Math.PI * 0.9 : 0), floor: surface }, { strength: 0.69, footprint: 0.81 })
}

function cultivate(effects: Effects, cue: CultivationCue, rigs: Rigs, state: Snapshot) {
  const plot = farmPlots[cue.plot]
  const actor = state.players.find((p) => p.id === cue.actor)
  if (!plot || !actor) return
  const y = groundHeight(plot) + plotSurfaceOffset
  if (cue.kind === 'harvest') effects.burst('carrot-pull-crumbs', { ...plot, y: y + 0.26, floor: y }, 1, 0.85)
  if (cue.kind === 'hoe') effects.burst('hoe-soil-crumbs', { ...plot, y: y + 0.041, floor: y, yaw: actor.heading }, 1, 0.84)
  if (cue.kind === 'water') {
    const rose = Vector3.TransformCoordinates(wateringRose, rigs.farmTools[cue.actor].can.computeWorldMatrix(true))
    const dx = plot.x - rose.x, dz = plot.z - rose.z
    const speed = Math.max(0.4, Math.min(1.35, Math.hypot(dx, dz) / 1.17))
    effects.burst('watering-can-shower', { x: rose.x, y: rose.y, z: rose.z, floor: y, yaw: Math.atan2(dx, dz), pitch: -0.31, speed }, 1, 0.88, 0.28)
    effects.burst('garden-splashes', { ...plot, y: y + 0.013 }, 0.76, 0.79, 0.31, 0.34)
  }
}

type Step = { previous: Point, walked: number, side: number, wetUntil: number, plantAt: number }
function footfall(effects: Effects, player: Player, point: Point, step: Step, time: number, rain: number, ferns: readonly Point[]) {
  const depth = onDock(point) ? 0 : waterDepth(point)
  if (depth > 0.04) step.wetUntil = time + 7
  if (depth > 0.04 && depth < 0.76) {
    const foot = offset({ ...point, heading: player.heading }, step.side * 0.17, 0.15)
    const origin = { ...foot, y: surface, yaw: player.heading + step.side * 0.18 }
    effects.burst('wading-crescents', origin, 0.85, 0.84, 0.1)
    effects.burst('wading-drops', { ...origin, y: surface + 0.04, floor: surface, speed: 0.72 }, 0.42, 0.55, 0.10)
  }
  if (onDock(point) && step.wetUntil > time) {
    const foot = offset({ ...point, heading: player.heading }, step.side * 0.17, 0.1)
    effects.burst('boot-drain-trail', { ...foot, y: walkingHeight(point) + 0.018, yaw: player.heading + step.side * 0.08 }, 0.69, 0.92, 0.085)
  }
  if (time < step.plantAt) return
  const fern = rain > 0.11 ? ferns.find((p) => distance(point, p) < 0.68) : undefined
  const bloom = clover.find((p) => distance(point, p) < 0.41)
  if (fern) effects.burst('wet-fern-shake', { ...fern, y: groundHeight(fern) + 0.4, yaw: player.heading, floor: walkingHeight(fern) }, 0.63, 0.8)
  if (bloom) effects.burst('clover-petal-scatter', { ...bloom, y: groundHeight(bloom) + 0.27, yaw: player.heading, floor: walkingHeight(bloom) }, 0.65, 0.75)
  if (fern || bloom) step.plantAt = time + 0.52
}

export function createStarterActionEffects(scene: Scene, rigs: Rigs) {
  const effects = createMovingEffects(scene)
  const steps = new Map<number, Step>()
  let pending = [] as ReturnType<typeof snapshotEffectCues>['cues']
  let cultivation: CultivationCue[] = []
  return {
    snapshot(before: Snapshot | undefined, after: Snapshot) {
      if (!before) return
      const batch = snapshotEffectCues(before, after)
      pending = [...pending, ...batch.cues].slice(-24)
      cultivation = [...cultivation, ...batch.cultivation].slice(-8)
    },
    draw(time: number, camera: Pick<ParticleSource, 'x' | 'y' | 'z'>, local: Player | undefined, state?: Snapshot) {
      effects.begin(time, camera, Boolean(local))
      if (state) {
        for (const cue of pending) {
          effects.burst(cue.id, cue.source, cue.strength, 0.88, cue.length)
          if (cue.id === 'hooked-fish-thrash') effects.burst('fish-spray', { ...cue.source, floor: surface }, 0.81, 0.86)
          if (cue.id === 'crate-landing-grit') effects.burst('crate-grains', cue.source, cue.strength, 0.72)
        }
        for (const cue of cultivation) cultivate(effects, cue, rigs, state)
        if (local && state.weather.rain > 0.05) {
          effects.emit('rain-streaks', 'crew', { x: local.x, z: local.z, y: Math.max(waterLevel, walkingHeight(local)) + 4.1, floor: Math.max(waterLevel, walkingHeight(local)) + 0.03 }, { strength: state.weather.rain * 0.48, footprint: 1.34 })
        }
        wake(effects, rigs.boat, state.skiff)
        wheelEffects(effects, state.truck, state.weather.rain)
        for (const player of state.players) {
          if (!player.connected || player.sleeping) {
            steps.delete(player.id)
            continue
          }
          if (inSkiff(player.seat) && player.rowing) row(effects, rigs, player, time)
          const point = rigs.crew[player.id].root.position
          if (player.swimming) effects.emit('submerged-bubble-trail', String(player.id), { x: point.x, y: waterLevel - 0.37, z: point.z, yaw: player.heading, ceiling: surface }, { strength: 0.66, footprint: 0.74 })
          const step = steps.get(player.id) ?? { previous: { x: point.x, z: point.z }, walked: 0, side: -1, wetUntil: 0, plantAt: 0 }
          const movement = distance(step.previous, point)
          step.previous = { x: point.x, z: point.z }
          if (player.swimming) step.wetUntil = time + 7
          if (player.seat || !player.grounded || movement > 1.8) step.walked = 0
          else step.walked += movement
          if (step.walked >= 0.72) {
            step.walked %= 0.72
            step.side *= -1
            footfall(effects, player, point, step, time, state.weather.rain, rigs.ferns)
          }
          steps.set(player.id, step)
        }
      }
      pending = []
      cultivation = []
      effects.finish()
    },
  }
}
