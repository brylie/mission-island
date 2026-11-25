import { landscapeMapArt, landscapeMapGuides, landscapeMapTracking } from '../assets/geometry/workbench-map-art'
import { footpaths, roads, walkways } from '../routes'
import { islandTrees, northernProps } from '../scenery'
import { coastPoint, coastSegments, groundHeight, waterLevel } from '../terrain'
import { buildings, dockEndZ, harborDock } from '../world'
import type { Point } from '../world'
import type { MapPoint } from './landscape-map-projection'
import { landscapeMapSize, pointInWorld, pointOnMap } from './landscape-map-projection'

const halves = 2
const fullTurn = Math.PI * halves

export function paintLandscapeMap(ink: CanvasRenderingContext2D) {
  const { sea, terrain, tree: treeMark, prop: propMark, paths, road, dock, building } = landscapeMapArt
  const { width, height } = ink.canvas
  const scale = width / landscapeMapSize.width
  const project = (point: Point) => {
    const { u, v } = pointOnMap(point)
    return [u * width, v * height] as const
  }
  function coast(radius: number) {
    ink.beginPath()
    for (let i = 0; i < coastSegments; i++) {
      const point = project(coastPoint(i * halves * Math.PI / coastSegments, radius))
      if (i === 0) ink.moveTo(...point)
      else ink.lineTo(...point)
    }
    ink.closePath()
  }

  ink.fillStyle = sea
  ink.fillRect(0, 0, width, height)
  for (const { radius, color } of landscapeMapArt.coast) {
    coast(radius)
    ink.fillStyle = color
    ink.fill()
  }

  ink.save()
  coast(terrain.coastInset)
  ink.clip()
  const tile = terrain.samplePixels
  const { lowland, elevationTint } = terrain
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const point = pointInWorld((x + tile / halves) / width, (y + tile / halves) / height)
      const elevation = groundHeight(point)
      const rise = Math.max(0, elevation) / terrain.elevationScale
      const slope = groundHeight({ x: point.x - terrain.slopeSampleOffset, z: point.z + terrain.slopeSampleOffset }) - elevation
      const light = Math.max(terrain.minLight, Math.min(terrain.maxLight, slope * terrain.slopeContrast))
      ink.fillStyle = elevation < waterLevel
        ? terrain.submerged
        : `rgb(${Math.round(lowland.red + rise * elevationTint.red + light)}, ${Math.round(lowland.green + rise * elevationTint.green + light)}, ${Math.round(lowland.blue + rise * elevationTint.blue + light)})`
      ink.fillRect(x, y, tile, tile)
    }
  }
  ink.restore()

  function dot(point: Point, radius: number, color: string) {
    ink.fillStyle = color
    ink.beginPath()
    ink.arc(...project(point), radius, 0, fullTurn)
    ink.fill()
  }
  for (const tree of islandTrees()) dot(tree, Math.max(treeMark.minRadius, tree.height * scale * treeMark.sizeScale), treeMark.color)
  for (const prop of northernProps()) dot(prop, Math.max(propMark.minRadius, prop.size * scale * propMark.sizeScale), prop.tree ? propMark.tree : propMark.rock)

  ink.lineCap = ink.lineJoin = 'round'
  function route(points: readonly Point[], widthMetres: number, color: string) {
    ink.strokeStyle = color
    ink.lineWidth = widthMetres * scale
    ink.beginPath()
    for (const [i, point] of points.entries()) {
      if (i === 0) ink.moveTo(...project(point))
      else ink.lineTo(...project(point))
    }
    ink.stroke()
  }
  for (const trail of footpaths) route(trail.points, trail.width, paths.trail)
  for (const trail of walkways) route(trail.points, trail.width, paths.walkway)
  for (const path of roads) route(path, road.outsideWidth, road.edge)
  for (const path of roads) route(path, road.insideWidth, road.surface)
  route([{ x: harborDock.x, z: harborDock.firstZ + dock.endInset }, { x: harborDock.x, z: dockEndZ - dock.endInset }], harborDock.width, dock.color)
  for (const { x, z, w, d } of buildings) {
    ink.fillStyle = building
    ink.fillRect(...project({ x: x - w / halves, z: z + d / halves }), w * scale, d * scale)
  }
}

function paintMapGuides(ink: CanvasRenderingContext2D, zoom: number) {
  const { width, height } = ink.canvas
  const scale = width * zoom / landscapeMapSize.width
  const { color, north, scale: ruler } = landscapeMapGuides
  const metres = ruler.distances.find((length) => length * scale <= width * ruler.widthFraction) ?? 1

  ink.fillStyle = color
  ink.font = north.label.font
  ink.textAlign = 'center'
  ink.fillText('N', width - north.label.edge, north.label.y)
  ink.beginPath()
  const [tip, ...edges] = north.outline
  ink.moveTo(width - tip[0], tip[1])
  for (const [edge, y] of edges) ink.lineTo(width - edge, y)
  ink.closePath()
  ink.fill()
  ink.textAlign = 'left'
  ink.font = ruler.label.font
  ink.fillText(`${metres} m`, ruler.x, height - ruler.label.bottom)
  ink.fillRect(ruler.x, height - ruler.bar.bottom, metres * scale, ruler.bar.thickness)
}

export function paintMapTracking(context: CanvasRenderingContext2D, zoom: number, focus?: MapPoint, cursor?: MapPoint) {
  const { focusRing, crosshair } = landscapeMapTracking
  const { width, height } = context.canvas
  context.clearRect(0, 0, width, height)
  paintMapGuides(context, zoom)
  if (focus) {
    const { u, v } = focus
    context.beginPath()
    context.arc(u * width, v * height, focusRing.radius, 0, fullTurn)
    context.lineWidth = focusRing.outline
    context.strokeStyle = focusRing.edge
    context.stroke()
    context.lineWidth = focusRing.width
    context.strokeStyle = focusRing.color
    context.stroke()
  }
  if (cursor) {
    const x = cursor.u * width
    const y = cursor.v * height
    context.beginPath()
    context.moveTo(x - crosshair.radius, y)
    context.lineTo(x + crosshair.radius, y)
    context.moveTo(x, y - crosshair.radius)
    context.lineTo(x, y + crosshair.radius)
    context.lineWidth = crosshair.width
    context.strokeStyle = crosshair.color
    context.stroke()
  }
}
