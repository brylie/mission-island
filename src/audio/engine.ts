import { busGains, defaultSound, voiceBudget, type SoundSettings } from './mix.ts'
import { workerRenderer, type RecipeRenderer } from './recipe-renderer.ts'
import type { Rendered } from './recipes.ts'
import { startLoopVoice, type LoopVoice } from './loop-voice.ts'

const spatialSmoothingSeconds = 0.03
const pannerReferenceMetres = 3
const pannerRolloff = 1.1
const pannerMaximumMetres = 90
const rampTimeConstants = 3
const releaseStopMultiplier = 2
const defaultLaneRampSeconds = 0.4
// Room for every island variant, dry and soaked, with headroom for auditions.
const defaultBufferCacheEntries = 320
const busRampTimeConstantSeconds = 0.05

export type AudioState = 'locked' | 'running' | 'suspended' | 'closed'
export type Point3 = { x: number, y: number, z: number }
type Bus = 'effects' | 'ambience'

// A lane is a persistent gain and optional panner that several one-shots play through,
// so a moving emitter can glide its level and position without restarting its sound.
export type Lane = {
  setGain(value: number, seconds?: number): void
  setPosition(point: Point3): void
  dispose(): void
  readonly input: AudioNode
}

// lateness: how long after its start time a cue may still begin if its buffer was not ready.
type PlayOptions = { bus?: Bus, position?: Point3, lane?: Lane, at?: number, gain?: number, lateness?: number }

type Voice = { source: AudioBufferSourceNode, gain: GainNode, bus: Bus }

const fadeSeconds = 0.03
const lateSeconds = 0.15

// Babylon uses a left-handed frame and Web Audio a right-handed one; mirror z so left stays left.
function place(panner: PannerNode, { x, y, z }: Point3, at: number) {
  panner.positionX.setTargetAtTime(x, at, spatialSmoothingSeconds)
  panner.positionY.setTargetAtTime(y, at, spatialSmoothingSeconds)
  panner.positionZ.setTargetAtTime(-z, at, spatialSmoothingSeconds)
}

function spatial(context: BaseAudioContext) {
  const panner = context.createPanner()
  panner.panningModel = 'equalpower'
  panner.distanceModel = 'inverse'
  panner.refDistance = pannerReferenceMetres
  panner.rolloffFactor = pannerRolloff
  panner.maxDistance = pannerMaximumMetres
  return panner
}

// Buffers are rendered by the recipe renderer, usually a worker, and kept by key in recent-use order.
function createBufferCache(size: number, renderer: () => RecipeRenderer) {
  const cache = new Map<string, AudioBuffer>()
  const pending = new Map<string, Promise<AudioBuffer>>()
  function peek(key: string) {
    const cached = cache.get(key)
    if (cached) {
      cache.delete(key)
      cache.set(key, cached)
    }
    return cached
  }
  return {
    peek,
    load(context: BaseAudioContext, rendered: Rendered) {
      const ready = peek(rendered.key)
      if (ready) return Promise.resolve(ready)
      const loading = pending.get(rendered.key) ?? renderer().render(rendered).then((data) => {
        const created = context.createBuffer(1, data.length, rendered.rate)
        created.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
        pending.delete(rendered.key)
        cache.set(rendered.key, created)
        if (cache.size > size) cache.delete(cache.keys().next().value!)
        return created
      })
      pending.set(rendered.key, loading)
      return loading
    },
    clear() {
      cache.clear()
      pending.clear()
    },
  }
}

