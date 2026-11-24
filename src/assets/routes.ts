import type { Material } from '@babylonjs/core/Materials/material'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { gravelTrailModel, laneMarkingModel, roadFinish, roadSurface, sidewalkLift, trailLift, wornTrailModel } from './geometry/route-profiles'
import type { MeshFactory } from '../island-meshes'
import { ribbonGeometry } from '../math/ribbon'
import { smoothstep } from '../math/smoothstep'
import { coastalSurface } from '../terrain'
import type { PathSurface } from '../routes'
import { laneMarkings } from '../routes'
import type { Point } from '../world'

const vertexSize = 3
const vertexZ = 2
const half = 0.5
const trailSampleSpacing = 0.32

function ribbon({ surface }: MeshFactory, name: string, strips: ReadonlyArray<readonly Point[]>, width: number, y: number, material: string | Material, tile: number = roadFinish.lineTile, heightAt?: (p: Point) => number) {
  const { positions, indices } = ribbonGeometry(strips, width, y)
  const uvs: number[] = []
  for (let i = 0; i < positions.length; i += vertexSize) {
    const x = positions[i], z = positions[i + vertexZ]
    if (heightAt) positions[i + 1] += heightAt({ x, z })
    uvs.push(x / tile, z / tile)
  }
  return surface(name, positions, indices, material, undefined, uvs).freezeWorldMatrix()
}

// A branch road sits a few millimetres lower so it joins another without flicker, and its centreline can stop
// short of the junction.
export function createRoad(meshes: MeshFactory, points: readonly Point[], width: number = roadSurface.width, { lift = 0, marked = points }: { lift?: number, marked?: readonly Point[] } = {}) {
  return {
    shoulder: ribbon(meshes, 'Road shoulder', [points], width + roadSurface.shoulderWidth, roadSurface.shoulder + lift, meshes.paintSurface('gravel'), roadFinish.gravelTile),
    asphalt: ribbon(meshes, 'Asphalt', [points], width, roadSurface.asphalt + lift, meshes.paintSurface('stone', roadFinish.asphalt), roadFinish.asphaltTile),
    markings: ribbon(meshes, 'Centerline', laneMarkings(marked), laneMarkingModel.width, laneMarkingModel.y + lift, laneMarkingModel.color),
  }
}

function trailSamples(points: readonly Point[]) {
  return points.flatMap((p, i) => {
    const next = points[i + 1]
    if (!next) return [p]
    const steps = Math.ceil(Math.hypot(next.x - p.x, next.z - p.z) / trailSampleSpacing)
    return Array.from({ length: steps }, (_, j) => ({
      x: p.x + (next.x - p.x) * j / steps,
      z: p.z + (next.z - p.z) * j / steps,
    }))
  })
}

function gravelTrail(meshes: MeshFactory, name: string, points: readonly Point[], width: number, heightAt: (p: Point) => number, material: Material) {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = []
  const path = trailSamples(points)
  const { lanes, startTaper, endTaper, edgeSine, edgeCosine, widthMinimum, widthRamp, tint } = gravelTrailModel
  const end = path[path.length - 1]
  let along = 0
  for (const [i, point] of path.entries()) {
    const prev = path[Math.max(0, i - 1)], next = path[Math.min(i + 1, path.length - 1)]
    const dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz)
    along += Math.hypot(point.x - prev.x, point.z - prev.z)
    const tip = Math.min(1, along / startTaper, Math.hypot(point.x - end.x, point.z - end.z) / endTaper)
    for (const [j, lane] of lanes.entries()) {
      const ripple = edgeSine.amplitude * Math.sin(along * edgeSine.rate + lane) + edgeCosine.amplitude * Math.cos(along * edgeCosine.rate - lane)
      const spread = lane * (width * half + ripple) * (widthMinimum + widthRamp * tip)
      const x = point.x - dz / length * spread, z = point.z + dx / length * spread
      positions.push(x, heightAt({ x, z }) + trailLift, z)
      uvs.push(x, z)
      const edge = Math.abs(lane)
      colors.push(1, tint.green, tint.blue - tint.blueEdgeLoss * edge, edge === 1 ? 0 : tip)
      if (i && j) {
        const d = i * lanes.length + j
        indices.push(d - lanes.length - 1, d - 1, d - lanes.length, d - lanes.length, d - 1, d)
      }
    }
  }
  const trail = meshes.surface(name, positions, indices, material, undefined, uvs)
  trail.setVerticesData(VertexBuffer.ColorKind, colors)
  trail.hasVertexAlpha = true
  return trail.freezeWorldMatrix()
}

