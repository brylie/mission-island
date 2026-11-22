export const coastalFlowerPatch = {
  seedOffset: 76123,
  seedStride: 37,
  radius: 1.75,
  sideOffset: 2.3,
  z: -1,
  rowSpacing: 2,
} as const

export const coastalForagers = {
  seedOffset: 83271,
  home: { radius: 2.25, z: 2.4, phaseRange: 7 },
  separation: { range: 0.48, minimumDistance: 0.001, gain: 3 },
  roaming: { turnRate: 0.18, xDrift: 0.55, xDriftRate: 0.24, xOrbit: 0.38, zDrift: 0.36, zDriftRate: 0.20, zOrbit: 0.29 },
  limits: { maxStepSeconds: 0.12, seekGapSeconds: 0.5, stageRadius: 7.55 },
  walker: { offstage: 20, alertRange: 2.15 },
  gait: { minimumGap: 0.17, stepThreshold: 0.15, turnSpeed: 4, fleeSpeed: 0.94, walkSpeed: 0.34, phasePerMetre: 2.6 },
} as const
