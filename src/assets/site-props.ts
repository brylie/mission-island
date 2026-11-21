import type { Material } from '@babylonjs/core/Materials/material'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { sitePropGeometry } from './geometry/site-props'
import type { MeshFactory } from '../island-meshes'
import { surfaceRecipe, surfaceRepeatMeters } from './surface-recipes'
import { cylinderSurfaceUVs } from '../surface-uvs'
import { offset, type Point } from '../world'
import type { FeatureModel, SiteFeature } from '../worlds/site-feature'

type Position = readonly [x: number, y: number, z: number]
type BoxPart = { center: Position, size: readonly [width: number, height: number, depth: number] }
type RoundPart = { center: Position, size: readonly [topDiameter: number, baseDiameter: number, height: number] }

const half = 0.5
const quarterTurn = Math.PI * half
const sides = [-1, 1] as const
const alternatingPeriod = 2
const roundSegments = 10
const vertexComponents = 3
const firstTriangleCorner = 2
const slopeSampleDistance = 1
const slopeSampleSpan = slopeSampleDistance + slopeSampleDistance

function featurePieces(meshes: MeshFactory, root: TransformNode) {
  const { leaves } = sitePropGeometry.planter
  return {
    paintRecipe: meshes.paintRecipe,
    paintSurface: meshes.paintSurface,
    face: (vertices: number[], color: string) => {
      const indices = []
      for (let i = firstTriangleCorner; i < vertices.length / vertexComponents; i++) indices.push(0, i - 1, i)
      meshes.surface('Sandstone fracture', vertices, indices, color, root)
    },
    box: ({ center, size }: BoxPart, color: string) =>
      meshes.box(...center, ...size, color, root),
    round: ({ center, size }: RoundPart, color: string | Material) =>
      meshes.cylinder(...center, ...size, roundSegments, color, root),
    leaf: (center: Position, color: string) =>
      meshes.sphere(...center, ...leaves.size, color, root, false, leaves.segments),
  }
}

type Pieces = ReturnType<typeof featurePieces>
const wood = '#865d45', lightWood = '#cf9e68', metal = '#5c6964', linen = '#f0deaa'

