// The client mix: two player-facing levels plus mute, kept quiet enough to talk over.

export type SoundSettings = { ambience: number; effects: number; muted: boolean }

export const defaultSound: SoundSettings = { ambience: 0.7, effects: 0.8, muted: false }

// Overall headroom so the loudest cue stays under conversation level at a normal device volume.
const masterLevel = 0.42

export const voiceBudget = { effects: 12, ambience: 8 } as const

const level = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0

// Perceived loudness follows a curve, so a slider at half sounds roughly half as loud.
export function busGains(settings: SoundSettings) {
  return {
    master: settings.muted ? 0 : masterLevel,
    ambience: level(settings.ambience) ** 2,
    effects: level(settings.effects) ** 2,
  }
}
