import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import { inSkiff } from './actions'
import type { createCrew, createFarmTools, createSkiffGear } from './assets/crew'
import { paddleBladeOffset, wateringRoseOffset } from './assets/crew'
import { starterBurstLooks as bursts, starterTrailLooks as trails } from './assets/recipes/starter-world-effects'
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
const waterEffectLift = 0.019
const surface = waterLevel + waterEffectLift
const half = 0.5
const sides = [-1, 1] as const
const minWakeSpeed = 0.5
const wakeLateral = 0.65
const wakeStern = -2.33
const minTireSpeed = 1.8
const tireOuterOffset = 0.1
const tireGroundLift = 0.045
const tireFloorLift = 0.017
const pavedRoadReach = 3.3
const fullTireEffectSpeed = 8
const leftSprayYaw = -0.55
const rightSprayYaw = 0.28
const minSprayDepth = 0.014
const maxSprayDepth = 0.24
const wetPavementRain = 0.42
const maxDustRain = 0.22
const leftDustYawRatio = 0.79
const leftDustYaw = Math.PI * leftDustYawRatio
const rightDustYaw = 0.05
const paddleCadence = 5.2
const paddlerPhase = 2.2
const paddleStrokePitch = 0.41
const paddleBaseRoll = 1.02
const paddleStrokeRoll = 0.25
const paddleWaterEntry = -0.32
const paddleFallbackX = 1.45
const paddleFallbackZ = -0.15
const paddleFallbackSweep = 0.81
const paddleBladeWaterReach = 0.27
const canMinSpeed = 0.4
const canMaxSpeed = 1.35
const canSpeedDistance = 1.17
const wetBootDepth = 0.04
const wetBootSeconds = 7
const maxWadingSplashDepth = 0.76
const footLateral = 0.17
const wadingFootLead = 0.15
const wadingYawSpread = 0.18
const dockFootLead = 0.1
const fernMinRain = 0.11
const fernStepReach = 0.68
const cloverStepReach = 0.41
const plantCooldown = 0.52
const cueHistory = 24
const cultivationHistory = 8
const minimumVisibleRain = 0.05
const maxContinuousStep = 1.8
const strideDistance = 0.72
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
  if (speed < minWakeSpeed || !wakeStrength(skiff, pose)) return
  const yaw = pose.heading + (skiff.speed < 0 ? Math.PI : 0)
  const look = trails.wake
  for (const side of sides) {
    const source = offset({ ...pose, heading: yaw }, side * wakeLateral, wakeStern)
    if (waterDepth(source) <= 0) continue
    effects.emit('skiff-wake-foam', String(side), {
      ...source,
      y: surface,
      yaw: yaw - look.turnAway * side,
      speed: look.baseSpeed + speed * look.speedGain,
    }, { strength: Math.min(look.maxStrength, speed * look.strengthPerSpeed), footprint: look.footprint })
  }
}

function wheelEffects(effects: Effects, truck: Snapshot['truck'], rain: number) {
  const speed = Math.abs(truck.speed)
  if (speed < minTireSpeed) return
  const { axles, halfTrack } = flatbedGroundDrive.wheels
  const { roadSpray, brakeChips, tireDust } = trails
  for (const side of sides) {
    const owner = String(side)
    const point = truckPoint(truck, side * (halfTrack + tireOuterOffset), tireGroundLift, axles[truck.braking ? 1 : 0])
    const depth = waterDepth(point)
    const paved = distanceToRoads(point) < pavedRoadReach
      || footpaths.some((path) => path.surface === 'pavement' && distanceToRoute(point, path.points) < path.width * half)
    const strength = Math.min(1, speed / fullTireEffectSpeed)
    const ground = groundHeight(point)
    const source = {
      ...point,
      y: Math.max(ground + tireGroundLift, point.y),
      floor: ground + tireFloorLift,
      yaw: truck.heading + (side < 0 ? leftSprayYaw : rightSprayYaw),
    }
    if ((depth > minSprayDepth && depth < maxSprayDepth) || (rain > wetPavementRain && paved)) {
      effects.emit('slipway-tire-sheet', owner, { ...source, y: Math.max(source.y, surface), floor: Math.max(surface, source.floor) }, {
        strength: strength * (depth > minSprayDepth ? roadSpray.wadingStrength : rain * roadSpray.rainStrength),
        footprint: roadSpray.footprint,
      })
    }
    else if (!paved && depth <= minSprayDepth && rain < maxDustRain) {
      if (truck.braking) effects.emit('gravel-brake-chips', owner, source, { strength: strength * brakeChips.strength, footprint: brakeChips.footprint })
      else effects.emit('track-dust', owner, { ...source, yaw: truck.heading + (side < 0 ? leftDustYaw : rightDustYaw) }, { strength: strength * tireDust.strength, footprint: tireDust.footprint })
    }
  }
}

