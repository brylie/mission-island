import type { MeshFactory } from '../island-meshes'
import type { MarketRunoff } from '../market-runoff'
import type { Player, Snapshot } from '../protocol'
import type { ShaderQuality } from '../shader-studies'
import { coastRadius, groundHeight, tidePool, waterDepth, waterLevel } from '../terrain'
import { onBeachTowel } from '../worlds/starter/sites'
import { daylight, nightLighting } from '../weather'
import { harborDock, skiffStart } from '../world'
import type { Pose } from '../world'
import { interactiveStudies, type StudyId } from './catalog'
import { boatInStudy, demonstrationLamp, studyBuilders } from './effects'
import type { Effect, EffectFrame, Place } from './render'
import { createFootprintTrail } from './vegetation'

export const studioPiling = { x: harborDock.x - 1.6, z: -34 }
export const parallaxCottage = -45

export interface StudyInspection { id: StudyId; value: number }

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
  'skiff-wake': waterLevel + .022, 'wading-rings': waterLevel + .028, 'seabed-caustics': waterLevel,
  'water-rain-rings': waterLevel + .031, 'waterfall-shear': 0, 'timber-salt-bloom': -.42,
  'window-parallax': 2.074, 'rope-fiber-sheen': harborDock.top + .017, 'streetlamp-droplets': 2.53,
  'fernfall-rainbow': 2.1, 'moon-glitter': waterLevel + .027,
}

const baseVisible = new Set<StudyId>(['ridge-lichen', 'closing-flowers', 'reed-transmission', 'timber-salt-bloom',
  'awning-rain-load', 'window-parallax', 'road-retroreflector', 'rope-fiber-sheen', 'cooling-embers'])

function sameSiteAsCamera(camera: EffectFrame['camera'], origin: Place, range: number) {
  return Math.abs(camera.y - origin.y) < range * .75 && Math.hypot(camera.x - origin.x, camera.z - origin.z) < range
}

function naturalResponses(frame: EffectFrame, { runoff, snapshot }: WorldSignals): Record<StudyId, number> {
  const { rain, hour } = frame.weather
  const day = daylight(hour)
  const night = nightLighting(hour)
  return {
    'skiff-wake': Math.min(1, Math.abs(snapshot?.skiff.speed ?? 0) / 5.8),
    'wading-rings': .23,
    'seabed-caustics': day * (1 - rain * .93) * .74,
    'water-rain-rings': rain,
    'waterfall-shear': .55 + rain * .37,
    'canopy-dapple': day * (1 - rain * .84) * .69,
    'reed-transmission': day > 0 ? (1 - rain * .77) * .72 : 0,
    'sand-footprints': .67,
    'ridge-lichen': .76 * rain,
    'closing-flowers': Math.min(1, day * 1.9) * (1 - rain * .54),
    'timber-salt-bloom': .82 * (1 - rain * .86),
    'awning-rain-load': Math.max(runoff.canvas * .73, runoff.puddle * .82),
    'window-parallax': .36 + (1 - day) * .57,
    'road-retroreflector': night,
    'rope-fiber-sheen': (1 - rain * .72) * day * .8,
    'fernfall-rainbow': .73 * Math.max(0, 1 - Math.abs(hour - 7.5) / 2.05),
    'cooling-embers': snapshot?.mission === 'fire' ? snapshot.fire : 0,
    'streetlamp-droplets': rain,
    'meadow-pollen': .59 * day * (1 - rain) * Math.max(0, 1 - Math.abs(hour - 15) / 4.2),
    'moon-glitter': night * (1 - rain * .73) * .73,
  }
}

function stampCandidate(player: Player) {
  return player.connected && player.grounded && !player.sleeping && !player.seat && !player.truckSurface
    && !onBeachTowel(player) && coastRadius(player) > .925 && waterDepth(player) < .028 && player.x > 24 && player.z < -26
}

function activeHeadlamp(snapshot: Snapshot | undefined): EffectFrame['lamp'] {
  const truck = snapshot?.truck
  if (!truck) return
  return {
    x: truck.x + Math.sin(truck.heading) * 2.22,
    z: truck.z + Math.cos(truck.heading) * 2.22,
    y: truck.y + .97,
    heading: truck.heading,
  }
}

function setSurfaceOrigin(root: Effect['root'], actor: Pose, level: number) {
  root.position.set(actor.x, level, actor.z)
  root.rotation.y = actor.heading
}

