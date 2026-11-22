export const crewStudyStage = {
  duration: 2.4,
  headroom: 1.45,
  skiff: { y: 0.44, harborOffsetX: -6 },
  seabrook: { x: 39, z: 16 },
  stride: [1, 0.2, 1.4, 0.05],
  crate: { x: 0, y: 1.13, z: 0.89, windupLift: 0.41 },
  extinguisher: { position: [-0.49, 0.24, 0.59], reach: 0.8, reachChange: 0.2, reachRate: 4 },
  throw: { release: 1.12, followThrough: 1.39 },
  jump: { launch: 0.6, airborneHeight: 0.08 },
  paddle: { beatsPerLoop: 4 },
} as const

export const crewTurnaroundReview = {
  angles: {
    turnaround: { alpha: Math.PI / 2, x: 0.209 },
    profile: { alpha: 0.015, x: 0.484 },
    back: { alpha: -Math.PI / 2, x: 0.788 },
  },
  camera: { beta: 1.51, radius: 2.85, target: [0, 0.93, 0] },
  time: 0.4,
} as const
