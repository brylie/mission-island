import { Color3 } from '@babylonjs/core/Maths/math.color'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import type { MarketRunoff } from './market-runoff'
import { market } from './farm'
import { createIslandMaterial } from './materials'
import { walkingHeight } from './terrain'

type Position = { x: number, y: number, z: number }
const back = { z: 5.075, y: 3.13 }
export const marketAwningHem = { z: 6.43, y: 2.87 }
const hem = marketAwningHem
const halfWidth = 1.465
const spout = { x: market.x - halfWidth - 0.045, y: 2.73, z: hem.z + 0.13 }
const splash = { x: spout.x - 0.031, z: spout.z }
const drain = { x: splash.x, z: 7.29 }
const gutterZ = hem.z + 0.057
const base = walkingHeight(splash)
const catchHeight = base + 0.032
const grateHeight = walkingHeight(drain) + 0.016

function clothHeight(z: number) {
  const t = (z - back.z) / (hem.z - back.z)
  return back.y + (hem.y - back.y) * t - 0.04 * Math.sin(t * Math.PI)
}

function between(meshes: MeshFactory, a: Position, b: Position, width: number, thickness: number, color: string) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
  const piece = meshes.box((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, width, thickness, Math.hypot(dx, dy, dz), color)
  piece.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0)
  return piece
}

function createAwning(meshes: MeshFactory) {
  const colors = [
    { dry: '#e5b087', wet: '#99765d' },
    { dry: '#bd654f', wet: '#844838' },
  ]
  const cloth = colors.map(({ dry, wet }, i) => {
    const material = createIslandMaterial(meshes.scene, 'Striped awning ' + i, dry)
    material.backFaceCulling = false
    return { material, dry: Color3.FromHexString(dry), wet: Color3.FromHexString(wet) }
  })
  const width = halfWidth * 2 / 7
  for (let stripe = 0; stripe < 7; stripe++) {
    const x = market.x - halfWidth + width * stripe
    const { material } = cloth[stripe % 2]
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= 6; i++) {
      const z = back.z + (hem.z - back.z) * i / 6
      const y = clothHeight(z)
      positions.push(x, y, z, x + width, y, z)
      if (i) indices.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2)
    }
    const panel = meshes.surface('Canvas awning stripe', positions, indices, material)
    meshes.shadows.addShadowCaster(panel)
    meshes.box(x + width / 2, hem.y - 0.057, hem.z - 0.0125, width - 0.007, 0.121 + (stripe % 2) * 0.009, 0.025, material)
    if (stripe === 6) continue
    for (let i = 0; i < 7; i++) {
      const z = 5.19 + i * 0.177
      meshes.box(x + width, clothHeight(z) + 0.004, z, 0.012, 0.008, 0.060, '#d6a482', undefined, false).rotation.x = 0.17
    }
  }
  const patchX = market.x - 1.16, patchZ = 5.52
  const patch = meshes.box(patchX, clothHeight(patchZ) + 0.013, patchZ, 0.25, 0.015, 0.22, '#d79a76')
  patch.rotation.x = 0.18
  patch.rotation.y = 0.085
  for (const dx of [-0.091, 0.10]) for (let i = 0; i < 3; i++) {
    const z = patchZ - 0.069 + i * 0.065
    meshes.box(patchX + dx, clothHeight(z) + 0.026, z, 0.036, 0.008, 0.015, '#f0ce9e', undefined, false).rotation.y = -0.25
  }
  for (const side of [-1, 1]) {
    const x = market.x + side * 1.33
    between(meshes, { x, y: clothHeight(5.15) - 0.092, z: 5.12 }, { x, y: hem.y - 0.078, z: hem.z }, 0.072, 0.089, '#805c49')
    between(meshes, { x, y: 2.52, z: 5.13 }, { x, y: 2.84, z: 5.92 }, 0.052, 0.058, '#977157')
  }
  return (amount: number) => {
    for (const { dry, wet, material } of cloth) Color3.LerpToRef(dry, wet, amount, material.diffuseColor)
  }
}

