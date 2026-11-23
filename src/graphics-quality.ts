import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine'
import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { automaticGraphics, graphicsTiers } from './assets/recipes/graphics-quality'
import { bindGraphicsOptions, type GraphicsChoice } from './graphics-options-ui'

type Tier = keyof typeof graphicsTiers

interface ForestDetail { setDetail(nearM: number, understoryM: number): void }

const millisecondsPerSecond = 1000

// Applies the Options dialog's graphics tier to the renderer, and on Automatic
// watches the frame time and drops to Low once if the computer can't keep up.
export function createGraphicsQuality(engine: AbstractEngine, sunlight: DirectionalLight, forest: ForestDetail) {
  let choice: GraphicsChoice = 'auto'
  let tier: Tier = 'high'
  let average = 0, slowFor = 0, settled = 0
  const listening = new AbortController()
  engine.onDisposeObservable.addOnce(() => listening.abort())

  function apply(next: Tier) {
    tier = next
    const settings = graphicsTiers[next]
    engine.setHardwareScalingLevel(settings.renderScale)
    sunlight.shadowEnabled = settings.shadows
    forest.setDetail(settings.forestNearM, settings.understoryM)
  }

  function choose(next: GraphicsChoice) {
    choice = next
    average = slowFor = settled = 0
    apply(next === 'low' ? 'low' : 'high')
  }
  const options = bindGraphicsOptions(choose, listening.signal)
  choose(options.current())

  return {
    frame(deltaSeconds: number) {
      if (choice !== 'auto' || tier === 'low') return
      // Loading and the first frames are slow on every computer; judge after they settle.
      settled += deltaSeconds
      if (settled < automaticGraphics.settleSeconds) return
      average += (deltaSeconds * millisecondsPerSecond - average) * automaticGraphics.smoothing
      slowFor = average > automaticGraphics.slowFrameMs ? slowFor + deltaSeconds : 0
      if (slowFor < automaticGraphics.slowSeconds) return
      apply('low')
      options.lowered()
    },
  }
}
