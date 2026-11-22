const defaultAmbienceLevel = 0.7
const defaultEffectsLevel = 0.8
const effectsVoiceLimit = 12
// Surf swells overlap on three voices; bird calls share the ambience bus with them.
const ambienceVoiceLimit = 14
const volumeTaperPower = 2

// The client mix: two player-facing levels plus mute, kept quiet enough to talk over.

export type SoundSettings = { ambience: number, effects: number, muted: boolean }

export const defaultSound: SoundSettings = { ambience: defaultAmbienceLevel, effects: defaultEffectsLevel, muted: false }

// Overall headroom so the loudest cue stays under conversation level at a normal device volume.
const masterLevel = 0.42

export const voiceBudget = { effects: effectsVoiceLimit, ambience: ambienceVoiceLimit } as const

const level = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0

// Perceived loudness follows a curve, so a slider at half sounds roughly half as loud.
export function busGains(settings: SoundSettings) {
  return {
    master: settings.muted ? 0 : masterLevel,
    ambience: level(settings.ambience) ** volumeTaperPower,
    effects: level(settings.effects) ** volumeTaperPower,
  }
}