function gutterY(x: number) {
  return 2.783 + (x - spout.x) * 0.019
}

function createDrainage(meshes: MeshFactory) {
  const zinc = '#6a8e83'
  for (const [z, lift, width] of [[gutterZ, 0, 0.11], [gutterZ - 0.049, 0.040, 0.023], [gutterZ + 0.049, 0.036, 0.024]]) {
    const east = market.x + halfWidth + 0.035
    between(meshes, { x: spout.x, y: gutterY(spout.x) + lift, z }, { x: east, y: gutterY(east) + lift, z }, width, lift ? 0.069 : 0.031, zinc)
  }
  for (const x of [37.72, 38.73, 40.22]) {
    const bracket = x === 38.73 ? '#ba895e' : '#758072'
    meshes.box(x, gutterY(x) + 0.004, gutterZ, 0.045, 0.056, 0.143, bracket).name = 'Gutter strap'
    const rivet = meshes.cylinder(x, gutterY(x) + 0.026, gutterZ + 0.076, 0.025, 0.025, 0.014, 8, '#cfa277')
    rivet.rotation.x = Math.PI / 2
  }
  between(meshes, { x: spout.x + 0.028, y: 2.79, z: gutterZ }, spout, 0.096, 0.060, '#a77354')
  const linkLength = 0.267
  const firstLinkY = spout.y - 0.25
  const hanger = between(meshes, { ...spout, y: spout.y + 0.012 }, { ...spout, y: firstLinkY + linkLength / 2 - 0.016 }, 0.031, 0.030, '#876951')
  hanger.name = 'Rain chain hanger'
  const collar = meshes.cylinder(spout.x, spout.y - 0.035, spout.z, 0.065, 0.050, 0.049, 9, '#aa805d')
  collar.name = 'Rain chain collar'
  for (let link = 0; link < 9; link++) {
    const y = firstLinkY - link * 0.265
    meshes.box(spout.x, y, spout.z, 0.023, linkLength, 0.022, '#876951')
    if (link % 2 === 0) meshes.cylinder(spout.x, y - 0.058, spout.z, 0.090, 0.051, 0.062, 9, link === 4 ? '#759184' : '#aa805d')
  }

  const length = drain.z - splash.z
  between(meshes, { ...splash, y: catchHeight - 0.011 }, { ...drain, y: grateHeight - 0.011 }, 0.255, 0.018, '#827c6b')
  for (const side of [-1, 1]) {
    for (let stone = 0; stone < 5; stone++) {
      const z = splash.z + (stone + 0.47) * length / 5
      const y = catchHeight + (grateHeight - catchHeight) * (z - splash.z) / length
      meshes.box(splash.x + side * (0.16 + 0.011 * Math.sin(stone * 2)), y + 0.004, z, 0.092, 0.040, length / 5 - 0.009, stone % 2 ? '#b9aa89' : '#c8b99c').rotation.y = Math.sin(stone * 3) * 0.10
    }
  }
  meshes.box(splash.x, base + 0.014, splash.z - 0.03, 0.45, 0.033, 0.26, '#a69c83').name = 'Rain chain splash stone'
  meshes.box(drain.x, grateHeight - 0.004, drain.z, 0.36, 0.023, 0.25, '#545b54').name = 'Storm drain frame'
  for (let bar = -2; bar <= 2; bar++) meshes.box(drain.x, grateHeight + 0.012, drain.z + bar * 0.048, 0.319, 0.013, 0.018, '#9b9b82').name = 'Storm drain bar'
  const leaf = meshes.box(drain.x + 0.094, grateHeight + 0.024, drain.z - 0.03, 0.061, 0.008, 0.109, '#ac754c', undefined, false)
  leaf.name = 'Leaf caught on the grate'
  leaf.rotation.y = -0.46
}

