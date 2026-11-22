// A continuous voice: one buffer looping seamlessly, whose playback rate and level glide without restarting.
// Engines, wind beds and canopy rustle use it, where a stream of one-shots would leave seams.

export type LoopVoice = {
  setRate(rate: number, seconds: number): void
  setLevel(level: number, seconds: number): void
  stop(fadeSeconds: number): void
  alive(): boolean
}

const rampTimeConstants = 3
const stopAfterFadeMultiplier = 2

export function startLoopVoice(context: BaseAudioContext, buffer: AudioBuffer, output: AudioNode, offsetSeconds: number, ended: () => void): LoopVoice {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = context.createGain()
  gain.gain.value = 0
  source.connect(gain)
  gain.connect(output)
  let playing = true
  source.addEventListener('ended', () => {
    playing = false
    source.disconnect()
    gain.disconnect()
    ended()
  })
  source.start(context.currentTime, offsetSeconds % buffer.duration)
  return {
    setRate(rate, seconds) {
      source.playbackRate.setTargetAtTime(Math.max(0, rate), context.currentTime, seconds / rampTimeConstants)
    },
    setLevel(level, seconds) {
      gain.gain.setTargetAtTime(Math.max(0, level), context.currentTime, seconds / rampTimeConstants)
    },
    stop(fadeSeconds) {
      if (!playing) return
      playing = false
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setTargetAtTime(0, context.currentTime, fadeSeconds / rampTimeConstants)
      try {
        source.stop(context.currentTime + fadeSeconds * stopAfterFadeMultiplier)
      }
      catch {
        // Already stopped.
      }
    },
    alive: () => playing,
  }
}
