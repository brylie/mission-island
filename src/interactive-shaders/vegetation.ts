import { dappleFragment, reedsFragment, lichenFragment, flowersDeform, flowersFragment, footprintFragment } from '../assets/effects/interactive-vegetation'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { lichenStoneProfile } from '../assets/geometry/site-props'
import { canopyDappleGrid, foldingFlowers, footprintModel, reedStudyModel, ridgeLichenSegments } from '../assets/geometry/interactive-shader-models'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { groundHeight } from '../terrain'
import type { Pose } from '../world'
import { ridgeLichenRocks } from '../worlds/starter/sites'
import { boundaryFade, createEffect, grid, type Builder, type EffectFrame, type Place } from './render'

const half = 0.5
const fullTurn = Math.PI + Math.PI
const coordinatesPerVertex = 3
const mirroredVertices = 2
const petalShoulderRight = 2
const petalTip = 3
const sides = [-1, 1] as const

const dapple: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Canopy sunflecks', origin, { blend: 'alpha', bias: -1, fragment: `
    ${boundaryFade}` + dappleFragment })
  const { width, depth, divisions, studioLift, islandLift } = canopyDappleGrid
  grid(meshes, effect, 'Dapple on the forest floor', width, depth, divisions, (x, z) =>
    studio ? studioLift : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y + islandLift)
  return effect
}

const reeds: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Reed leaf transmission', origin, { blend: 'opaque', fragment: reedsFragment })
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
  const model = reedStudyModel
  const random = seededRandom(model.seed)
  for (let i = 0; i < model.blades; i++) {
    const x = (random() - half) * model.width, z = (random() - half) * model.depth
    const base = studio ? 0 : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y
    const angle = random() * fullTurn
    const leaf = model.length.base + random() * model.length.spread
    const width = model.bladeWidth.base + random() * model.bladeWidth.spread
    const dx = Math.cos(angle), dz = Math.sin(angle)
    const rootIndex = vertices.length / coordinatesPerVertex
    for (let j = 0; j <= model.sections; j++) {
      const v = j / model.sections
      const spread = width * (model.bladeWidth.edges + Math.sin(v * Math.PI) * model.bladeWidth.belly) * (1 - v * model.bladeWidth.point)
      const bend = v * v * leaf * model.bend
      for (const side of sides) {
        vertices.push(x + dz * bend + dx * spread * side, base + leaf * v - bend * model.bendDrop, z - dx * bend + dz * spread * side)
        uvs.push((side + 1) * half, v)
      }
      if (j) {
        const d = rootIndex + j * mirroredVertices, b = d - mirroredVertices
        indices.push(b, b + 1, d + 1, b, d + 1, d)
      }
    }
  }
  meshes.surface('Reed clump', vertices, indices, effect.material, effect.root, uvs)
  return effect
}

const lichen: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Lichen hydration', origin, { blend: 'opaque', fragment: lichenFragment })
  const { centreHeightRatio, heightRatio, depthRatio, headingPerMetre } = lichenStoneProfile
  for (const [x, z, size] of ridgeLichenRocks) {
    const rock = meshes.sphere(x, size * centreHeightRatio, z, size, size * heightRatio, size * depthRatio, effect.material, effect.root, true, ridgeLichenSegments)
    rock.rotation.y = x * headingPerMetre
  }
  return effect
}

const flowers: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Meadow flower opening', origin, { blend: 'opaque', deform: flowersDeform, fragment: flowersFragment })
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
  const { count, width, depth, height: growth, stalk, center, petals, seed } = foldingFlowers
  const random = seededRandom(seed)
  for (let i = 0; i < count; i++) {
    const x = (random() - half) * width, z = (random() - half) * depth
    const height = growth.min + random() * growth.spread
    const base = studio ? 0 : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y
    const y = base + height
    meshes.cylinder(x, base + height * half, z, stalk.top, stalk.bottom, height, stalk.sides, stalk.color, effect.root, false)
    meshes.sphere(x, y, z, ...center.size, center.color, effect.root, false, center.sides)
    for (let j = 0; j < petals.count; j++) {
      const direction = (j + random() * petals.angleJitter) / petals.count
      const a = direction * fullTurn
      const dx = Math.cos(a), dz = Math.sin(a)
      const b = vertices.length / coordinatesPerVertex
      const { shoulder, tip } = petals
      vertices.push(
        x,
        y,
        z,
        x + dx * shoulder.reach + dz * shoulder.halfWidth,
        y + shoulder.rise,
        z + dz * shoulder.reach - dx * shoulder.halfWidth,
        x + dx * shoulder.reach - dz * shoulder.halfWidth,
        y + shoulder.rise,
        z + dz * shoulder.reach + dx * shoulder.halfWidth,
        x + dx * tip.reach,
        y + tip.rise,
        z + dz * tip.reach,
      )
      uvs.push(0, direction, shoulder.uv, direction, shoulder.uv, direction, 1, direction)
      indices.push(b, b + 1, b + petalShoulderRight, b + 1, b + petalTip, b + petalShoulderRight)
    }
  }
  meshes.surface('Folding petals', vertices, indices, effect.material, effect.root, uvs)
  return effect
}

function makePrint(meshes: MeshFactory, origin: Place) {
  const print = createEffect(meshes, 'Sand pressure mark', origin, { blend: 'alpha', bias: -1, fragment: footprintFragment })
  grid(meshes, print, 'Heel and toe depressions', footprintModel.width, footprintModel.length)
  print.root.setEnabled(false)
  return print
}

const footprintBudget = 16
const expiredFootprint = -1000
const sidePeriod = 2
const maxStepGap = 3
const footprintStride = 0.59
const liveFootprintLift = 0.028
const previewFootprints = 9
const previewSwayRate = 0.37
const previewSway = 0.41
const previewAcrossBias = 0.24
const previewStride = 0.47
const previewStart = 1.88
const fieldTrailYaw = 0.70
const previewAgingStep = 0.48
const previewCycleSeconds = 8
const previewAgeScale = 0.8
const previewYawVariation = 0.30
const previewFootprintLift = 0.027
const minimumPrintLife = 1.1
const printLifeGain = 11.4
const rainErosion = 0.72
const basePrintOpacity = 0.44
const printOpacityGain = 0.56

export function createFootprintTrail(meshes: MeshFactory, origin: Place, studio: boolean) {
  const root = new TransformNode('Beach footprints', meshes.scene)
  const stamps = Array.from({ length: footprintBudget }, () => {
    const print = makePrint(meshes, origin)
    print.root.parent = root
    return { print, time: expiredFootprint }
  })
  let next = 0
  let previous: Pose | undefined

  function stamp(at: Pose, y: number, time: number) {
    const entry = stamps[next]
    const side = next % sidePeriod ? footprintModel.halfTrack : -footprintModel.halfTrack
    entry.print.root.position.set(at.x + Math.cos(at.heading) * side, y, at.z - Math.sin(at.heading) * side)
    entry.print.root.rotation.y = at.heading + side * footprintModel.toeOut
    entry.time = time
    next = (next + 1) % stamps.length
  }

  return {
    root,
    clear() {
      previous = undefined
      for (const stamp of stamps) stamp.time = expiredFootprint
    },
    step(at: Pose | undefined, time: number) {
      if (!at) {
        previous = undefined
        return
      }
      const gap = previous ? Math.hypot(previous.x - at.x, previous.z - at.z) : 0
      if (!previous || gap > maxStepGap) previous = at
      if (gap < footprintStride || gap > maxStepGap) return
      stamp(at, groundHeight(at) + liveFootprintLift, time)
      previous = at
    },
    pose(frame: EffectFrame, response: number, demo = Number(studio)) {
      if (demo) {
        next = 0
        for (let i = 0; i < previewFootprints; i++) {
          const across = Math.sin(i * previewSwayRate) * previewSway - previewAcrossBias
          const along = i * previewStride - previewStart
          const angle = studio ? 0 : fieldTrailYaw
          const x = origin.x + across * Math.cos(angle) + along * Math.sin(angle)
          const z = origin.z - across * Math.sin(angle) + along * Math.cos(angle)
          const age = ((frame.time + i * previewAgingStep) % previewCycleSeconds) * previewAgeScale
          stamp({ x, z, heading: angle + Math.cos(i * previewSwayRate) * previewYawVariation }, (studio ? origin.y : groundHeight({ x, z })) + previewFootprintLift, frame.time - age)
        }
      }
      const life = (minimumPrintLife + response * printLifeGain) * (1 - frame.weather.rain * rainErosion)
      for (const { print, time } of stamps) {
        const age = frame.time - time
        print.root.setEnabled(age >= 0 && age < life)
        if (print.root.isEnabled()) print.pose(frame, basePrintOpacity + response * printOpacityGain, age / life)
      }
    },
  }
}

export const vegetationBuilders = {
  'canopy-dapple': dapple,
  'reed-transmission': reeds,
  'sand-footprints': createFootprintTrail,
  'ridge-lichen': lichen,
  'closing-flowers': flowers,
}