const models: Record<FeatureModel, (parts: Pieces, color: string) => void> = {
  rack({ box, round }, color) {
    const { posts, beam, netWarps, netWefts, floats } = sitePropGeometry.rack
    for (const x of posts.x) box({ center: [x, posts.y, 0], size: posts.size }, wood)
    box(beam, lightWood)
    for (const x of netWarps.x) box({ center: [x, netWarps.y, netWarps.z], size: netWarps.size }, linen)
    for (const y of netWefts.y) box({ center: [0, y, netWefts.z], size: netWefts.size }, linen)
    for (const x of floats.x) round({ center: [x, floats.y, floats.z], size: floats.size }, color)
  },
  planter({ box, round, leaf }, color) {
    const { trough, rim, stalks, leaves, blossom } = sitePropGeometry.planter
    box(trough, wood)
    box(rim, lightWood)
    for (const [i, x] of stalks.x.entries()) {
      const height = stalks.baseHeight + i % stalks.variations * stalks.heightStep
      round({ center: [x, stalks.baseY + height * half, stalks.z], size: [...stalks.diameters, height] }, '#638851')
      for (const side of sides) {
        const blade = leaf(
          [x + side * leaves.xOffset, leaves.y + height * leaves.heightRatio, leaves.z + side * leaves.zOffset],
          side < 0 ? '#638c55' : '#8ba661',
        )
        blade.rotation.z = -side * leaves.tilt
        blade.rotation.y = i * leaves.turnStep
      }
      round({ center: [x, stalks.baseY + height, stalks.z], size: blossom }, color)
    }
  },
  crates({ box }, color) {
    const { body, positions, face, badge } = sitePropGeometry.crates
    for (const { x, y, z } of positions) {
      box({ center: [x, y, z], size: body }, wood)
      box({ center: [x, y, z - face.distance], size: face.size }, lightWood)
      box({ center: [x, y + badge.lift, z - badge.distance], size: badge.size }, color)
    }
  },
  bench({ box }, color) {
    const { feet, seat, backPosts, back } = sitePropGeometry.bench
    for (const x of feet.x) box({ center: [x, feet.y, 0], size: feet.size }, metal)
    box(seat, lightWood)
    for (const x of backPosts.x) box({ center: [x, backPosts.y, backPosts.z], size: backPosts.size }, metal)
    box(back, color)
  },
  splitstone({ face }, color) {
    // The flat opposing faces are a single fracture. Bedding dips the same
    // way on both sides, even where the shorter eastern fin has weathered away.
    const { fins, courses, bedding, cap } = sitePropGeometry.splitstone
    for (const fin of fins) {
      const ring = (level: number, width: number, capUndulation = 0) => fin.outline.map(([x, z]) => [
        fin.x + x * width + level * bedding.lean,
        level + x * bedding.xSlope + z * bedding.zSlope + (capUndulation ? capUndulation * Math.sin(x * cap.xFrequency + z) : 0),
        fin.z + z * width,
      ])
      const top = ring(fin.height, cap.width, cap.undulation)
      const layers = [...courses.map((course) => ({ points: ring(course.level, course.width), color: course.color ?? color })), { points: top, color }]
      for (let k = 1; k < layers.length; k++) {
        const low = layers[k - 1].points, high = layers[k]
        for (let a = 0; a < low.length; a++) {
          const b = (a + 1) % low.length
          face([...low[a], ...low[b], ...high.points[b], ...high.points[a]], high.color)
        }
      }
      face(top.flat(), '#ad9775')
    }
  },
  picnic({ box, round }, color) {
    // A low seat built into the rock, with a basket and folded cloth at one end.
    const { footings, seat, cloth, basket, basketBands, handleUprights, handleGrip } = sitePropGeometry.picnic
    for (const x of footings.x) box({ center: [x, footings.y, 0], size: footings.size }, '#817f6d')
    box(seat, lightWood)
    box(cloth, color)
    box(basket, '#b88655')
    for (const y of basketBands.y) box({ center: [basketBands.x, y, basketBands.z], size: basketBands.size }, '#dbb887')
    for (const x of handleUprights.offsets) round({
      center: [handleUprights.x + x, handleUprights.y, handleUprights.z],
      size: handleUprights.size,
    }, wood)
    box(handleGrip, wood)
  },
  benchmark({ round, box, paintRecipe, paintSurface }, color) {
    const { base, stone, cap, meridian, crossbar } = sitePropGeometry.benchmark
    const baseMesh = round(base, paintRecipe('lichen-clock'))
    baseMesh.scaling.z = base.depthScale
    const [, , height] = base.size
    cylinderSurfaceUVs(baseMesh, base.uvDiameter, height, surfaceRepeatMeters(surfaceRecipe('lichen-clock'), {}))
    round(stone, paintSurface('stone', '#a59e86')).scaling.z = stone.depthScale
    round(cap, color)
    box(meridian, '#d5b87d')
    box(crossbar, '#d5b87d')
  },
  log({ round }, color) {
    const { trunk, branch } = sitePropGeometry.log
    round(trunk, color).rotation.z = quarterTurn
    const twig = round(branch, wood)
    twig.rotation.z = branch.tilt
    twig.rotation.x = branch.rake
  },
  cairn({ round }, color) {
    const { stones, topDiameterRatio, depthScale } = sitePropGeometry.cairn
    for (const { x, y, width, height, turn } of stones) {
      const stone = round({ center: [x, y, 0], size: [width * topDiameterRatio, width, height] }, color)
      stone.scaling.z = depthScale
      stone.rotation.y = turn
    }
  },
  gauge({ box }, color) {
    const { pole, face, ticks } = sitePropGeometry.gauge
    box(pole, wood)
    box(face, color)
    for (let i = 0; i < ticks.count; i++) box({
      center: [ticks.x, ticks.startY + i * ticks.spacing, ticks.z],
      size: [i % alternatingPeriod ? ticks.short : ticks.long, ticks.height, ticks.depth],
    }, linen)
  },
  'tide-staff'(parts, color) {
    models.gauge(parts, color)
    const { box } = parts
    const { splice, clamps, frontMark, backMark } = sitePropGeometry['tide-staff']
    // A scarf repair and an old red high-water notch face the beach approach.
    box(splice, lightWood)
    for (const y of clamps.y) box({ center: [clamps.x, y, clamps.z], size: clamps.size }, '#52685e')
    box(frontMark, '#a95239')
    box(backMark, '#a95239')
  },
  marker({ box, round }, color) {
    const { base, post, cap, badge } = sitePropGeometry.marker
    box(base, metal)
    box(post, wood)
    box(cap, color)
    round(badge, linen)
  },
  shelter({ box }, color) {
    const { posts, roof, backSlats, seat, seatLegs, sign, signFace, signLines } = sitePropGeometry.shelter
    for (const x of posts.x) for (const z of posts.z) box({ center: [x, posts.y, z], size: posts.size }, wood)
    box(roof, color).rotation.x = roof.rake
    for (const y of backSlats.y) box({ center: [0, y, backSlats.z], size: backSlats.size }, lightWood)
    box(seat, lightWood)
    for (const x of sides) box({ center: [x, seatLegs.y, seatLegs.z], size: seatLegs.size }, metal)
    box(sign, wood)
    box(signFace, linen)
    for (let i = 0; i < signLines.count; i++) box({
      center: [signLines.x, signLines.firstY - i * signLines.step, signLines.z],
      size: signLines.size,
    }, metal)
  },
  lifebuoy({ box }, color) {
    const { post, hanger, ring } = sitePropGeometry.lifebuoy
    box(post, wood)
    box(hanger, metal)
    for (let i = 0; i < ring.segments; i++) {
      const angle = i * Math.PI / ring.angleDivisor
      const segment = box({
        center: [ring.radius * Math.cos(angle), ring.y + ring.radius * Math.sin(angle), ring.z],
        size: ring.size,
      }, i % ring.stripePeriod < ring.paleSegments ? linen : color)
      segment.rotation.z = angle
    }
  },
  scope({ box, round }, color) {
    const { base, post, barrel, glass } = sitePropGeometry.scope
    round(base, metal)
    round(post, wood)
    round(barrel, color).rotation.x = quarterTurn + barrel.elevation
    box(glass, '#537786')
  },
  rail({ box }, color) {
    const { posts, cap, crossbar } = sitePropGeometry.rail
    for (const x of posts.x) box({ center: [x, posts.y, 0], size: posts.size }, wood)
    box(cap, color)
    box(crossbar, lightWood)
  },
  pennant({ box, round }, color) {
    const { posts, cord, flags } = sitePropGeometry.pennant
    for (const x of posts.x) round({ center: [x, posts.y, 0], size: posts.size }, wood)
    box(cord, linen)
    for (const [index, x] of flags.x.entries()) {
      const alternate = index % alternatingPeriod
      box({ center: [x, flags.y + alternate * flags.stagger, 0], size: flags.size }, alternate ? linen : color)
    }
  },
  barrels({ round }, color) {
    const { bodies, walls, hoops, lid } = sitePropGeometry.barrels
    for (const { x, size } of bodies) {
      round({
        center: [x, size * walls.centerRatio, 0],
        size: [size * walls.topRatio, size * walls.baseRatio, size * walls.heightRatio],
      }, wood)
      for (const hoop of hoops) {
        const diameter = size * hoop.diameterRatio
        round({ center: [x, size * hoop.centerRatio, 0], size: [diameter, diameter, hoop.height] }, metal)
      }
      round({ center: [x, size * lid.centerRatio, 0], size: [size * lid.topRatio, size * lid.baseRatio, lid.height] }, color)
    }
  },
  hose({ box, round }, color) {
    const { uprights, beam, mounts, coils, nozzle } = sitePropGeometry.hose
    for (const x of uprights.x) box({ center: [x, uprights.y, 0], size: uprights.size }, metal)
    box(beam, color)
    for (const x of mounts.x) {
      round({ center: [x, mounts.y, mounts.z], size: mounts.size }, '#976d56').rotation.x = quarterTurn
      for (const { diameter, z } of coils.rings) {
        round({ center: [x, coils.y, z], size: [diameter, diameter, coils.width] }, color).rotation.x = quarterTurn
      }
      round({ center: [x + nozzle.xOffset, nozzle.y, nozzle.z], size: nozzle.size }, '#bcb99b').rotation.z = nozzle.tilt
    }
  },
}

export function poseSiteFeature(root: TransformNode, feature: SiteFeature, heightAt: (point: Point) => number) {
  root.position.set(feature.x, heightAt(feature), feature.z)
  root.rotation.y = feature.heading ?? 0
  if (feature.followSlope) {
    const pose = { ...feature, heading: root.rotation.y }
    const right = heightAt(offset(pose, slopeSampleDistance, 0))
    const left = heightAt(offset(pose, -slopeSampleDistance, 0))
    root.rotation.z = Math.atan2(right - left, slopeSampleSpan)
  }
  root.scaling.setAll(feature.scale ?? 1)
}

export function createSiteFeature(meshes: MeshFactory, feature: SiteFeature) {
  const root = new TransformNode(feature.name, meshes.scene)
  models[feature.model](featurePieces(meshes, root), feature.color)
  return root
}

export function placeSiteFeatures(meshes: MeshFactory, features: readonly SiteFeature[], heightAt: (point: Point) => number) {
  for (const feature of features) {
    const root = createSiteFeature(meshes, feature)
    poseSiteFeature(root, feature, heightAt)
    meshes.batchModel(root)
  }
}
