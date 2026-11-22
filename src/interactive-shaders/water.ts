import { wakeFragment, wadingFragment, causticsFragment, rainRingsFragment, shearFragment } from '../assets/effects/light-and-water-studies'
import { causticBed, fernfallRibbons, rainFootprint, studyWake, wadingFootprint } from '../assets/recipes/water-study-geometry'
import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { fernfallSection, groundHeight, streamX } from '../terrain'
import { createEffect, grid, type Builder } from './render'

const normalizedLaneWidth = 2
const spillAlphaLayer = 5

const wake: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Kelvin wake', origin, { blend: 'alpha', fragment: wakeFragment })
  const wakeGrid = grid(meshes, effect, 'Wake behind the transom', studyWake.width, studyWake.depth)
  wakeGrid.bakeTransformIntoVertices(Matrix.Translation(0, 0, studyWake.z))
  return effect
}

const wading: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Wader impulse rings', origin, { blend: 'alpha', fragment: wadingFragment })
  grid(meshes, effect, 'Wading ring footprint', wadingFootprint.width, wadingFootprint.depth)
  return effect
}

const caustics: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Focused seabed light', origin, { blend: 'add', bias: -1, fragment: causticsFragment })
  grid(meshes, effect, 'Caustics on the bed', causticBed.width, causticBed.depth, causticBed.divisions, (x, z) => studio
    ? causticBed.studioY - causticBed.depression * Math.exp(-(x * x + z * z) * causticBed.falloff)
    : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y + causticBed.groundLift, -1)
  return effect
}

const rainRings: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Rain impacts on water', origin, { blend: 'alpha', fragment: rainRingsFragment })
  grid(meshes, effect, 'Rain disturbance footprint', rainFootprint.width, rainFootprint.depth)
  return effect
}

const shear: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Sheared spring spill', origin, { blend: 'alpha', fragment: shearFragment })
  const vertices: number[] = [], indices: number[] = [], uvs: number[] = []
  const { rows, columns, firstZ, run, studio: fixture, widthScale, aboveWater } = fernfallRibbons
  const stride = columns + 1
  for (let row = 0; row <= rows; row++) {
    const progress = row / rows
    const z = firstZ + progress * run
    const section = fernfallSection(z)
    for (let col = 0; col <= columns; col++) {
      const u = col / columns
      const lane = u * normalizedLaneWidth - 1
      const center = studio ? Math.sin(progress * fixture.waveFrequency) * fixture.waveWidth : streamX(z) - origin.x
      const y = studio ? (section.y + fixture.raise) * fixture.heightScale : section.y - origin.y
      const localZ = studio ? z - fixture.centreZ : z - origin.z
      vertices.push(center + lane * section.halfWidth * widthScale, y + aboveWater, localZ)
      uvs.push(u, progress)
      if (row && col) {
        const d = row * stride + col, b = d - stride
        indices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const spill = meshes.surface('Spill flow ribbons', vertices, indices, effect.material, effect.root, uvs)
  spill.alphaIndex = spillAlphaLayer
  return effect
}

export const waterBuilders = {
  'skiff-wake': wake,
  'wading-rings': wading,
  'seabed-caustics': caustics,
  'water-rain-rings': rainRings,
  'waterfall-shear': shear,
}
