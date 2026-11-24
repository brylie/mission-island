import { roadKinds } from '../assets/geometry/road-kinds.ts'
import { roadDesignerLook as look } from '../assets/recipes/workbench-roads.ts'
import type { GradedRoad } from '../road-grading.ts'
import { turnRadii } from '../road-shape.ts'
import { naturalGroundHeight, waterLevel } from '../terrain.ts'

// What the road designer shows about a draft road: its graded profile through the
// natural ground and the problems a road builder would raise, each with where it is.

export interface RoadWarning { along: number, text: string }

export interface RoadAnalysis {
  graded: GradedRoad
  // The grade limit at each sample.
  limits: number[]
  radii: number[]
  // The first `maxWarnings` problems along the road, and how many there are in all.
  warnings: RoadWarning[]
  warningTotal: number
}

const percent = 100
const gradeSlack = 0.005

function spaced(warnings: RoadWarning[], candidate: RoadWarning) {
  if (warnings.some((warning) => warning.text.split(' ')[0] === candidate.text.split(' ')[0] && Math.abs(warning.along - candidate.along) < look.warningSpacingM)) return
  warnings.push(candidate)
}

// A road as the island grades it, with the problems a road builder would raise.
export function analyseRoad(graded: GradedRoad): RoadAnalysis {
  const kind = roadKinds[graded.kind]
  const limits = graded.profile.map((sample) => graded.layout?.maxGrade?.[sample.stretch] ?? kind.maxGrade)
  const radii = turnRadii(graded.profile)
  const found: RoadWarning[] = []
  graded.profile.forEach((sample, i) => {
    const metres = Math.round(sample.along)
    if (Math.abs(sample.grade) > limits[i] + gradeSlack) spaced(found, { along: sample.along, text: `Grade ${Math.round(Math.abs(sample.grade) * percent)}% at ${metres} m (limit ${Math.round(limits[i] * percent)}%)` })
    if (radii[i] < kind.minTurnRadiusM) spaced(found, { along: sample.along, text: `Hairpin radius ${radii[i].toFixed(1)} m at ${metres} m (pickup needs ${kind.minTurnRadiusM} m)` })
    if (naturalGroundHeight(sample) < waterLevel) spaced(found, { along: sample.along, text: `Crosses water at ${metres} m` })
    if (Math.abs(sample.cut) > look.deepEarthworkM) spaced(found, { along: sample.along, text: `${sample.cut > 0 ? 'Cut' : 'Fill'} ${Math.abs(sample.cut).toFixed(1)} m deep at ${metres} m` })
    const banks = graded.banks[i]
    if (banks && !(banks.left.meets && banks.right.meets)) spaced(found, { along: sample.along, text: `Bank can't meet the ground at ${metres} m: the hillside is too steep; move the road` })
  })
  return { graded, limits, radii, warnings: found.slice(0, look.maxWarnings), warningTotal: found.length }
}

type GradeBand = 'easy' | 'steady' | 'limit' | 'over'

// How close a stretch of road runs to its own grade limit: over it; near it (the top
// `1 - nearLimitShare` of the limit); easy, under a gentle grade whatever the limit; or steady.
export function gradeBand(grade: number, limit: number): GradeBand {
  const steep = Math.abs(grade)
  if (steep > limit + gradeSlack) return 'over'
  if (steep >= limit * look.grade.nearLimitShare) return 'limit'
  return steep < look.grade.easyBelow ? 'easy' : 'steady'
}

// Metres along the road at each of its dots: where each stretch's first sample is, and the end.
export function dotAlongs(analysis: RoadAnalysis, dots: number) {
  const { profile } = analysis.graded
  return Array.from({ length: dots }, (_, i) => i === dots - 1
    ? profile.at(-1)?.along ?? 0
    : profile.find((sample) => sample.stretch === i)?.along ?? 0)
}
