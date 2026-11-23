import { roadDesignerLook as look } from '../assets/recipes/workbench-roads'
import { stretchMiddle } from '../road-shape'
import type { Point } from '../world'
import { gradeColor, type RoadAnalysis } from './road-analysis'
import type { RoadDraftRoad } from './road-draft'
import { mapPointInView, pointOnMap, type MapView } from './landscape-map-projection'

// Paints the road designer: roads coloured by grade over the island map, their dots
// and the handles in the middle of each stretch, and the selected road's long section.

const fullTurn = Math.PI + Math.PI

export function screenPoint(point: Point, view: MapView, canvas: HTMLCanvasElement): Point {
  const { u, v } = mapPointInView(pointOnMap(point), view)
  return { x: u * canvas.width, z: v * canvas.height }
}

function disc(ink: CanvasRenderingContext2D, at: Point, radius: number, fill: string, stroke: string) {
  ink.beginPath()
  ink.arc(at.x, at.z, radius, 0, fullTurn)
  ink.fillStyle = fill
  ink.fill()
  ink.strokeStyle = stroke
  ink.lineWidth = look.rimWidth
  ink.stroke()
}

interface Selection { road?: string, dot?: number, hoverAlong?: number }

export function paintRoads(ink: CanvasRenderingContext2D, view: MapView, roads: readonly { road: RoadDraftRoad, analysis: RoadAnalysis }[], selection: Selection) {
  const canvas = ink.canvas
  const project = (point: Point) => screenPoint(point, view, canvas)
  ink.clearRect(0, 0, canvas.width, canvas.height)
  ink.lineCap = ink.lineJoin = 'round'
  for (const { road, analysis } of roads) {
    const selected = road.id === selection.road
    const { profile } = analysis.graded
    ink.strokeStyle = look.road.outline
    ink.lineWidth = look.road.outlineWidth
    ink.beginPath()
    for (const [i, sample] of profile.entries()) {
      const at = project(sample)
      if (i === 0) ink.moveTo(at.x, at.z)
      else ink.lineTo(at.x, at.z)
    }
    ink.stroke()
    ink.lineWidth = selected ? look.road.selectedWidth : look.road.width
    for (let i = 1; i < profile.length; i++) {
      const a = project(profile[i - 1]), b = project(profile[i])
      ink.strokeStyle = gradeColor(profile[i - 1].grade, analysis.limits[i - 1])
      ink.beginPath()
      ink.moveTo(a.x, a.z)
      ink.lineTo(b.x, b.z)
      ink.stroke()
    }
    if (!selected) continue
    road.bends.forEach((_, i) => {
      disc(ink, project(stretchMiddle(road, i)), look.middle.radius, look.middle.fill, look.middle.stroke)
    })
    road.points.forEach((point, i) => {
      const chosen = i === selection.dot
      disc(ink, project(point), chosen ? look.dot.selectedRadius : look.dot.radius, chosen ? look.dot.selectedFill : look.dot.fill, look.dot.stroke)
    })
    const hovered = selection.hoverAlong === undefined ? undefined : profile.find((sample) => sample.along >= (selection.hoverAlong ?? 0))
    if (hovered) disc(ink, project(hovered), look.dot.selectedRadius, look.chart.marker, look.dot.stroke)
  }
}

// The long section: natural ground and the road's height along it, with cut and fill between.
export function paintLongSection(ink: CanvasRenderingContext2D, analysis: RoadAnalysis | undefined, hoverAlong?: number) {
  const { width, height } = ink.canvas
  const { padding } = look.chart
  ink.clearRect(0, 0, width, height)
  const profile = analysis?.graded.profile
  if (!profile?.length) return
  const length = profile[profile.length - 1].along || 1
  const heights = profile.flatMap((sample) => [sample.y, sample.ground])
  const low = Math.min(...heights), high = Math.max(...heights, low + 1)
  const x = (along: number) => padding + along / length * (width - padding - padding)
  const y = (metres: number) => height - padding - (metres - low) / (high - low) * (height - padding - padding)
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i]
    ink.fillStyle = a.cut > 0 ? look.chart.cut : look.chart.fill
    ink.beginPath()
    ink.moveTo(x(a.along), y(a.ground))
    ink.lineTo(x(b.along), y(b.ground))
    ink.lineTo(x(b.along), y(b.y))
    ink.lineTo(x(a.along), y(a.y))
    ink.fill()
  }
  for (const [key, color, lineWidth] of [['ground', look.chart.ground, look.chart.groundWidth], ['y', look.chart.road, look.chart.roadWidth]] as const) {
    ink.strokeStyle = color
    ink.lineWidth = lineWidth
    ink.beginPath()
    for (const [i, sample] of profile.entries()) {
      if (i) ink.lineTo(x(sample.along), y(sample[key]))
      else ink.moveTo(x(sample.along), y(sample[key]))
    }
    ink.stroke()
  }
  ink.fillStyle = look.chart.road
  ink.font = '11px system-ui, sans-serif'
  ink.fillText(`${high.toFixed(0)} m`, look.chart.labelInset, padding)
  ink.fillText(`${low.toFixed(0)} m`, look.chart.labelInset, height - padding)
  ink.fillText(`${length.toFixed(0)} m`, width - padding - padding, height - look.chart.labelDrop)
  if (hoverAlong === undefined) return
  ink.strokeStyle = look.chart.marker
  ink.lineWidth = 1
  ink.beginPath()
  ink.moveTo(x(hoverAlong), padding)
  ink.lineTo(x(hoverAlong), height - padding)
  ink.stroke()
}

// Metres along the road under a point on the long section.
export function alongAt(canvas: HTMLCanvasElement, analysis: RoadAnalysis | undefined, offsetX: number) {
  const profile = analysis?.graded.profile
  if (!profile?.length) return undefined
  const { padding } = look.chart
  const share = (offsetX * canvas.width / canvas.clientWidth - padding) / (canvas.width - padding - padding)
  return Math.max(0, Math.min(1, share)) * profile[profile.length - 1].along
}
