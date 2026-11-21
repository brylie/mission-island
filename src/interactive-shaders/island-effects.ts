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

const objectY: Partial<Record<StudyId, number>> = {
  'skiff-wake': waterLevel + 0.022,
  'wading-rings': waterLevel + 0.028,
  'seabed-caustics': waterLevel,
  'water-rain-rings': waterLevel + 0.031,
  'waterfall-shear': 0,
  'timber-salt-bloom': (saltBloomPile.top + saltBloomPile.bottom) / 2,
  'window-parallax': 2.074,
  'rope-fiber-sheen': harborDock.top + 0.017,
  'streetlamp-droplets': 2.53,
  'fernfall-rainbow': 2.1,
  'moon-glitter': waterLevel + 0.027,
}

const baseVisible = new Set<StudyId>(['ridge-lichen', 'closing-flowers', 'reed-transmission', 'timber-salt-bloom', 'awning-rain-load', 'window-parallax', 'road-retroreflector', 'rope-fiber-sheen', 'cooling-embers'])

function sameSiteAsCamera(camera: EffectFrame['camera'], origin: Place, range: number) {
  return Math.abs(camera.y - origin.y) < range * 0.75 && Math.hypot(camera.x - origin.x, camera.z - origin.z) < range
}

function naturalResponses(frame: EffectFrame, { runoff, snapshot }: WorldSignals): Record<Exclude<StudyId, 'skiff-wake'>, number> {
  const { rain, hour } = frame.weather
  const day = daylight(hour)
  const night = nightLighting(hour)
  return {
    'wading-rings': 0.23,
    'seabed-caustics': day * (1 - rain * 0.93) * 0.74,
    'water-rain-rings': rain,
    'waterfall-shear': 0.55 + rain * 0.37,
    'canopy-dapple': day * (1 - rain * 0.84) * 0.69,
    'reed-transmission': day > 0 ? (1 - rain * 0.77) * 0.72 : 0,
    'sand-footprints': 0.67,
    'ridge-lichen': 0.76 * rain,
    'closing-flowers': Math.min(1, day * 1.9) * (1 - rain * 0.54),
    'timber-salt-bloom': 0.82 * (1 - rain * 0.86),
    'awning-rain-load': Math.max(runoff.canvas * 0.73, runoff.puddle * 0.82),
    'window-parallax': 0.36 + (1 - day) * 0.57,
    'road-retroreflector': night,
    'rope-fiber-sheen': (1 - rain * 0.72) * day * 0.8,
    'fernfall-rainbow': 0.73 * Math.max(0, 1 - Math.abs(hour - 7.5) / 2.05),
    'cooling-embers': snapshot?.mission === 'fire' ? snapshot.fire : 0,
    'streetlamp-droplets': rain,
    'meadow-pollen': 0.59 * day * (1 - rain) * Math.max(0, 1 - Math.abs(hour - 15) / 4.2),
    'moon-glitter': night * (1 - rain * 0.73) * 0.73,
  }
}

function stampCandidate(player: Player) {
  return player.connected && player.grounded && !player.sleeping && !player.seat && !player.truckSurface
    && !onBeachTowel(player) && coastRadius(player) > 0.925 && waterDepth(player) < 0.028 && player.x > 24 && player.z < -26
}

function activeHeadlamp(snapshot: Snapshot | undefined): EffectFrame['lamp'] {
  const truck = snapshot?.truck
  if (!truck) return
  return {
    x: truck.x + Math.sin(truck.heading) * 2.22,
    z: truck.z + Math.cos(truck.heading) * 2.22,
    y: truck.y + 0.97,
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
    const visible = Boolean(strength && pose && sameSiteAsCamera(frame.camera, { ...pose, y: wake.origin.y }, 46))
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
      trail.root.setEnabled(live && sameSiteAsCamera(frame.camera, walkers.origin, 43))
      if (trail.root.isEnabled()) trail.pose(frame, scripted ? signals.inspection!.value : 0.67, Number(scripted))
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
      const level = Math.hypot(actor.x - tidePool.x, actor.z - tidePool.z) < 2.2
        ? Math.max(waterLevel, signals.tideLevel)
        : waterLevel
      setSurfaceOrigin(ripple.root, actor, level + 0.026)
      let strength = signals.inspection?.value ?? 0
      if (swimmer && !scripted) {
        const time = signals.snapshot?.islandTime ?? frame.time
        const previous = lastWaders.get(index)
        strength = previous?.strength ?? 0.13
        if (previous && time > previous.time) {
          const velocity = Math.hypot(previous.point.x - swimmer.x, previous.point.z - swimmer.z) / (time - previous.time)
          strength = strength * 0.79 + Math.min(1, 0.10 + velocity * 0.15) * 0.21
        }
        lastWaders.set(index, { point: swimmer, time, strength })
      }
      ripple.root.setEnabled(signals.quality !== 'off' && strength > 0 && sameSiteAsCamera(frame.camera, ripple.root.position, 37))
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
      const active = (response > 0.001 || baseVisible.has(id) || (id === 'streetlamp-droplets' && live && detail > 0.02))
        && studyIsPlaced(id, includeCottage, selected, signals)
      const visible = id === 'timber-salt-bloom' || sameSiteAsCamera(frame.camera, effect.root.position, id === 'moon-glitter' ? 70 : 46)
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
    case 'timber-salt-bloom': return waterLevel + 0.028 * Math.sin(frame.time * 1.5 + origin.x)
    default: return 0
  }
}

function studyIsPlaced(id: StudyId, includeCottage: boolean, selected: boolean, { snapshot }: WorldSignals) {
  if (id === 'window-parallax') return includeCottage
  if (id === 'cooling-embers') return selected || (snapshot !== undefined && snapshot.mission !== 'delivery')
  return true
}