function wornPath(meshes: MeshFactory, name: string, points: readonly Point[], width: number, heightAt: (p: Point) => number) {
  const vertices: number[] = [], colors: number[] = [], faces: number[] = []
  const path = trailSamples(points)
  const { lanes, startTaper, endTaper, edgeSine, edgeCosine, widthMinimum, widthRamp, sway, lift, sandFade, wear: patina, color, opacityEdgeCurve } = wornTrailModel
  let along = 0
  const length = path.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z) : sum, 0)
  for (const [i, p] of path.entries()) {
    const before = path[Math.max(0, i - 1)], after = path[Math.min(path.length - 1, i + 1)]
    along += Math.hypot(p.x - before.x, p.z - before.z)
    const span = Math.hypot(after.x - before.x, after.z - before.z)
    const end = Math.min(1, along / startTaper, (length - along) / endTaper)
    for (const [j, lane] of lanes.entries()) {
      const side = Math.sign(lane)
      const widthVariation = 1 + edgeSine.amplitude * Math.sin(along * edgeSine.rate + side * edgeSine.phase) + edgeCosine.amplitude * Math.cos(along * edgeCosine.rate - side)
      const offset = width * (half * lane * widthVariation * (widthMinimum + widthRamp * end) + sway.amplitude * Math.sin(along * sway.rate))
      const x = p.x + offset * (before.z - after.z) / span, z = p.z + offset * (after.x - before.x) / span
      vertices.push(x, heightAt({ x, z }) + lift, z)
      const { sand, rock } = coastalSurface({ x, z })
      const grass = 1 - smoothstep((sand + rock - sandFade.start) / sandFade.span)
      const wear = (patina.base + patina.slow.amplitude * Math.sin(along * patina.slow.rate + lane) + patina.fast.amplitude * Math.sin(along * patina.fast.rate - lane)) * end
      colors.push(...color, (1 - Math.abs(lane) ** opacityEdgeCurve) * wear * grass)
      if (i && j) {
        const d = i * lanes.length + j
        faces.push(d - lanes.length - 1, d - 1, d - lanes.length, d - lanes.length, d - 1, d)
      }
    }
  }
  const mesh = meshes.surface(name, vertices, faces, meshes.paint('#ffffff'))
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.hasVertexAlpha = true
  return mesh.freezeWorldMatrix()
}

export function createTrail(meshes: MeshFactory, name: string, points: readonly Point[], width: number, surface: PathSurface = 'gravel', heightAt: (p: Point) => number = () => 0, material?: Material) {
  if (surface === 'desire') return wornPath(meshes, name, points, width, heightAt)
  if (surface === 'gravel' && material) return gravelTrail(meshes, name, points, width, heightAt, material)
  const paved = surface === 'pavement'
  return ribbon(meshes, name, [points], width, trailLift, material ?? meshes.paintSurface(paved ? 'concrete' : 'gravel'), material ? 1 : paved ? roadFinish.pavingTile : roadFinish.gravelPathTile, heightAt)
}

export function createSidewalk(meshes: MeshFactory, path: { name: string, points: readonly Point[], width: number }, material = meshes.paintSurface('concrete')) {
  // The sidewalk continues across the beach approach at the Seabrook junction.
  return ribbon(meshes, path.name, [path.points], path.width, sidewalkLift, material, roadFinish.pavingTile)
}
