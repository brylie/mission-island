import { footpaths, road, walkways } from '../routes'
import { islandTrees, northernProps } from '../scenery'
import { coastPoint, groundHeight, waterLevel } from '../terrain'
import { buildings, dockEndZ, harborDock } from '../world'
import type { Point } from '../world'
import { landscapeMapSize, pointInWorld, pointOnMap } from './landscape-map-projection'

export function paintLandscapeMap(ink: CanvasRenderingContext2D) {
  const { width, height } = ink.canvas
  const scale = width / landscapeMapSize.width
  const project = (point: Point) => {
    const { u, v } = pointOnMap(point)
    return [u * width, v * height] as const
  }
  function coast(radius: number) {
    ink.beginPath()
    for (let i = 0; i < 192; i++) {
      const point = project(coastPoint(i * Math.PI / 96, radius))
      if (i === 0) ink.moveTo(...point)
      else ink.lineTo(...point)
    }
    ink.closePath()
  }

  ink.fillStyle = '#23494e'
  ink.fillRect(0, 0, width, height)
  for (const [radius, color] of [[1.07, '#2b595a'], [1.025, '#427471'], [1, '#c9b987']] as const) {
    coast(radius)
    ink.fillStyle = color
    ink.fill()
  }

  ink.save()
  coast(0.966)
  ink.clip()
  const tile = 4
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const point = pointInWorld((x + tile / 2) / width, (y + tile / 2) / height)
      const elevation = groundHeight(point)
      const rise = Math.max(0, elevation) / 15
      const slope = groundHeight({ x: point.x - 1.4, z: point.z + 1.4 }) - elevation
      const light = Math.max(-10, Math.min(14, slope * 28))
      ink.fillStyle = elevation < waterLevel
        ? '#558780'
        : `rgb(${Math.round(113 + rise * 68 + light)}, ${Math.round(147 + rise * 31 + light)}, ${Math.round(97 + rise * 46 + light)})`
      ink.fillRect(x, y, tile, tile)
    }
  }
  ink.restore()

  function dot(point: Point, radius: number, color: string) {
    ink.fillStyle = color
    ink.beginPath()
    ink.arc(...project(point), radius, 0, Math.PI * 2)
    ink.fill()
  }
  for (const tree of islandTrees) dot(tree, Math.max(2, tree.height * scale * 0.34), '#456d50')
  for (const prop of northernProps) dot(prop, Math.max(1.6, prop.size * scale * 0.68), prop.tree ? '#4a7155' : '#9a9e80')

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
  for (const trail of footpaths) route(trail.points, trail.width, '#c4b98c')
  for (const trail of walkways) route(trail.points, trail.width, '#c8caab')
  route(road, 6.8, '#534f45')
  route(road, 4.9, '#b5ab90')
  route([{ x: harborDock.x, z: harborDock.firstZ + 0.3 }, { x: harborDock.x, z: dockEndZ - 0.3 }], harborDock.width, '#a98a64')
  for (const { x, z, w, d } of buildings) {
    ink.fillStyle = '#e2c8a0'
    ink.fillRect(...project({ x: x - w / 2, z: z + d / 2 }), w * scale, d * scale)
  }
}

export function paintMapGuides(ink: CanvasRenderingContext2D, zoom: number) {
  const { width, height } = ink.canvas
  const scale = width * zoom / landscapeMapSize.width
  const metres = [25, 10, 5, 2, 1].find((length) => length * scale <= width * 0.14) ?? 1

  ink.fillStyle = '#f1e6bb'
  ink.font = 'bold 20px system-ui'
  ink.textAlign = 'center'
  ink.fillText('N', width - 33, 34)
  ink.beginPath()
  ink.moveTo(width - 33, 45)
  ink.lineTo(width - 41, 65)
  ink.lineTo(width - 33, 60)
  ink.lineTo(width - 25, 65)
  ink.closePath()
  ink.fill()
  ink.textAlign = 'left'
  ink.font = '18px system-ui'
  ink.fillText(`${metres} m`, 23, height - 33)
  ink.fillRect(23, height - 24, metres * scale, 3)
}