// Playing one-shots, kept within each bus's voice budget. The oldest voice fades out to make room.
function createVoicePool() {
  const voices: Voice[] = []
  function release(voice: Voice, at: number) {
    voice.gain.gain.cancelScheduledValues(at)
    voice.gain.gain.setTargetAtTime(0, at, fadeSeconds / rampTimeConstants)
    try {
      voice.source.stop(at + fadeSeconds * releaseStopMultiplier)
    }
    catch {
      // A source that never started or already stopped needs no stop.
    }
  }
  function forget(voice: Voice) {
    const index = voices.indexOf(voice)
    if (index >= 0) voices.splice(index, 1)
    voice.source.disconnect()
    voice.gain.disconnect()
  }
  return {
    start(context: BaseAudioContext, output: AudioNode, bus: Bus, buffer: AudioBuffer, level: number, { position, lane, at }: Pick<PlayOptions, 'position' | 'lane' | 'at'>) {
      const playing = voices.filter((voice) => voice.bus === bus)
      if (playing.length >= voiceBudget[bus]) {
        release(playing[0], context.currentTime)
        forget(playing[0])
      }
      const source = context.createBufferSource()
      source.buffer = buffer
      const gain = context.createGain()
      gain.gain.value = Math.max(0, level)
      source.connect(gain)
      if (lane) gain.connect(lane.input)
      else if (position) {
        const panner = spatial(context)
        place(panner, position, context.currentTime)
        gain.connect(panner)
        panner.connect(output)
        source.addEventListener('ended', () => panner.disconnect())
      }
      else gain.connect(output)
      const voice = { source, gain, bus }
      voices.push(voice)
      source.addEventListener('ended', () => forget(voice))
      source.start(Math.max(context.currentTime, at ?? context.currentTime))
      return true
    },
    stopAll(at: number) {
      for (const voice of voices.slice()) release(voice, at)
    },
    count: (bus?: Bus) => voices.filter((voice) => !bus || voice.bus === bus).length,
  }
}

function createLane(context: BaseAudioContext, bus: AudioNode, positioned: boolean): Lane {
  const level = context.createGain()
  level.gain.value = 0
  const panner = positioned ? spatial(context) : null
  level.connect(panner ?? bus)
  panner?.connect(bus)
  return {
    input: level,
    setGain(value, seconds = defaultLaneRampSeconds) {
      level.gain.setTargetAtTime(Math.max(0, value), context.currentTime, seconds / rampTimeConstants)
    },
    setPosition(point) {
      if (panner) place(panner, point, context.currentTime)
    },
    dispose() {
      level.disconnect()
      panner?.disconnect()
    },
  }
}

function placeListener(context: BaseAudioContext, point: Point3, forward: Point3) {
  const listener = context.listener
  const at = context.currentTime
  if (!listener.positionX) {
    listener.setPosition(point.x, point.y, -point.z)
    listener.setOrientation(forward.x, forward.y, -forward.z, 0, 1, 0)
    return
  }
  listener.positionX.setTargetAtTime(point.x, at, spatialSmoothingSeconds)
  listener.positionY.setTargetAtTime(point.y, at, spatialSmoothingSeconds)
  listener.positionZ.setTargetAtTime(-point.z, at, spatialSmoothingSeconds)
  listener.forwardX.setTargetAtTime(forward.x, at, spatialSmoothingSeconds)
  listener.forwardY.setTargetAtTime(forward.y, at, spatialSmoothingSeconds)
  listener.forwardZ.setTargetAtTime(-forward.z, at, spatialSmoothingSeconds)
}

type EngineOptions = { cacheSize?: number, makeRenderer?: () => RecipeRenderer }