function waterFilm(meshes: MeshFactory, name: string, puddle: boolean) {
  const material = new ShaderMaterial(name, meshes.scene, {
    vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      varying vec2 texCoord;
      void main() {
        texCoord = uv;
        gl_Position = worldViewProjection * vec4(position, 1.);
      }
    `,
    fragmentSource: `
      precision highp float;
      uniform float amount;
      uniform float time;
      uniform float wetArea;
      varying vec2 texCoord;
      void main() {
        vec2 p = (texCoord - .5) * 2.;
        float edge = mix(1., 1. - smoothstep(.48, 1., length(p) + .08 * sin(6. * p.x + 3. * p.y)), wetArea);
        float wave = sin(texCoord.y * 67. - time * 11. + sin(texCoord.x * 13. - time * 2.2) * 1.1);
        float shine = smoothstep(.58, .98, wave);
        vec3 base = mix(vec3(.49, .69, .73), vec3(.21, .34, .35), wetArea);
        vec3 glint = mix(vec3(.84, .94, .89), vec3(.56, .73, .72), wetArea);
        gl_FragColor = vec4(mix(base, glint, shine * .36), edge * amount * (.50 + shine * .26));
      }
    `,
  }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'amount', 'time', 'wetArea'], needAlphaBlending: true })
  material.backFaceCulling = false
  material.setFloat('wetArea', Number(puddle))
  return material
}

const quad = [0, 1, 2, 1, 3, 2]
const quadUV = [0, 0, 0, 1, 1, 0, 1, 1]

function flatFilm(meshes: MeshFactory, name: string, a: Position, b: Position, width: number, puddle: boolean) {
  const material = waterFilm(meshes, name, puddle)
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  const dx = (b.z - a.z) * width / (2 * length)
  const dz = (a.x - b.x) * width / (2 * length)
  const mesh = meshes.surface(name, [
    a.x - dx,
    a.y,
    a.z - dz,
    b.x - dx,
    b.y,
    b.z - dz,
    a.x + dx,
    a.y,
    a.z + dz,
    b.x + dx,
    b.y,
    b.z + dz,
  ], quad, material, undefined, quadUV)
  mesh.setEnabled(false)
  return (amount: number, time: number) => {
    mesh.setEnabled(amount > 0.012)
    material.setFloat('amount', amount)
    material.setFloat('time', time)
  }
}

function createStream(meshes: MeshFactory) {
  const material = waterFilm(meshes, 'Water spilling down the rain chain', false)
  const positions: number[] = [], indices: number[] = [], uv: number[] = []
  for (let level = 0; level < 4; level++) {
    const t = level / 3, radius = 0.013 + 0.013 * t
    for (let i = 0; i <= 8; i++) {
      const angle = i * Math.PI / 4, index = level * 9 + i
      positions.push(Math.sin(angle) * radius - 0.026 * t, spout.y + (catchHeight - spout.y) * t, Math.cos(angle) * radius)
      uv.push(i / 8, t)
      if (level && i) indices.push(index - 10, index - 9, index - 1, index - 9, index, index - 1)
    }
  }
  const mesh = meshes.surface('Rain chain stream', positions, indices, material, undefined, uv)
  mesh.position.set(spout.x - 0.022, 0, spout.z + 0.030)
  mesh.setEnabled(false)
  return (amount: number, time: number) => {
    mesh.setEnabled(amount > 0.018)
    mesh.scaling.set(0.68 + 0.53 * amount, 1, 0.68 + 0.53 * amount)
    material.setFloat('amount', amount)
    material.setFloat('time', time)
  }
}

function createDrops(meshes: MeshFactory) {
  const root = new TransformNode('Market rain droplets', meshes.scene)
  const material = createIslandMaterial(meshes.scene, 'Reflected sky on water drops', '#afd5d4', true)
  const splashWater = createIslandMaterial(meshes.scene, 'Water ripples', '#aad2ca', true)
  splashWater.alpha = 0.72
  const drops = Array.from({ length: 4 }, (_, i) =>
    meshes.sphere(spout.x - 0.06, 0, spout.z + 0.039 + i * 0.008, 0.032, 0.078, 0.032, material, root, false))
  const beads = Array.from({ length: 18 }, (_, i) => {
    const x = market.x + (Math.sin(i * 28.21) * 0.5) * 2.65
    const z = back.z + 0.12 + (0.5 + 0.5 * Math.sin(i * 17.26)) * 1.12
    const mesh = meshes.sphere(x, 0, z, 0.032, 0.022, 0.036, material, root, false, 4)
    return { mesh, y: clothHeight(z), phase: (i * 0.691) % 1 }
  })
  const rings = [0, 1, 2].map(() => {
    const positions: number[] = [], indices: number[] = []
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16
      for (const radius of [0.42, 0.50]) positions.push(radius * Math.cos(angle), 0, radius * Math.sin(angle))
      const a = i * 2, b = (a + 2) % 64
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
    return meshes.surface('Splash ring', positions, indices, splashWater, root)
  })
  return (time: number, state: MarketRunoff) => {
    const rhythm = time * 1.37
    drops.forEach((mesh, i) => {
      const progress = (rhythm + i * 0.261) % 1
      mesh.setEnabled(progress < 0.94 && ((i === 0 && state.drip > 0.11) || (i < 2 && state.drip > 0.64) || state.stream > 0.42))
      mesh.position.y = spout.y - (spout.y - catchHeight) * progress ** 2
    })
    for (const { mesh, y, phase } of beads) {
      const strike = (time * 3.3 + phase) % 1
      mesh.setEnabled(strike < 0.19 * state.rain)
      mesh.position.y = y + 0.018 + strike * 0.19
    }
    rings.forEach((ring, i) => {
      const spread = (rhythm + i * 0.261 + 0.098) % 1
      ring.setEnabled(spread < 0.51 && i < (state.stream > 0.3 ? 3 : state.drip > 0.11 ? 1 : 0))
      ring.position.set(splash.x - 0.033, catchHeight + 0.012 - i * 0.002, splash.z + 0.023)
      const radius = 0.075 + 0.47 * spread
      ring.scaling.set(radius, 1, radius * 0.90)
    })
  }
}

export function createMarketShower(meshes: MeshFactory) {
  const wetCloth = createAwning(meshes)
  createDrainage(meshes)
  const stream = createStream(meshes)
  const droplets = createDrops(meshes)
  const patch = flatFilm(meshes, 'Pooled water beside the market path', { ...splash, y: catchHeight + 0.004, z: splash.z - 0.15 }, { ...splash, y: catchHeight - 0.004, z: splash.z + 0.44 }, 0.47, true)
  const gutter = flatFilm(meshes, 'Water in the sloped gutter', { x: market.x + 1.36, y: gutterY(market.x + 1.36) + 0.020, z: gutterZ }, { x: spout.x + 0.03, y: gutterY(spout.x + 0.03) + 0.023, z: gutterZ }, 0.066, false)
  const trickle = flatFilm(meshes, 'Water running to the grate', { ...splash, y: catchHeight + 0.007 }, { ...drain, y: grateHeight + 0.006, z: drain.z - 0.12 }, 0.113, false)
  let canvasWetness = 0
  return (time: number, camera: Position, state: MarketRunoff) => {
    const distance = Math.hypot(camera.x - market.x, camera.y - hem.y, camera.z - market.z)
    const nearby = Math.max(0, Math.min(1, (28 - distance) / 7))
    if (canvasWetness !== state.canvas) {
      canvasWetness = state.canvas
      wetCloth(canvasWetness)
    }
    stream(state.stream * nearby, time)
    patch(state.puddle * nearby, time)
    gutter(state.stream * nearby * 0.8, time)
    trickle(Math.max(state.stream, state.drip * 0.24) * nearby, time)
    droplets(time, { ...state, rain: state.rain * nearby, stream: state.stream * nearby, drip: state.drip * nearby })
  }
}
