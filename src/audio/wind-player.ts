import { windMix } from '../assets/audio/wind.ts'
import { groundHeight } from '../terrain.ts'
import { gustAt } from '../wind.ts'
import type { Point } from '../world.ts'
import type { AudioEngine, Lane } from './engine.ts'
import type { LoopVoice } from './loop-voice.ts'
import { windCue, type WindLayer } from './wind-recipes.ts'
import { canopyGain, nearestCanopies, windExposure, type CanopyTree } from './wind-model.ts'

// A Workbench audition can fix the gust, the exposure and the crowns instead of reading them from the island.
type WindScene = { gust?: number, exposure?: number, canopies?: CanopyTree[] }

type CanopySlot = { lane: Lane | null, voices: Partial<Record<WindLayer, LoopVoice | null>>, tree: CanopyTree | null, pending: CanopyTree | null, fading: number }

const sameTree = (a: CanopyTree | null, b: CanopyTree | null) => a?.x === b?.x && a?.z === b?.z

// Open wind follows the shared gust and the listener's exposure. Nearby crowns rustle from their own
// positions, each a little behind or ahead of the gust, so the canopy moves together without marching in step.
export function createWindPlayer(engine: AudioEngine, seed = 1) {
  let bed: Lane | null = null
  const open: Partial<Record<WindLayer, LoopVoice | null>> = {}
  const slots: CanopySlot[] = Array.from({ length: windMix.canopy.voices }, () => ({ lane: null, voices: {}, tree: null, pending: null, fading: 0 }))
  let retargetIn = 0

  function ensure(store: Partial<Record<WindLayer, LoopVoice | null>>, layer: WindLayer, lane: Lane, offsetSeconds: number) {
    const current = store[layer]
    if (current?.alive()) return current
    store[layer] = engine.loop(windCue({ layer }, seed), lane, offsetSeconds)
    return store[layer]
  }

  function retarget(listener: Point, scene: WindScene) {
    const trees = scene.canopies ?? nearestCanopies(listener, slots.length)
    // Keep a crown in the slot that already plays it; give the others to crowns not yet heard.
    const unheard = trees.filter((tree) => !slots.some((slot) => sameTree(slot.tree, tree)))
    for (const slot of slots) {
      if (trees.some((tree) => sameTree(tree, slot.tree))) continue
      const next = unheard.shift() ?? null
      if (sameTree(next, slot.pending)) continue
      slot.pending = next
      slot.fading = slot.tree ? windMix.canopy.retargetSeconds : 0
    }
  }

  function canopyFrame(slot: CanopySlot, index: number, listener: Point, gust: (offset: number) => number, delta: number) {
    const { canopy, levelSeconds } = windMix
    slot.lane ??= engine.lane('ambience', true)
    const { lane } = slot
    if (!lane) return
    if (slot.fading > 0) {
      slot.fading -= delta
      lane.setGain(0, canopy.retargetSeconds)
      return
    }
    if (slot.pending !== slot.tree) slot.tree = slot.pending
    const { tree } = slot
    if (!tree) {
      lane.setGain(0, levelSeconds)
      return
    }
    const layer: WindLayer = tree.leafy ? 'leaves' : 'needles'
    ensure(slot.voices, layer, lane, canopy.loopOffsetSeconds[index] ?? 0)?.setLevel(1, levelSeconds)
    slot.voices[tree.leafy ? 'needles' : 'leaves']?.setLevel(0, levelSeconds)
    lane.setPosition({ x: tree.x, y: groundHeight(tree) + tree.height * canopy.crownHeightShare, z: tree.z })
    lane.setGain(canopy.level * canopyGain(Math.hypot(tree.x - listener.x, tree.z - listener.z)) * gust(canopy.gustOffsetSeconds[index] ?? 0), levelSeconds)
  }

  return {
    frame(listener: Point, time: number, rain: number, delta: number, scene: WindScene = {}) {
      if (engine.state() !== 'running') return
      bed ??= engine.lane('ambience', false)
      if (!bed) return
      const { open: mix, levelSeconds } = windMix
      bed.setGain(1, levelSeconds)
      const gustFrom = (offset: number) => scene.gust ?? gustAt(time - offset, rain)
      const gust = gustFrom(0)
      const exposure = scene.exposure ?? windExposure(listener)
      ensure(open, 'low', bed, 0)?.setLevel(mix.lowLevel * exposure * (1 - mix.lowGustShare + mix.lowGustShare * gust), levelSeconds)
      ensure(open, 'high', bed, 0)?.setLevel(mix.highLevel * exposure * gust ** mix.highGustCurve, levelSeconds)
      retargetIn -= delta
      if (retargetIn <= 0) {
        retargetIn = windMix.canopy.retargetSeconds
        retarget(listener, scene)
      }
      slots.forEach((slot, index) => void canopyFrame(slot, index, listener, gustFrom, delta))
    },
    exposure: windExposure,
    dispose() {
      for (const voice of Object.values(open)) voice?.stop(windMix.levelSeconds)
      for (const slot of slots) {
        for (const voice of Object.values(slot.voices)) voice?.stop(windMix.levelSeconds)
        slot.lane?.dispose()
      }
      bed?.dispose()
    },
  }
}
