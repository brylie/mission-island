import { roadKinds, roadNetwork, type RoadKind } from './assets/geometry/road-kinds.ts'
import type { RoadProfileSample } from './road-profile.ts'
import type { Point } from './world.ts'

// The banks beside a graded road. A cut bank rises from the formation edge and a fill
// embankment falls from it, each at its kind's slope, until it meets the ground. A bank that
// would not meet the ground within reach is made steeper, as builders steepen a cut in rock,
// so no bank ever ends in a wall. Where even a rock cut cannot meet the ground, the bank is
// flagged; the road designer warns about it.

// Horizontal metres per metre of height, per side of each sample.
// `cutMeetsM` and `fillMeetsM` are how far out each bank meets the ground; beyond that it has
// no say, which keeps the ground continuous where it ends.
export interface BankSlopes { cut: number, fill: number, cutMeetsM: number, fillMeetsM: number, meets: boolean }
export interface SampleBanks { left: BankSlopes, right: BankSlopes }

const stepM = 0.5
const half = 0.5
// A bank must meet the ground this far inside the reach, so the grading's edge is never a step.
const meetMarginM = 1
// Neighbouring samples share the steepest slope within this many samples, so a bank's slope
// changes smoothly along the road.
const smoothSamples = 4

function slopesToTry(kind: RoadKind) {
  const { cutSlope, fillSlope, rockCutSlope } = roadKinds[kind]
  const between = (cutSlope + rockCutSlope) * half
  return { cut: [cutSlope, between, rockCutSlope], fill: [fillSlope, cutSlope, between, rockCutSlope] }
}

// The slopes that bring one side's banks to the ground within reach.
function sideSlopes(kind: RoadKind, edge: Point, outward: Point, base: number, ground: (point: Point) => number): BankSlopes {
  const reach = roadNetwork.reachM - meetMarginM
  const heights: number[] = []
  for (let t = stepM; t <= reach; t += stepM) heights.push(ground({ x: edge.x + outward.x * t, z: edge.z + outward.z * t }))
  // How far out a bank at this slope first meets the ground, if it does within reach.
  const meetsAt = (slope: number, rising: boolean) => {
    const i = heights.findIndex((height, k) => {
      const t = (k + 1) * stepM
      return rising ? base + t / slope >= height : base - t / slope <= height
    })
    return i < 0 ? undefined : (i + 1) * stepM
  }
  const tries = slopesToTry(kind)
  const cut = tries.cut.find((slope) => meetsAt(slope, true) !== undefined)
  const fill = tries.fill.find((slope) => meetsAt(slope, false) !== undefined)
  const cutSlope = cut ?? roadKinds[kind].rockCutSlope, fillSlope = fill ?? roadKinds[kind].rockCutSlope
  return {
    cut: cutSlope,
    fill: fillSlope,
    cutMeetsM: meetsAt(cutSlope, true) ?? reach,
    fillMeetsM: meetsAt(fillSlope, false) ?? reach,
    meets: cut !== undefined && fill !== undefined,
  }
}

function smoothed(sides: readonly BankSlopes[]): BankSlopes[] {
  return sides.map((_, i) => {
    const window = sides.slice(Math.max(0, i - smoothSamples), i + smoothSamples + 1)
    return { ...sides[i], cut: Math.min(...window.map((side) => side.cut)), fill: Math.min(...window.map((side) => side.fill)) }
  })
}

export function roadBanks(kind: RoadKind, profile: readonly RoadProfileSample[], halfFormation: number, crown: number, ground: (point: Point) => number): SampleBanks[] {
  const side = (sample: RoadProfileSample, sign: number) => {
    const outward = { x: -sample.dz * sign, z: sample.dx * sign }
    const edge = { x: sample.x + outward.x * halfFormation, z: sample.z + outward.z * halfFormation }
    return sideSlopes(kind, edge, outward, sample.y - crown, ground)
  }
  const left = smoothed(profile.map((sample) => side(sample, 1)))
  const right = smoothed(profile.map((sample) => side(sample, -1)))
  return profile.map((_, i) => ({ left: left[i], right: right[i] }))
}
