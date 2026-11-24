import type { Material } from '@babylonjs/core/Materials/material'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { roadKinds, roadNetwork } from './geometry/road-kinds'
import { dirtRoadModel, roadSurfaceModel } from './geometry/route-profiles'
import type { MeshFactory } from '../island-meshes'
import type { GradedRoad } from '../road-grading'
import type { RoadNetwork } from '../road-network'
import type { Point } from '../world'

// The graded roads' surface. Each road is a ribbon draped on the ground it was graded into,
// with points across it so it follows the crown, and darker wheel ruts. Where a road joins a
// paved one its first metres are an asphalt apron. Each junction also gets a patch traced from
// the grading's own formation shape, which fills the mouth and its rounded corners exactly where
// no ribbon lies, at the same height, so nothing overlaps, flickers or gaps.

interface RoadSurfaceSource {
  roads: () => GradedRoad[]
  network: () => RoadNetwork
  carriagewayAt: (point: Point) => { distance: number, formation: number, covered: number, paved: number }
}

const half = 0.5
const coordinates = 3
const corners = [[0, 0], [1, 0], [1, 1], [0, 1]] as const
const plain = [1, 1, 1] as const

function ribbon(road: GradedRoad, heightAt: (point: Point) => number, from: number, to: number, paved = false) {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = []
  const { ruts, lift, tint } = dirtRoadModel
  // The carriageway's lanes, and a verge lane each side out to the formation's edge.
  const verge = road.halfFormation / road.halfWidth
  const lanes = [-verge, ...dirtRoadModel.lanes, verge]
  const rows = road.profile.slice(from, to)
  rows.forEach((sample, i) => {
    for (const [j, lane] of lanes.entries()) {
      const spread = lane * road.halfWidth
      const x = sample.x - sample.dz * spread, z = sample.z + sample.dx * spread
      positions.push(x, heightAt({ x, z }) + lift, z)
      uvs.push(x * roadSurfaceModel.uvPerMetre, z * roadSurfaceModel.uvPerMetre)
      // Asphalt shows no ruts; earth is tinted, darker in the ruts, at the edges and on the verge.
      const edgeShade = Math.abs(lane) === 1 ? tint.edge : tint.crown
      const earthShade = Math.abs(lane) > 1 ? tint.verge : Math.abs(Math.abs(lane) - ruts) < Number.EPSILON ? tint.rut : edgeShade
      colors.push(...(paved ? plain : earthShade), 1)
      if (i && j) {
        const d = i * lanes.length + j
        indices.push(d - lanes.length - 1, d - 1, d - lanes.length, d - lanes.length, d - 1, d)
      }
    }
  })
  return { positions, indices, uvs, colors }
}

// The rows of a road that make an asphalt apron where it joins a paved road: its first or last
// metres, ending at a row so the apron and the earth share their seam.
function apronRows(road: GradedRoad, network: RoadNetwork) {
  const index = network.roads.findIndex((other) => other.id === road.id)
  const pavedAt = (end: 'start' | 'end') => network.junctions.some((join) => join.branch === index && join.end === end && !roadKinds[network.roads[join.host].kind].graded)
  const { profile } = road
  const start = pavedAt('start') ? profile.findIndex((sample) => sample.along - profile[0].along > roadNetwork.apronM) : 0
  const endFrom = pavedAt('end') ? profile.findLastIndex((sample) => profile[profile.length - 1].along - sample.along > roadNetwork.apronM) : profile.length - 1
  return { start: Math.max(0, start), end: Math.min(profile.length - 1, endFrom) }
}

// Keeps the part of a polygon where a field is at or below zero, cutting each edge where the
// field crosses zero so the outline follows the field smoothly rather than in steps.
function clip(polygon: readonly Point[], field: (point: Point) => number) {
  const values = polygon.map(field)
  const kept: Point[] = []
  polygon.forEach((point, k) => {
    const next = (k + 1) % polygon.length
    if (values[k] <= 0) kept.push(point)
    if ((values[k] <= 0) !== (values[next] <= 0)) {
      const t = values[k] / (values[k] - values[next])
      kept.push({ x: point.x + (polygon[next].x - point.x) * t, z: point.z + (polygon[next].z - point.z) * t })
    }
  })
  return kept
}