export function createAudioEngine(makeContext: () => AudioContext = () => new AudioContext(), { cacheSize = defaultBufferCacheEntries, makeRenderer = workerRenderer }: EngineOptions = {}) {
  let context: AudioContext | null = null
  let renderer: RecipeRenderer | null = null
  // Stopping or hiding starts a new generation, so a buffer that finishes later cannot start an old cue.
  let generation = 0
  let buses: Record<'master' | Bus, GainNode> | null = null
  let hidden = false
  let settings = defaultSound
  let reported: AudioState = 'locked'
  const cache = createBufferCache(cacheSize, () => renderer ??= makeRenderer())
  const pool = createVoicePool()
  const loops = new Set<LoopVoice>()
  const watchers = new Set<(state: AudioState) => void>()

  function state(): AudioState {
    if (!context) return 'locked'
    if (context.state === 'closed') return 'closed'
    if (hidden) return 'suspended'
    return context.state === 'running' ? 'running' : 'locked'
  }

  function report() {
    const next = state()
    if (next === reported) return
    reported = next
    for (const watch of watchers) watch(next)
  }

  function applySettings() {
    if (!context || !buses) return
    const gains = busGains(settings)
    for (const bus of ['master', 'ambience', 'effects'] as const) buses[bus].gain.setTargetAtTime(gains[bus], context.currentTime, busRampTimeConstantSeconds)
  }

  function build() {
    const created = makeContext()
    const master = created.createGain()
    master.connect(created.destination)
    const bus = () => {
      const node = created.createGain()
      node.connect(master)
      return node
    }
    context = created
    buses = { master, ambience: bus(), effects: bus() }
    created.onstatechange = report
    applySettings()
  }

  function wake(): Promise<void> {
    const resumed = context && context.state !== 'closed' && context.state !== 'running' ? context.resume() : Promise.resolve()
    report()
    return resumed.then(report, report)
  }

  // Starts at once when the buffer is cached. Otherwise the cue starts when its buffer arrives,
  // if playback is still running in the same generation and the cue is not too late.
  function play(rendered: Rendered, options: PlayOptions = {}) {
    if (state() !== 'running' || !context) return false
    const ready = cache.peek(rendered.key)
    if (ready) return start(ready, rendered, options)
    const owner = context
    const current = generation
    const latest = Math.max(owner.currentTime, options.at ?? 0) + (options.lateness ?? lateSeconds)
    void cache.load(owner, rendered).then((buffer) => {
      if (state() === 'running' && context === owner && generation === current && owner.currentTime <= latest) start(buffer, rendered, options)
    })
    return true
  }

  function start(buffer: AudioBuffer, rendered: Rendered, { bus = 'effects', gain = 1, ...route }: PlayOptions) {
    if (!context || !buses) return false
    return pool.start(context, buses[bus], bus, buffer, rendered.gain * gain, route)
  }

  function stopAll() {
    generation++
    pool.stopAll(context?.currentTime ?? 0)
    for (const voice of loops) voice.stop(fadeSeconds)
    loops.clear()
  }

  // Starts a looping voice into a lane when its buffer is ready; until then, renders it and returns null.
  // Callers ask again each frame and keep the voice while it reports alive.
  function loop(rendered: Rendered, lane: Lane, offsetSeconds = 0) {
    if (state() !== 'running' || !context) return null
    const ready = cache.peek(rendered.key)
    if (!ready) {
      void cache.load(context, rendered)
      return null
    }
    const voice: LoopVoice = startLoopVoice(context, ready, lane.input, offsetSeconds, () => loops.delete(voice))
    loops.add(voice)
    return voice
  }

  return {
    state,
    // Call synchronously from a pointer or key handler so the browser counts the gesture.
    // Resolves once playback is running, so a click can start its own cue on the first press.
    resumeFromGesture() {
      if (!context) build()
      return hidden ? Promise.resolve() : wake()
    },
    // A hidden tab stops its voices instead of building a backlog; returning starts fresh.
    setHidden(value: boolean) {
      if (hidden === value) return
      hidden = value
      if (!context) return
      if (value) {
        stopAll()
        void context.suspend().then(report, report)
        report()
      }
      else void wake()
    },
    onState(watch: (state: AudioState) => void) {
      watchers.add(watch)
      return () => watchers.delete(watch)
    },
    now: () => context?.currentTime ?? 0,
    voices: (bus?: Bus) => pool.count(bus),
    play,
    loop,
    // Render buffers ahead of need, in the background, so the first cue of each kind is ready.
    warm(cues: Rendered[]) {
      if (context) for (const rendered of cues) void cache.load(context, rendered)
    },
    lane: (bus: Bus, positioned: boolean) => context && buses ? createLane(context, buses[bus], positioned) : null,
    setListener(point: Point3, forward: Point3) {
      if (context) placeListener(context, point, forward)
    },
    setSettings(next: SoundSettings) {
      settings = next
      applySettings()
    },
    settings: () => settings,
    stopAll,
    dispose() {
      stopAll()
      watchers.clear()
      cache.clear()
      renderer?.dispose()
      if (context && context.state !== 'closed') void context.close().catch(() => {})
      report()
    },
  }
}

export type AudioEngine = ReturnType<typeof createAudioEngine>