function row(effects: Effects, rigs: Rigs, player: Player, time: number) {
  const stroke = Math.sin(time * paddleCadence + player.id * paddlerPhase)
  const index = player.seat === 'port' ? 0 : 1
  const side = index ? 1 : -1
  const paddle = rigs.paddles[player.id][index].paddle
  paddle.rotation.x = -rigs.crew[player.id].arms[index].rotation.x + stroke * paddleStrokePitch
  paddle.rotation.z = side * (paddleBaseRoll + (stroke + 1) * paddleStrokeRoll)
  if (stroke > paddleWaterEntry) return
  const blade = Vector3.TransformCoordinates(paddleBlade, paddle.computeWorldMatrix(true))
  const fallback = offset(
    { x: rigs.boat.position.x, z: rigs.boat.position.z, heading: rigs.boat.rotation.y },
    side * paddleFallbackX,
    paddleFallbackZ + stroke * paddleFallbackSweep,
  )
  const point = blade.y < waterLevel + paddleBladeWaterReach ? { x: blade.x, z: blade.z } : fallback
  const look = trails.paddle
  effects.emit('paddle-droplets', String(player.id), { ...point, y: surface + look.rise, yaw: rigs.boat.rotation.y + (side < 0 ? Math.PI * look.portYawRatio : 0), floor: surface }, look.tuning)
}

function cultivate(effects: Effects, cue: CultivationCue, rigs: Rigs, state: Snapshot) {
  const plot = farmPlots[cue.plot]
  const actor = state.players.find((p) => p.id === cue.actor)
  if (!plot || !actor) return
  const y = groundHeight(plot) + plotSurfaceOffset
  if (cue.kind === 'harvest') effects.burst('carrot-pull-crumbs', { ...plot, y: y + bursts.harvest.rise, floor: y }, ...bursts.harvest.emission)
  if (cue.kind === 'hoe') effects.burst('hoe-soil-crumbs', { ...plot, y: y + bursts.hoe.rise, floor: y, yaw: actor.heading }, ...bursts.hoe.emission)
  if (cue.kind === 'water') {
    const rose = Vector3.TransformCoordinates(wateringRose, rigs.farmTools[cue.actor].can.computeWorldMatrix(true))
    const dx = plot.x - rose.x, dz = plot.z - rose.z
    const speed = Math.max(canMinSpeed, Math.min(canMaxSpeed, Math.hypot(dx, dz) / canSpeedDistance))
    effects.burst('watering-can-shower', { x: rose.x, y: rose.y, z: rose.z, floor: y, yaw: Math.atan2(dx, dz), pitch: bursts.rose.pitch, speed }, ...bursts.rose.emission)
    effects.burst('garden-splashes', { ...plot, y: y + bursts.puddles.rise }, ...bursts.puddles.emission)
  }
}

