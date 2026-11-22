import { interactiveWorldLook as look } from '../assets/recipes/interactive-world-effects'
import { starterShaderSites } from '../worlds/starter/layout/places'
import { streetLampGeometry } from '../assets/geometry/site-props'
import type { MeshFactory } from '../island-meshes'
import type { MarketRunoff } from '../market-runoff'
import type { Player, Snapshot } from '../protocol'
import type { ShaderQuality } from '../shader-studies'
import { coastRadius, groundHeight, tidePool, waterDepth, waterLevel } from '../terrain'
import { onBeachTowel } from '../worlds/starter/sites'
import { daylight, nightLighting } from '../weather'
import { harborDock } from '../world'
import type { Pose } from '../world'
import { interactiveStudies, saltBloomPile, type StudyId } from './catalog'
import { demonstrationLamp, studyBuilders } from './effects'
import type { Effect, EffectFrame, Place } from './render'
import { skiffStudyPose, wakeStrength } from './skiff-wake'
import { createFootprintTrail } from './vegetation'

export const parallaxCottage = -45

export interface StudyInspection { id: StudyId, value: number }

interface WorldSignals extends StudyActors {
  runoff: MarketRunoff
  tideLevel: number
  quality: ShaderQuality
}

export interface StudyActors {
  snapshot?: Snapshot
  waterCrew?: readonly Player[]
  skiffPose?: Pose
  inspection?: StudyInspection
}

const half = 0.5
const wadingIdleStrength = 0.23
const verticalViewRatio = 0.75
const headlampReach = 2.22
const headlampRise = 0.97
const nearEffectRange = 46
const trailViewRange = 43
const tidePoolBlendRadius = 2.2
const wadingViewRange = 37
const wadingStartStrength = 0.13
const wadingPreviousWeight = 0.79
const wadingSpeedWeight = 0.21
const wadingBaseStrength = 0.10
const wadingVelocityGain = 0.15
const moonViewRange = 70
const minVisibleResponse = 0.001
const minVisibleDroplets = 0.02

const objectY: Partial<Record<StudyId, number>> = {
  'skiff-wake': waterLevel + look.interfaceLift.wake,
  'wading-rings': waterLevel + look.interfaceLift.wading,
  'seabed-caustics': waterLevel,
  'water-rain-rings': waterLevel + look.interfaceLift.rain,
  'waterfall-shear': 0,
  'timber-salt-bloom': (saltBloomPile.top + saltBloomPile.bottom) * half,
  'window-parallax': look.placementHeight.window,
  'rope-fiber-sheen': harborDock.top + look.placementHeight.ropeLift,
  'streetlamp-droplets': streetLampGeometry.bulb.y,
  'fernfall-rainbow': look.placementHeight.rainbow,
  'moon-glitter': waterLevel + look.interfaceLift.glitter,
}

const baseVisible = new Set<StudyId>(['ridge-lichen', 'closing-flowers', 'reed-transmission', 'timber-salt-bloom', 'awning-rain-load', 'window-parallax', 'road-retroreflector', 'rope-fiber-sheen', 'cooling-embers'])

function sameSiteAsCamera(camera: EffectFrame['camera'], origin: Place, range: number) {
  return Math.abs(camera.y - origin.y) < range * verticalViewRatio && Math.hypot(camera.x - origin.x, camera.z - origin.z) < range
}

function naturalResponses(frame: EffectFrame, { runoff, snapshot }: WorldSignals): Record<Exclude<StudyId, 'skiff-wake'>, number> {
  const { rain, hour } = frame.weather
  const day = daylight(hour)
  const night = nightLighting(hour)
  return {
    'wading-rings': wadingIdleStrength,
    'seabed-caustics': day * (1 - rain * look.caustics.rainLoss) * look.caustics.peak,
    'water-rain-rings': rain,
    'waterfall-shear': look.waterfall.base + rain * look.waterfall.rainRise,
    'canopy-dapple': day * (1 - rain * look.canopy.rainLoss) * look.canopy.peak,
    'reed-transmission': day > 0 ? (1 - rain * look.reeds.rainLoss) * look.reeds.peak : 0,
    'sand-footprints': look.tracks,
    'ridge-lichen': look.lichen * rain,
    'closing-flowers': Math.min(1, day * look.petals.openingRate) * (1 - rain * look.petals.rainLoss),
    'timber-salt-bloom': look.salt.peak * (1 - rain * look.salt.rainLoss),
    'awning-rain-load': Math.max(runoff.canvas * look.canvas.fabric, runoff.puddle * look.canvas.puddle),
    'window-parallax': look.window.daytime + (1 - day) * look.window.nightBoost,
    'road-retroreflector': night,
    'rope-fiber-sheen': (1 - rain * look.rope.rainLoss) * day * look.rope.peak,
    'fernfall-rainbow': look.rainbow.peak * Math.max(0, 1 - Math.abs(hour - look.rainbow.hour) / look.rainbow.halfWindowHours),
    'cooling-embers': snapshot?.mission === 'fire' ? snapshot.fire : 0,
    'streetlamp-droplets': rain,
    'meadow-pollen': look.pollen.peak * day * (1 - rain) * Math.max(0, 1 - Math.abs(hour - look.pollen.hour) / look.pollen.halfWindowHours),
    'moon-glitter': night * (1 - rain * look.moon.rainLoss) * look.moon.peak,
  }
}

