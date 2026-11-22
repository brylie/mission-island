import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { Ore } from '../ore-contracts'
import { seededRandom } from '../seeded-random'
import { brokenOreStone, oreStockpileProfiles, oreTruckLoad, stockpileArtwork } from './geometry/ore-stockpile'
import { oreBayDivider, oreHopperModel } from './geometry/quarry-fixtures'
import { haulerSpec } from './ore-hauler'
import { facetBatch, type Corner } from './stone-facets'

type Position = { x: number, y: number, z: number }

const sides = [-1, 1] as const
const half = 0.5
const halfTurnsPerCircle = 2

function brokenStone(batch: ReturnType<typeof facetBatch>, x: number, y: number, z: number, radius: number, random: () => number, flatness: number) {
  const { fracture, foot: base, crown: cap, uvShift, shade } = brokenOreStone
  const edgeCount = fracture.minimumSides + Math.floor(random() * fracture.sideChoices)
  const turn = random() * Math.PI
  const lean = random() * halfTurnsPerCircle * Math.PI
  const cut = fracture.cut.base + fracture.cut.variation * random()
  const height = radius * flatness, phase = random() * uvShift, tone = shade.base + random() * shade.variation
  const foot: Corner[] = [], crown: Corner[] = []
  for (let i = 0; i < edgeCount; i++) {
    const angle = turn + (i + random() * fracture.cornerAngleJitter) * halfTurnsPerCircle * Math.PI / edgeCount
    const r = radius * (fracture.cornerRadius.base + fracture.cornerRadius.variation * random())
    const dx = r * Math.cos(angle), dz = r * Math.sin(angle)
    foot.push([x + dx, y - radius * base.dropPerRadius, z + dz * base.depthScale])
    crown.push([
      x + dx * (cap.widthScale + cut * cap.cutWidthGain) + radius * cap.xOffsetPerRadius,
      y + height * (cap.heightScale + cut * Math.cos(angle - lean)),
      z + dz * cap.depthScale,
    ])
  }
  batch.face(crown, tone, phase)
  for (let i = 0; i < edgeCount; i++) {
    const j = (i + 1) % edgeCount
    batch.face([foot[i], foot[j], crown[j], crown[i]], tone * (shade.sideScale + random() * shade.sideVariation), phase)
  }
}

export function createOreLoad(meshes: MeshFactory, parent: TransformNode, ore: Ore) {
  const pile = oreStockpileProfiles[ore]
  const random = seededRandom(pile.seed)
  const bed = haulerSpec.cargo
  const batch = facetBatch()
  const { grid, bedInset, crest, shade, looseStone } = oreTruckLoad
  // Two bucketfuls settle into uneven ridges just above the rails.
  const rows: Corner[][] = []
  for (let row = 0; row <= grid.rowSteps; row++) {
    const v = row / grid.rowSteps
    const points: Corner[] = []
    for (let col = 0; col <= grid.columnSteps; col++) {
      const u = col / grid.columnSteps
      const rise = Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
        * (crest.height + crest.rippleHeight * Math.cos(v * Math.PI * crest.rippleHalfTurns))
      const y = bed.floor + bed.height - bedInset.top + rise + random() * crest.heightJitter
      const x = (u - half) * (bed.width - bedInset.width), z = bed.z + (v - half) * (bed.length - bedInset.length)
      points.push([x, y, z])
      if (col && row) {
        const prev = rows[row - 1]
        batch.face([prev[col - 1], prev[col], points[col]], shade.base + random() * shade.variation)
        batch.face([prev[col - 1], points[col], points[col - 1]], shade.base + random() * shade.variation)
        const radius = pile.grain * (looseStone.radius.base + random() * looseStone.radius.variation)
        brokenStone(batch, x - looseStone.inset, y + looseStone.lift, z - looseStone.inset, radius, random, looseStone.flatness)
      }
    }
    rows.push(points)
  }
  return batch.mesh(meshes, ore + ' truck load', meshes.paintRecipe(ore), parent)
}