type Step = { previous: Point, walked: number, side: number, wetUntil: number, plantAt: number }
function footfall(effects: Effects, player: Player, point: Point, step: Step, time: number, rain: number, ferns: readonly Point[]) {
  const dock = onDock(point)
  const depth = dock ? 0 : waterDepth(point)
  if (depth > wetBootDepth) step.wetUntil = time + wetBootSeconds
  if (depth > wetBootDepth && depth < maxWadingSplashDepth) {
    const foot = offset({ ...point, heading: player.heading }, step.side * footLateral, wadingFootLead)
    const origin = { ...foot, y: surface, yaw: player.heading + step.side * wadingYawSpread }
    effects.burst('wading-crescents', origin, ...bursts.wadingRings)
    const { rise, speed, emission } = bursts.wadingDrops
    effects.burst('wading-drops', { ...origin, y: surface + rise, floor: surface, speed }, ...emission)
  }
  if (dock && step.wetUntil > time) {
    const foot = offset({ ...point, heading: player.heading }, step.side * footLateral, dockFootLead)
    const { rise, yawSpread, emission } = bursts.bootDrain
    effects.burst('boot-drain-trail', { ...foot, y: walkingHeight(point) + rise, yaw: player.heading + step.side * yawSpread }, ...emission)
  }
  if (time < step.plantAt) return
  const fern = rain > fernMinRain ? ferns.find((p) => distance(point, p) < fernStepReach) : undefined
  const bloom = clover.find((p) => distance(point, p) < cloverStepReach)
  if (fern) effects.burst('wet-fern-shake', { ...fern, y: groundHeight(fern) + bursts.fern.rise, yaw: player.heading, floor: walkingHeight(fern) }, ...bursts.fern.emission)
  if (bloom) effects.burst('clover-petal-scatter', { ...bloom, y: groundHeight(bloom) + bursts.clover.rise, yaw: player.heading, floor: walkingHeight(bloom) }, ...bursts.clover.emission)
  if (fern || bloom) step.plantAt = time + plantCooldown
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
      pending = [...pending, ...batch.cues].slice(-cueHistory)
      cultivation = [...cultivation, ...batch.cultivation].slice(-cultivationHistory)
    },
    draw(time: number, camera: Pick<ParticleSource, 'x' | 'y' | 'z'>, local: Player | undefined, state?: Snapshot) {
      effects.begin(time, camera, Boolean(local))
      if (state) {
        for (const cue of pending) {
          effects.burst(cue.id, cue.source, cue.strength, bursts.snapshotFootprint, cue.length)
          if (cue.id === 'hooked-fish-thrash') effects.burst('fish-spray', { ...cue.source, floor: surface }, ...bursts.fishSpray)
          if (cue.id === 'crate-landing-grit') effects.burst('crate-grains', cue.source, cue.strength, bursts.crateGrainFootprint)
        }
        for (const cue of cultivation) cultivate(effects, cue, rigs, state)
        if (local && state.weather.rain > minimumVisibleRain) {
          const floor = Math.max(waterLevel, walkingHeight(local))
          const look = trails.rain
          effects.emit('rain-streaks', 'crew', { x: local.x, z: local.z, y: floor + look.fallHeight, floor: floor + look.floorGap }, {
            strength: state.weather.rain * look.strength,
            footprint: look.footprint,
          })
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
          if (player.swimming) effects.emit('submerged-bubble-trail', String(player.id), { x: point.x, y: waterLevel - trails.bubbles.belowWater, z: point.z, yaw: player.heading, ceiling: surface }, trails.bubbles.tuning)
          const step = steps.get(player.id) ?? { previous: { x: point.x, z: point.z }, walked: 0, side: -1, wetUntil: 0, plantAt: 0 }
          const movement = distance(step.previous, point)
          step.previous = { x: point.x, z: point.z }
          if (player.swimming) step.wetUntil = time + wetBootSeconds
          if (player.seat || !player.grounded || movement > maxContinuousStep) step.walked = 0
          else step.walked += movement
          if (step.walked >= strideDistance) {
            step.walked %= strideDistance
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
