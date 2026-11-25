import { roadDesignerLook as look } from '../assets/recipes/workbench-roads'
import { stretchMiddle } from '../road-shape'
import type { Point } from '../world'
import { gradeBand, type RoadAnalysis } from './road-analysis'
import type { RoadDraftRoad } from './road-draft'
import { mapPointInView, pointOnMap, type MapView } from './landscape-map-projection'

// Paints the road designer: roads coloured by grade over the island map, their dots
// and the handles in the middle of each stretch, and the selected road's long section.
// An over-limit stretch is dashed as well as red, so it reads without colour.

const fullTurn = Math.PI + Math.PI

export function screenPoint(point: Point, view: MapView, canvas: HTMLCanvasElement): Point {
  const { u, v } = mapPointInView(pointOnMap(point), view)
  return { x: u * canvas.width, z: v * canvas.height }
}

// The spot a warning or the long section points at: a ring, so the road shows through it.
function ring(ink: CanvasRenderingContext2D, at: Point) {
  for (const [color, width] of [[look.marker.outline, look.marker.outlineWidth], [look.marker.color, look.marker.width]] as const) {
    ink.beginPath()
    ink.arc(at.x, at.z, look.marker.radius, 0, fullTurn)
    ink.strokeStyle = color
    ink.lineWidth = width
    ink.stroke()
  }
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
    // One stroke per run of samples in the same grade band, so a dash runs on across samples.
    for (let start = 0; start < profile.length - 1;) {
      const band = gradeBand(profile[start].grade, analysis.limits[start])
      let end = start + 1
      while (end < profile.length - 1 && gradeBand(profile[end].grade, analysis.limits[end]) === band) end++
      ink.strokeStyle = look.grade[band]
      ink.setLineDash(band === 'over' ? look.road.overDash : [])
      ink.beginPath()
      for (let i = start; i <= end; i++) {
        const at = project(profile[i])
        if (i === start) ink.moveTo(at.x, at.z)
        else ink.lineTo(at.x, at.z)
      }
      ink.stroke()
      start = end
    }
    ink.setLineDash([])
    if (!selected) continue
    road.bends.forEach((_, i) => {
      disc(ink, project(stretchMiddle(road, i)), look.middle.radius, look.middle.fill, look.middle.stroke)
    })
    road.points.forEach((point, i) => {
      const chosen = i === selection.dot
      disc(ink, project(point), chosen ? look.dot.selectedRadius : look.dot.radius, chosen ? look.dot.selectedFill : look.dot.fill, look.dot.stroke)
    })
    const hovered = selection.hoverAlong === undefined ? undefined : profile.find((sample) => sample.along >= (selection.hoverAlong ?? 0))
    if (hovered) ring(ink, project(hovered))
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
  ink.lineWidth = look.chart.markerWidth
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
