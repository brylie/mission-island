import { pilingFragment, awningDeform, awningFragment, windowFragment, reflectorsFragment, ropeFragment } from '../assets/effects/interactive-surfaces'
import { parallaxWindow, rainCanvas, roadsideReflectors, ropeCoil } from '../assets/geometry/interactive-shader-models'
import { createDockPile } from '../assets/waterfront'
import { saltBloomPile } from './catalog'
import { card, createEffect, grid, type Builder } from './render'

const half = 0.5
const fullTurn = Math.PI + Math.PI

const piling: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Harborside salt efflorescence', origin, { blend: 'opaque', fragment: pilingFragment })
  const { bottom, top, diameter } = saltBloomPile
  const halfHeight = (top - bottom) * half
  createDockPile(meshes, { x: 0, z: 0, bottom: -halfHeight, top: halfHeight, diameter }, effect.material, effect.root)
  return effect
}

const awning: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Rain-weighted canvas', origin, { blend: 'opaque', deform: awningDeform, fragment: awningFragment })
  const { grid: canvas, posts, rail } = rainCanvas
  grid(meshes, effect, 'Canvas stretched to fixed edges', canvas.width, canvas.depth, canvas.divisions, (_x, z) => canvas.height - z * canvas.slope)
  for (const x of posts.x) {
    meshes.box(x, posts.lowY, posts.z, posts.width, posts.lowHeight, posts.width, posts.color, effect.root)
    meshes.box(x, posts.highY, -posts.z, posts.width, posts.highHeight, posts.width, posts.color, effect.root)
  }
  for (const z of rail.z) meshes.box(0, rail.height - z * canvas.slope, z, ...rail.size, rail.color, effect.root)
  return effect
}

const window: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Recessed glazed interior', origin, { blend: 'opaque', fragment: windowFragment })
  const { pane, upright, crossbar, mullion, walls } = parallaxWindow
  card(meshes, effect, 'Window pane', pane.width, pane.height)
  if (studio) {
    for (const x of upright.x) meshes.box(x, 0, upright.z, ...upright.size, upright.color, effect.root)
    for (const y of crossbar.y) meshes.box(0, y, crossbar.z, ...crossbar.size, crossbar.color, effect.root)
    meshes.box(0, 0, mullion.z, ...mullion.size, mullion.color, effect.root)
    for (const x of walls.x) meshes.box(x, 0, walls.z, ...walls.size, walls.color, effect.root)
  }
  return effect
}

const reflectors: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Glass-bead retroreflection', origin, { blend: 'opaque', fragment: reflectorsFragment })
  const { x: posts, body, heading, lens: lensShape } = roadsideReflectors
  for (const x of posts) {
    meshes.box(x, body.y, 0, ...body.size, body.color, effect.root, false).rotation.y = heading
    const lens = card(meshes, effect, 'Roadside bead inset', lensShape.width, lensShape.height)
    lens.rotation.y = heading
    lens.position.set(x - lensShape.xInset, lensShape.y, lensShape.z)
  }
  return effect
}

const rope: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Twisted jute fibers', origin, { blend: 'opaque', fragment: ropeFragment })
  const pos: number[] = [], uvs: number[] = [], indices: number[] = []
  const { sides, lengthSegments, turns, radius, taper, strandRadius, floor, rise } = ropeCoil
  const verticesPerRing = sides + 1
  for (let i = 0; i <= lengthSegments; i++) {
    const u = i / lengthSegments, a = u * fullTurn * turns
    const center = radius - u * taper
    for (let j = 0; j <= sides; j++) {
      const v = j / sides, turn = v * fullTurn
      const r = center + Math.cos(turn) * strandRadius
      pos.push(Math.cos(a) * r, floor + u * rise + Math.sin(turn) * strandRadius, Math.sin(a) * r)
      uvs.push(u, v)
      if (i && j) {
        const d = i * verticesPerRing + j, b = d - verticesPerRing
        indices.push(b - 1, d, b, b - 1, d - 1, d)
      }
    }
  }
  meshes.surface('Three turns of mooring rope', pos, indices, effect.material, effect.root, uvs)
  return effect
}

export const surfaceBuilders = {
  'timber-salt-bloom': piling,
  'awning-rain-load': awning,
  'window-parallax': window,
  'road-retroreflector': reflectors,
  'rope-fiber-sheen': rope,
}
