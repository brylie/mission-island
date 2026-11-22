// The flatbed's engine: two seamless loops, an idle and a working layer, pitched by playback rate.
export const flatbedEngineRecipe = {
  sampleRate: 16000,
  loopSeconds: 0.75,
  // About 800 rpm on a small four-cylinder, firing twice per turn.
  firingHz: 27,
  loopFadeSeconds: 0.08,
  idle: {
    pulse: { bodyHz: 58, decaySeconds: 0.03, gain: 1 },
    knock: { cutoffHz: 420, decaySeconds: 0.006, gain: 0.35 },
    rumble: { cutoffHz: 150, gain: 0.45 },
  },
  // Under load the firing sharpens, the exhaust rasps and the body note lifts.
  load: {
    pulse: { bodyHz: 74, decaySeconds: 0.02, gain: 1 },
    knock: { cutoffHz: 1100, decaySeconds: 0.005, gain: 0.55 },
    rumble: { cutoffHz: 260, gain: 0.35 },
    rasp: { bandHz: [650, 2600], gain: 0.4 },
  },
  // Roughness is the uneven idle: how much each firing's strength and timing wanders.
  roughness: { strength: 0.35, timingFraction: 0.12 },
} as const

// How the truck's motion drives the engine on each client.
export const flatbedEngineDrive = {
  level: 0.62,
  // A moderately uneven idle; the Workbench can audition smoother or rougher engines.
  roughness: 0.5,
  idleRate: 1,
  topRate: 2.9,
  topSpeedMetresPerSecond: 13,
  // Effort lifts the working layer and nudges the pitch, so a straining engine sounds unlike plain speed.
  effortRate: 0.16,
  accelerationForFullEffort: 2.4,
  climbForFullEffort: 0.14,
  cratesForFullEffort: 3,
  crateEffort: 0.25,
  idleWhenWorking: 0.45,
  loadAtTopSpeed: 0.3,
  // Glide times in seconds.
  rateSeconds: 0.35,
  brakingRateSeconds: 0.6,
  levelSeconds: 0.25,
  startSeconds: 1.3,
  stopSeconds: 0.9,
  startRate: 0.55,
  effortSmoothingSeconds: 0.3,
} as const
