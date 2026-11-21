import { busGains, defaultSound, voiceBudget, type SoundSettings } from './mix.ts'
import type { Rendered } from './recipes.ts'

export type AudioState = 'locked' | 'running' | 'suspended' | 'closed'
export type Point3 = { x: number; y: number; z: number }
type Bus = 'effects' | 'ambience'

// A lane is a persistent gain and optional panner that several one-shots play through,
// so a moving emitter can glide its level and position without restarting its sound.
export type Lane = {
  setGain(value: number, seconds?: number): void
  setPosition(point: Point3): void
  dispose(): void
  readonly input: AudioNode
}

type PlayOptions = { bus?: Bus; position?: Point3; lane?: Lane; at?: number; gain?: number }

type Voice = { source: AudioBufferSourceNode; gain: GainNode; bus: Bus }

const fadeSeconds = 0.03

// Babylon uses a left-handed frame and Web Audio a right-handed one; mirror z so left stays left.
function place(panner: PannerNode, { x, y, z }: Point3, at: number) {
  panner.positionX.setTargetAtTime(x, at, 0.03)
  panner.positionY.setTargetAtTime(y, at, 0.03)
  panner.positionZ.setTargetAtTime(-z, at, 0.03)
}

function spatial(context: BaseAudioContext) {
  const panner = context.createPanner()
  panner.panningModel = 'equalpower'
  panner.distanceModel = 'inverse'
  panner.refDistance = 3
  panner.rolloffFactor = 1.1
  panner.maxDistance = 90
  return panner
}

function createBufferCache(size: number) {
  const cache = new Map<string, AudioBuffer>()
  return {
    get(context: BaseAudioContext, rendered: Rendered) {
      const cached = cache.get(rendered.key)
      if (cached) {
        cache.delete(rendered.key)
        cache.set(rendered.key, cached)
        return cached
      }
      const data = rendered.render()
      const created = context.createBuffer(1, data.length, rendered.rate)
      created.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
      cache.set(rendered.key, created)
      if (cache.size > size) cache.delete(cache.keys().next().value!)
      return created
    },
    clear: () => cache.clear(),
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
    setGain(value, seconds = 0.4) {
      level.gain.setTargetAtTime(Math.max(0, value), context.currentTime, seconds / 3)
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
  listener.positionX.setTargetAtTime(point.x, at, 0.03)
  listener.positionY.setTargetAtTime(point.y, at, 0.03)
  listener.positionZ.setTargetAtTime(-point.z, at, 0.03)
  listener.forwardX.setTargetAtTime(forward.x, at, 0.03)
  listener.forwardY.setTargetAtTime(forward.y, at, 0.03)
  listener.forwardZ.setTargetAtTime(-forward.z, at, 0.03)
}

export function createAudioEngine(makeContext: () => AudioContext = () => new AudioContext(), cacheSize = 64) {
  let context: AudioContext | null = null
  let buses: Record<'master' | Bus, GainNode> | null = null
  let hidden = false
  let settings = defaultSound
  let reported: AudioState = 'locked'
  const cache = createBufferCache(cacheSize)
  const voices: Voice[] = []
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
    for (const bus of ['master', 'ambience', 'effects'] as const) buses[bus].gain.setTargetAtTime(gains[bus], context.currentTime, 0.05)
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

  function release(voice: Voice, at = context?.currentTime ?? 0) {
    voice.gain.gain.cancelScheduledValues(at)
    voice.gain.gain.setTargetAtTime(0, at, fadeSeconds / 3)
    try {
      voice.source.stop(at + fadeSeconds * 2)
    } catch {
      // A source that never started or already stopped needs no stop.
    }
  }

  function forget(voice: Voice) {
    const index = voices.indexOf(voice)
    if (index >= 0) voices.splice(index, 1)
    voice.source.disconnect()
    voice.gain.disconnect()
  }

  function play(rendered: Rendered, { bus = 'effects', position, lane, at, gain = 1 }: PlayOptions = {}) {
    if (state() !== 'running' || !context || !buses) return false
    const playing = voices.filter((voice) => voice.bus === bus)
    if (playing.length >= voiceBudget[bus]) {
      release(playing[0])
      forget(playing[0])
    }
    const start = Math.max(context.currentTime, at ?? context.currentTime)
    const source = context.createBufferSource()
    source.buffer = cache.get(context, rendered)
    const level = context.createGain()
    level.gain.value = Math.max(0, rendered.gain * gain)
    source.connect(level)
    if (lane) level.connect(lane.input)
    else if (position) {
      const panner = spatial(context)
      place(panner, position, context.currentTime)
      level.connect(panner)
      panner.connect(buses[bus])
      source.addEventListener('ended', () => panner.disconnect())
    } else level.connect(buses[bus])
    const voice = { source, gain: level, bus }
    voices.push(voice)
    source.addEventListener('ended', () => forget(voice))
    source.start(start)
    return true
  }

  function stopAll() {
    for (const voice of voices.slice()) release(voice)
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
      } else void wake()
    },
    onState(watch: (state: AudioState) => void) {
      watchers.add(watch)
      return () => watchers.delete(watch)
    },
    now: () => context?.currentTime ?? 0,
    voices: (bus?: Bus) => voices.filter((voice) => !bus || voice.bus === bus).length,
    play,
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
      if (context && context.state !== 'closed') void context.close().catch(() => {})
      report()
    },
  }
}

export type AudioEngine = ReturnType<typeof createAudioEngine>