const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((value, k) => value + (b[k] - value) * Math.min(1, Math.max(0, t)))
// The lane nearest the edge that the ribbon tints as crown.
const innerLane = Math.max(...dirtRoadModel.lanes.filter((lane) => lane < 1))

// A patch point's earth tint, blended as the ribbon's lanes are: crown inside, edge at the
// carriageway's edge, verge at the formation's edge.
function patchTint({ distance, formation }: { distance: number, formation: number }, halfWidth: number) {
  const { crown, edge, verge } = dirtRoadModel.tint
  if (distance > 0) return mix(edge, verge, distance / Math.max(distance - formation, Number.EPSILON))
  return mix(edge, crown, -distance / ((1 - innerLane) * halfWidth))
}

// A junction's patch: the junction's formation, rounded corners and all, wherever no ribbon lies.
function junctionPatch(centre: Point, reach: number, halfWidth: number, source: RoadSurfaceSource, heightAt: (point: Point) => number) {
  const part = () => ({ positions: [] as number[], indices: [] as number[], uvs: [] as number[], colors: [] as number[] })
  const meshes = { earth: part(), asphalt: part() }
  const { patchCellM, lift } = roadSurfaceModel
  const inFormation = (point: Point) => source.carriagewayAt(point).formation
  const uncovered = (point: Point) => -source.carriagewayAt(point).covered
  for (let z = centre.z - reach; z < centre.z + reach; z += patchCellM) {
    for (let x = centre.x - reach; x < centre.x + reach; x += patchCellM) {
      const cell = corners.map(([i, j]) => ({ x: x + i * patchCellM, z: z + j * patchCellM }))
      const polygon = clip(clip(cell, inFormation), uncovered)
      if (polygon.length < coordinates) continue
      const middle = polygon.reduce((sum, point) => ({ x: sum.x + point.x / polygon.length, z: sum.z + point.z / polygon.length }), { x: 0, z: 0 })
      // Within the apron's reach of a paved road the patch is asphalt; elsewhere it is earth.
      const paved = source.carriagewayAt(middle).paved < roadNetwork.apronM
      const target = paved ? meshes.asphalt : meshes.earth
      const base = target.positions.length / coordinates
      for (const point of polygon) {
        target.positions.push(point.x, heightAt(point) + lift, point.z)
        target.uvs.push(point.x * roadSurfaceModel.uvPerMetre, point.z * roadSurfaceModel.uvPerMetre)
        target.colors.push(...(paved ? plain : patchTint(source.carriagewayAt(point), halfWidth)), 1)
      }
      for (let k = 1; k < polygon.length - 1; k++) target.indices.push(base, base + k, base + k + 1)
    }
  }
  return meshes
}

export function createRoadNetworkSurface(meshes: MeshFactory, source: RoadSurfaceSource, heightAt: (point: Point) => number, finishes: { earth: Material, asphalt: Material }) {
  const network = source.network()
  const roads = source.roads()
  const emit = (name: string, part: { positions: number[], indices: number[], uvs: number[], colors?: number[] }, material: Material) => {
    if (!part.indices.length) return
    const mesh = meshes.surface(name, part.positions, part.indices, material, undefined, part.uvs)
    if (part.colors) mesh.setVerticesData(VertexBuffer.ColorKind, part.colors)
    mesh.freezeWorldMatrix()
  }
  for (const road of roads) {
    const { start, end } = apronRows(road, network)
    emit(road.name, ribbon(road, heightAt, start, end + 1), finishes.earth)
    if (start > 0) emit(`${road.name} apron`, ribbon(road, heightAt, 0, start + 1, true), finishes.asphalt)
    if (end < road.profile.length - 1) emit(`${road.name} apron`, ribbon(road, heightAt, end, road.profile.length, true), finishes.asphalt)
  }
  for (const join of network.junctions) {
    const host = network.roads[join.host], at = host.samples[join.hostSample]
    const reach = roadKinds[host.kind].width * half + roadKinds[host.kind].shoulderWidth + roadNetwork.filletM + roadNetwork.mouthBlendM
    const patch = junctionPatch(at, reach, roadKinds[host.kind].width * half, source, heightAt)
    emit(`${network.roads[join.branch].name} junction`, patch.earth, finishes.earth)
    emit(`${network.roads[join.branch].name} junction`, patch.asphalt, finishes.asphalt)
  }
}
