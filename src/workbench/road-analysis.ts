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
  warnings: RoadWarning[]
}

const percent = 100
const gradeSlack = 0.005

function spaced(warnings: RoadWarning[], candidate: RoadWarning) {
  if (warnings.length >= look.maxWarnings) return
  if (warnings.some((warning) => warning.text.split(' ')[0] === candidate.text.split(' ')[0] && Math.abs(warning.along - candidate.along) < look.warningSpacingM)) return
  warnings.push(candidate)
}

// A road as the island grades it, with the problems a road builder would raise.
export function analyseRoad(graded: GradedRoad): RoadAnalysis {
  const kind = roadKinds[graded.kind]
  const limits = graded.profile.map((sample) => graded.layout?.maxGrade?.[sample.stretch] ?? kind.maxGrade)
  const radii = turnRadii(graded.profile)
  const warnings: RoadWarning[] = []
  graded.profile.forEach((sample, i) => {
    const metres = Math.round(sample.along)
    if (Math.abs(sample.grade) > limits[i] + gradeSlack) spaced(warnings, { along: sample.along, text: `Grade ${Math.round(Math.abs(sample.grade) * percent)}% at ${metres} m (limit ${Math.round(limits[i] * percent)}%)` })
    if (radii[i] < kind.minTurnRadiusM) spaced(warnings, { along: sample.along, text: `Hairpin radius ${radii[i].toFixed(1)} m at ${metres} m (pickup needs ${kind.minTurnRadiusM} m)` })
    if (naturalGroundHeight(sample) < waterLevel) spaced(warnings, { along: sample.along, text: `Crosses water at ${metres} m` })
    if (Math.abs(sample.cut) > look.deepEarthworkM) spaced(warnings, { along: sample.along, text: `${sample.cut > 0 ? 'Cut' : 'Fill'} ${Math.abs(sample.cut).toFixed(1)} m deep at ${metres} m` })
    const banks = graded.banks[i]
    if (banks && !(banks.left.meets && banks.right.meets)) spaced(warnings, { along: sample.along, text: `Bank can't meet the ground at ${metres} m: the hillside is too steep; move the road` })
  })
  return { graded, limits, radii, warnings }
}

// The colour of a stretch of road by how close it runs to its grade limit.
export function gradeColor(grade: number, limit: number) {
  const steep = Math.abs(grade)
  if (steep > limit + gradeSlack) return look.grade.over
  if (steep < look.grade.easyBelow) return look.grade.easy
  return steep < look.grade.steadyBelow ? look.grade.steady : look.grade.limit
}