function stampCandidate(player: Player) {
  const beach = starterShaderSites.sand.footprints
  return player.connected && player.grounded && !player.sleeping && !player.seat && !player.truckSurface
    && !onBeachTowel(player) && coastRadius(player) > beach.minCoastRadius && waterDepth(player) < beach.maxDepth
    && player.x > beach.minX && player.z < beach.maxZ
}

function activeHeadlamp(snapshot: Snapshot | undefined): EffectFrame['lamp'] {
  const truck = snapshot?.truck
  if (!truck) return
  return {
    x: truck.x + Math.sin(truck.heading) * headlampReach,
    z: truck.z + Math.cos(truck.heading) * headlampReach,
    y: truck.y + headlampRise,
    heading: truck.heading,
  }
}

function setSurfaceOrigin(root: Effect['root'], actor: Pose, level: number) {
  root.position.set(actor.x, level, actor.z)
  root.rotation.y = actor.heading
}

export function createIslandShaderEffects(meshes: MeshFactory, includeCottage: boolean, skiff: Effect['root']) {
  const entries = interactiveStudies.map((study) => {
    const { x, z } = study.field.point
    const origin = { x, z, y: objectY[study.id] ?? groundHeight({ x, z }) }
    const effect = studyBuilders[study.id](meshes, origin, false)
    effect.root.setEnabled(false)
    return { id: study.id, origin, effect }
  })
  const walkers = entries.find(({ id }) => id === 'sand-footprints')!
  const wake = entries.find(({ id }) => id === 'skiff-wake')!
  const tracks = walkers.effect as ReturnType<typeof createFootprintTrail>
  const secondTracks = createFootprintTrail(meshes, walkers.origin, false)
  const secondRipple = studyBuilders['wading-rings'](meshes, { ...tidePool, y: waterLevel }, false)
  const lastWaders = new Map<number, { point: Pose, time: number, strength: number }>()
  let trailDemo = false

  function updateWake(frame: EffectFrame, signals: WorldSignals) {
    const inspection = signals.inspection
    const demo = inspection?.id === 'skiff-wake' ? skiffStudyPose(wake.origin, frame.time, inspection.value) : undefined
    if (demo) setSurfaceOrigin(skiff, demo, skiff.position.y)
    const vessel = demo ?? signals.snapshot?.skiff
    const pose = demo ?? signals.skiffPose ?? vessel
    const strength = vessel && pose && signals.quality !== 'off' ? wakeStrength(vessel, pose) : 0
    const visible = Boolean(strength && pose && sameSiteAsCamera(frame.camera, { ...pose, y: wake.origin.y }, nearEffectRange))
    wake.effect.root.setEnabled(visible)
    if (!visible || !pose || !vessel) return
    const heading = pose.heading + (vessel.speed < 0 ? Math.PI : 0)
    setSurfaceOrigin(wake.effect.root, { ...pose, heading }, wake.origin.y)
    wake.effect.pose(frame, strength)
  }

  function updateTrails(frame: EffectFrame, signals: WorldSignals) {
    const demo = signals.inspection?.id === 'sand-footprints'
    if (trailDemo && !demo) tracks.clear()
    trailDemo = demo
    const players = signals.snapshot?.players.filter(stampCandidate) ?? []
    const live = signals.quality !== 'off'
    for (const [index, trail] of [tracks, secondTracks].entries()) {
      const scripted = index === 0 && demo
      if (!scripted) trail.step(players.find((player) => player.id === index), frame.time)
      trail.root.setEnabled(live && sameSiteAsCamera(frame.camera, walkers.origin, trailViewRange))
      if (trail.root.isEnabled()) trail.pose(frame, scripted ? signals.inspection!.value : look.tracks, Number(scripted))
    }
  }

  function updateWaders(frame: EffectFrame, signals: WorldSignals) {
    const first = entries.find(({ id }) => id === 'wading-rings')!
    const demo = signals.inspection?.id === first.id
    for (const [index, ripple] of [first.effect, secondRipple].entries()) {
      const swimmer = signals.waterCrew?.find((player) => player.id === index)
      const scripted = index === 0 && demo
      if (!swimmer) lastWaders.delete(index)
      if (!swimmer && !scripted) {
        ripple.root.setEnabled(false)
        continue
      }
      const actor = scripted ? { ...first.origin, heading: 0 } : swimmer!
      const level = Math.hypot(actor.x - tidePool.x, actor.z - tidePool.z) < tidePoolBlendRadius
        ? Math.max(waterLevel, signals.tideLevel)
        : waterLevel
      setSurfaceOrigin(ripple.root, actor, level + look.interfaceLift.liveWader)
      let strength = signals.inspection?.value ?? 0
      if (swimmer && !scripted) {
        const time = signals.snapshot?.islandTime ?? frame.time
        const previous = lastWaders.get(index)
        strength = previous?.strength ?? wadingStartStrength
        if (previous && time > previous.time) {
          const velocity = Math.hypot(previous.point.x - swimmer.x, previous.point.z - swimmer.z) / (time - previous.time)
          strength = strength * wadingPreviousWeight + Math.min(1, wadingBaseStrength + velocity * wadingVelocityGain) * wadingSpeedWeight
        }
        lastWaders.set(index, { point: swimmer, time, strength })
      }
      ripple.root.setEnabled(signals.quality !== 'off' && strength > 0 && sameSiteAsCamera(frame.camera, ripple.root.position, wadingViewRange))
      if (ripple.root.isEnabled()) ripple.pose(frame, strength)
    }
  }

  return (frame: EffectFrame, signals: WorldSignals) => {
    const responses = naturalResponses(frame, signals)
    const live = signals.quality !== 'off'
    updateWake(frame, signals)
    updateTrails(frame, signals)
    updateWaders(frame, signals)
    for (const { id, origin, effect } of entries) {
      if (id === 'skiff-wake' || id === 'sand-footprints' || id === 'wading-rings') continue
      const selected = signals.inspection?.id === id
      const response = live ? selected ? signals.inspection!.value : responses[id] : 0
      const detail = studyDetail(id, frame, signals, origin, selected)
      const active = (response > minVisibleResponse || baseVisible.has(id) || (id === 'streetlamp-droplets' && live && detail > minVisibleDroplets))
        && studyIsPlaced(id, includeCottage, selected, signals)
      const visible = id === 'timber-salt-bloom' || sameSiteAsCamera(frame.camera, effect.root.position, id === 'moon-glitter' ? moonViewRange : nearEffectRange)
      effect.root.setEnabled(active && visible)
      if (!effect.root.isEnabled()) continue
      const lighting = id === 'road-retroreflector'
        ? { ...frame, lamp: selected ? demonstrationLamp(origin) : activeHeadlamp(signals.snapshot) }
        : frame
      effect.pose(lighting, response, detail)
    }
  }
}

function studyDetail(id: StudyId, frame: EffectFrame, signals: WorldSignals, origin: Place, selected: boolean) {
  switch (id) {
    case 'seabed-caustics': return Math.max(waterLevel, signals.tideLevel)
    case 'streetlamp-droplets': return selected ? 1 : nightLighting(frame.weather.hour)
    case 'water-rain-rings': return Number(signals.quality === 'low')
    case 'timber-salt-bloom': return waterLevel + look.salt.tideSway * Math.sin(frame.time * look.salt.tideRate + origin.x)
    default: return 0
  }
}

function studyIsPlaced(id: StudyId, includeCottage: boolean, selected: boolean, { snapshot }: WorldSignals) {
  if (id === 'window-parallax') return includeCottage
  if (id === 'cooling-embers') return selected || (snapshot !== undefined && snapshot.mission !== 'delivery')
  return true
}
