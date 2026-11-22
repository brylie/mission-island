import { rainbowFragment, embersFragment, lampHaloFragment, pollenDeform, moonFragment, pollenFragment } from '../assets/effects/light-and-water-studies'
import { emberBed, lampHaloCard, moonGlitterPath, pollenMotes, rainbowVolume } from '../assets/recipes/light-study-geometry'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { streetLampGeometry } from '../assets/geometry/site-props'
import { createStreetLamp } from '../assets/street-lamp'
import { seededRandom } from '../seeded-random'
import { groundHeight } from '../terrain'
import { card, createEffect, grid, type Builder } from './render'

const coordinatesPerVertex = 3
const half = 0.5
const diameterScale = 2
const moteAlphaLayer = 5

const rainbow: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Spectral spray arc', origin, { blend: 'add', fragment: rainbowFragment })
  card(meshes, effect, 'Fernfall spray volume', rainbowVolume.width, rainbowVolume.height, true)
  return effect
}

const embers: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Cooling ash and cracks', origin, { blend: 'alpha', bias: -1, fragment: embersFragment })
  grid(meshes, effect, 'Charred forest floor', emberBed.width, emberBed.depth, emberBed.divisions, (x, z) => studio ? emberBed.studioLift : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y + emberBed.groundLift)
  return effect
}

const lampHalo: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Lamplit raindrops', origin, { blend: 'add', fragment: lampHaloFragment })
  const veil = card(meshes, effect, 'Lamp halo and falling droplets', lampHaloCard.width, lampHaloCard.height, true)
  veil.position.y = lampHaloCard.y
  if (studio) {
    const { y, z } = streetLampGeometry.bulb
    createStreetLamp(meshes, { x: origin.x, y: origin.y - y, z: origin.z - z }, meshes.paint('#ffe2a2', true))
  }
  return effect
}

const pollen: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Meadow pollen drift', origin, { blend: 'add', deform: pollenDeform, fragment: pollenFragment })
  const positions: number[] = [], uvs: number[] = [], normals: number[] = [], indices: number[] = []
  const { volume, radius: moteSize, density, drift, corners, triangles, tilt } = pollenMotes
  const random = seededRandom(pollenMotes.seed)
  for (let i = 0; i < pollenMotes.count; i++) {
    const x = (random() - half) * volume.width, y = volume.baseY + random() * volume.height, z = (random() - half) * volume.depth
    const radius = moteSize.minimum + random() * moteSize.variation
    const seed = [random(), random() * density.variation + density.minimum, random() * drift.variation + drift.minimum]
    for (const dir of [-1, 1]) {
      const first = positions.length / coordinatesPerVertex
      for (const [u, v] of corners) {
        const edge = (u - half) * radius * diameterScale
        positions.push(x + edge, y + (v - half) * radius * diameterScale, z + dir * edge * tilt)
        uvs.push(u, v)
        normals.push(...seed)
      }
      for (const index of triangles) indices.push(first + index)
    }
  }
  const motes = meshes.surface('Seeded pollen motes', positions, indices, effect.material, effect.root, uvs)
  motes.setVerticesData(VertexBuffer.NormalKind, normals)
  motes.alphaIndex = moteAlphaLayer
  return effect
}

const moon: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Moonlit wave facets', origin, { blend: 'add', fragment: moonFragment })
  grid(meshes, effect, 'Glitter path', moonGlitterPath.width, moonGlitterPath.depth)
  return effect
}

export const lightBuilders = {
  'fernfall-rainbow': rainbow,
  'cooling-embers': embers,
  'streetlamp-droplets': lampHalo,
  'meadow-pollen': pollen,
  'moon-glitter': moon,
}