export function createIslandShaderEffects(meshes: MeshFactory, includeCottage: boolean, skiff: Effect['root']) {
  const entries = interactiveStudies.map(study => {
    const { x, z } = study.field.point
    const origin = { x, z, y: objectY[study.id] ?? groundHeight({ x, z }) }
    const effect = studyBuilders[study.id](meshes, origin, false)
    effect.root.setEnabled(false)
    return { id: study.id, origin, effect }
  })
  const walkers = entries.find(({ id }) => id === 'sand-footprints')!
  const tracks = walkers.effect as ReturnType<typeof createFootprintTrail>
  const secondTracks = createFootprintTrail(meshes, walkers.origin, false)
  const secondRipple = studyBuilders['wading-rings'](meshes, { ...tidePool, y: waterLevel }, false)
  const lastWaders = new Map<number, { point: Pose; time: number; strength: number }>()
  let trailDemo = false

  function updateTrails(frame: EffectFrame, signals: WorldSignals) {
    const demo = signals.inspection?.id === 'sand-footprints'
    if (trailDemo && !demo) tracks.clear()
    trailDemo = demo
    const players = signals.snapshot?.players.filter(stampCandidate) ?? []
    const live = signals.quality !== 'off'
    for (const [index, trail] of [tracks, secondTracks].entries()) {
      const scripted = index === 0 && demo
      if (!scripted) trail.step(players.find(player => player.id === index), frame.time)
      trail.root.setEnabled(live && sameSiteAsCamera(frame.camera, walkers.origin, 43))
      if (trail.root.isEnabled()) trail.pose(frame, scripted ? signals.inspection!.value : .67, Number(scripted))
    }
  }

  function updateWaders(frame: EffectFrame, signals: WorldSignals) {
    const first = entries.find(({ id }) => id === 'wading-rings')!
    const demo = signals.inspection?.id === first.id
    for (const [index, ripple] of [first.effect, secondRipple].entries()) {
      const swimmer = signals.waterCrew?.find(player => player.id === index)
      const scripted = index === 0 && demo
      if (!swimmer) lastWaders.delete(index)
      if (!swimmer && !scripted) {
        ripple.root.setEnabled(false)
        continue
      }
      const actor = scripted ? { ...first.origin, heading: 0 } : swimmer!
      const level = Math.hypot(actor.x - tidePool.x, actor.z - tidePool.z) < 2.2
        ? Math.max(waterLevel, signals.tideLevel) : waterLevel
      setSurfaceOrigin(ripple.root, actor, level + .026)
      let strength = signals.inspection?.value ?? 0
      if (swimmer && !scripted) {
        const time = signals.snapshot?.islandTime ?? frame.time
        const previous = lastWaders.get(index)
        strength = previous?.strength ?? .13
        if (previous && time > previous.time) {
          const velocity = Math.hypot(previous.point.x - swimmer.x, previous.point.z - swimmer.z) / (time - previous.time)
          strength = strength * .79 + Math.min(1, .10 + velocity*.15) * .21
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
    updateTrails(frame, signals)
    updateWaders(frame, signals)
    for (const { id, origin, effect } of entries) {
      if (id === 'sand-footprints' || id === 'wading-rings') continue
      const selected = signals.inspection?.id === id
      const response = live ? selected ? signals.inspection!.value : responses[id] : 0
      if (id === 'skiff-wake') {
        const boat = selected ? boatInStudy(origin) : signals.skiffPose ?? skiffStart
        setSurfaceOrigin(effect.root, boat, origin.y)
        if (selected) setSurfaceOrigin(skiff, boat, skiff.position.y)
      }
      const detail = studyDetail(id, frame, signals, origin, selected)
      const active = (response > .001 || baseVisible.has(id) || (id === 'streetlamp-droplets' && live && detail > .02))
        && studyIsPlaced(id, includeCottage, selected, signals)
      effect.root.setEnabled(active && sameSiteAsCamera(frame.camera, effect.root.position, id === 'moon-glitter' ? 70 : 46))
      if (!effect.root.isEnabled()) continue
      const lighting = id === 'road-retroreflector'
        ? { ...frame, lamp: selected ? demonstrationLamp(origin) : activeHeadlamp(signals.snapshot) } : frame
      effect.pose(lighting, response, detail)
    }
  }
}

function studyDetail(id: StudyId, frame: EffectFrame, signals: WorldSignals, origin: Place, selected: boolean) {
  switch (id) {
    case 'seabed-caustics': return Math.max(waterLevel, signals.tideLevel)
    case 'streetlamp-droplets': return selected ? 1 : nightLighting(frame.weather.hour)
    case 'water-rain-rings': return Number(signals.quality === 'low')
    case 'timber-salt-bloom': return waterLevel + .028 * Math.sin(frame.time * 1.5 + origin.x)
    default: return 0
  }
}

function studyIsPlaced(id: StudyId, includeCottage: boolean, selected: boolean, { snapshot }: WorldSignals) {
  if (id === 'window-parallax') return includeCottage
  if (id === 'cooling-embers') return selected || (snapshot !== undefined && snapshot.mission !== 'delivery')
  return true
}