export function createOreHopper(meshes: MeshFactory, { x: cx, y: floor, z: cz }: Position) {
  const { shell, feed, cladding, frame, chute, ironFinish } = oreHopperModel
  const timber = meshes.paintSurface('wood', frame.finish)
  const iron = meshes.paint(ironFinish)
  const panels = facetBatch()
  function rim({ halfWidth, halfDepth, y, z = 0 }: { halfWidth: number, halfDepth: number, y: number, z?: number }): Corner[] {
    return [[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth]]
      .map(([dx, dz]) => [cx + dx, floor + y, cz + dz + z])
  }
  const mouth = rim(shell.mouth), shoulder = rim(shell.shoulder), top = rim(shell.top)
  for (let i = 0; i < mouth.length; i++) {
    const j = (i + 1) % mouth.length
    panels.face([mouth[i], mouth[j], shoulder[j], shoulder[i]], shell.shade.funnel)
    panels.face([shoulder[i], shoulder[j], top[j], top[i]], shell.shade.outside)
    // The inside wall is visible above the remaining load.
    panels.face([top[i], top[j], shoulder[j], shoulder[i]], shell.shade.inside)
  }
  panels.mesh(meshes, 'Slatecliff riveted hopper', meshes.paint(shell.finish))
  const load = facetBatch(), crown = rim(feed.rim)
  const [peakX, peakY, peakZ] = feed.peak
  const apex: Corner = [cx + peakX, floor + peakY, cz + peakZ]
  for (let i = 0; i < crown.length; i++) load.face([crown[i], crown[(i + 1) % crown.length], apex], feed.shade)
  load.mesh(meshes, 'Unsorted hopper feed', meshes.paintSurface('stone', feed.finish))
  const { railY, endRail, sideRail, upright, rivet } = cladding
  const { post, brace } = frame
  for (const side of sides) {
    for (const level of railY) {
      meshes.box(cx, floor + level, cz + side * endRail.z, ...endRail.size, iron)
      meshes.box(cx + side * sideRail.x, floor + level, cz, ...sideRail.size, iron)
    }
    for (const dx of upright.x) {
      meshes.box(cx + dx, floor + upright.y, cz + side * upright.z, ...upright.size, iron)
      for (const level of rivet.y) {
        meshes.box(cx + dx, floor + level, cz + side * rivet.z, ...rivet.size, rivet.finish)
      }
    }
    for (const dx of post.x) meshes.box(cx + dx, floor + post.y, cz + side * post.z, ...post.size, timber)
    meshes.box(cx, floor + brace.y, cz + side * brace.z, ...brace.size, timber).rotation.z = side * brace.tilt
  }
  // The chute falls toward the truck apron; raised cheeks retain the fines.
  const chuteZ = cz + chute.z
  meshes.box(cx, floor + chute.floor.y, chuteZ, chute.floor.width, chute.floor.thickness, chute.length, iron).rotation.x = chute.pitch
  for (const side of sides) {
    const { x, y, width, height } = chute.cheek
    meshes.box(cx + side * x, floor + y, chuteZ, width, height, chute.length, iron).rotation.x = chute.pitch
  }
}

export function createOreBayDividers(meshes: MeshFactory, placements: readonly Position[]) {
  const { timberFinish, courses, post } = oreBayDivider
  const wood = meshes.paintSurface('wood', timberFinish)
  for (const { x, y: floor, z } of placements) {
    for (let course = 0; course < courses.count; course++) {
      meshes.box(
        x,
        floor + courses.baseY + course * courses.rise,
        z + courses.baseZ + course * courses.setback,
        courses.width,
        courses.height,
        courses.baseLength - course * courses.lengthReduction,
        wood,
      )
    }
    for (const offset of post.z) meshes.box(x - post.xInset, floor + post.y, z + offset, ...post.size, post.finish)
  }
}

export function createStockpileMeshes(meshes: MeshFactory, id: Ore, point: (angle: number, t: number) => Corner, random: () => number) {
  const { grain, dust, host } = oreStockpileProfiles[id]
  const { fines: fineLayers, stones } = stockpileArtwork
  const ore = facetBatch(), waste = facetBatch(), fines = facetBatch()
  const samplesPerHalfRing = fineLayers.samplesPerRing * half
  let previous: Corner[] = []
  for (const t of fineLayers.contours) {
    const ring = Array.from({ length: fineLayers.samplesPerRing }, (_, i) => point(i * Math.PI / samplesPerHalfRing, t))
    for (let i = 0; previous.length && i < ring.length; i++) {
      const j = (i + 1) % ring.length
      fines.face([ring[i], ring[j], previous[i]], fineLayers.shade.base + random() * fineLayers.shade.variation)
      if (t > fineLayers.splitFacesAfter) {
        fines.face([ring[j], previous[j], previous[i]], fineLayers.shade.base + random() * fineLayers.shade.variation)
      }
    }
    previous = ring
  }
  fines.mesh(meshes, 'Slatecliff crusher fines', meshes.paintSurface('stone', dust))
  // Small broken faces pack the slopes. Coarser blocks roll to the toe,
  // with a handful of stray pieces on the apron in front of each bin.
  const { slope, spill, grain: grainSize, lift, oreShare, flatness } = stones
  const stoneCount = slope.count + spill.count
  for (let i = 0; i < stoneCount; i++) {
    const beyondToe = i >= slope.count
    const angle = beyondToe ? Math.PI * (spill.arcStartHalfTurns + random() * spill.arcSpanHalfTurns) : random() * Math.PI * halfTurnsPerCircle
    const t = beyondToe ? 1 + spill.reachBeyondToe * random() : Math.sqrt(random()) * slope.edgeFraction
    const [x, y, z] = point(angle, t)
    const size = grain * (grainSize.base + random() ** grainSize.power * grainSize.variation) * (grainSize.toeScale + grainSize.toeGain * t)
    brokenStone(random() < oreShare ? ore : waste, x, y + lift, z, size, random, flatness.base + random() * flatness.variation)
  }
  ore.mesh(meshes, 'Slatecliff sorted ore', meshes.paintRecipe(id))
  waste.mesh(meshes, 'Slatecliff broken host rock', meshes.paintSurface('stone', host))
}
