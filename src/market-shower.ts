import { Color3 } from '@babylonjs/core/Maths/math.color'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import type { MarketRunoff } from './market-runoff'
import { market } from './farm'
import { createIslandMaterial } from './materials'
import { walkingHeight } from './terrain'

type Position = { x: number; y: number; z: number }
const back = { z: 5.075, y: 3.13 }
const hem = { z: 6.43, y: 2.87 }
const halfWidth = 1.465
const spout = { x: market.x - halfWidth - .045, y: 2.73, z: hem.z + .13 }
const splash = { x: spout.x - .031, z: spout.z }
const drain = { x: splash.x, z: 7.29 }
const gutterZ = hem.z + .057
const base = walkingHeight(splash)
const catchHeight = base + .032
const grateHeight = walkingHeight(drain) + .016

function clothHeight(z: number) {
  const t = (z - back.z) / (hem.z - back.z)
  return back.y + (hem.y - back.y) * t - .04 * Math.sin(t * Math.PI)
}

function between(meshes: MeshFactory, a: Position, b: Position, width: number, thickness: number, color: string) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
  const piece = meshes.box((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2,
    width, thickness, Math.hypot(dx, dy, dz), color)
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
    meshes.box(x + width / 2, hem.y - .057, hem.z - .0125,
      width - .007, .121 + (stripe % 2) * .009, .025, material)
    if (stripe === 6) continue
    for (let i = 0; i < 7; i++) {
      const z = 5.19 + i * .177
      meshes.box(x + width, clothHeight(z) + .004, z, .012, .008, .060, '#d6a482', undefined, false).rotation.x = .17
    }
  }
  const patchX = market.x - 1.16, patchZ = 5.52
  const patch = meshes.box(patchX, clothHeight(patchZ) + .013, patchZ, .25, .015, .22, '#d79a76')
  patch.rotation.x = .18
  patch.rotation.y = .085
  for (const dx of [-.091, .10]) for (let i = 0; i < 3; i++) {
    const z = patchZ - .069 + i * .065
    meshes.box(patchX + dx, clothHeight(z) + .026, z, .036, .008, .015, '#f0ce9e', undefined, false).rotation.y = -.25
  }
  for (const side of [-1, 1]) {
    const x = market.x + side * 1.33
    between(meshes, { x, y: clothHeight(5.15) - .092, z: 5.12 }, { x, y: hem.y - .078, z: hem.z }, .072, .089, '#805c49')
    between(meshes, { x, y: 2.52, z: 5.13 }, { x, y: 2.84, z: 5.92 }, .052, .058, '#977157')
  }
  return (amount: number) => {
    for (const { dry, wet, material } of cloth) Color3.LerpToRef(dry, wet, amount, material.diffuseColor)
  }
}

function gutterY(x: number) {
  return 2.783 + (x - spout.x) * .019
}

function createDrainage(meshes: MeshFactory) {
  const zinc = '#6a8e83'
  for (const [z, lift, width] of [[gutterZ, 0, .11], [gutterZ - .049, .040, .023], [gutterZ + .049, .036, .024]]) {
    const east = market.x + halfWidth + .035
    between(meshes, { x: spout.x, y: gutterY(spout.x) + lift, z }, { x: east, y: gutterY(east) + lift, z },
      width, lift ? .069 : .031, zinc)
  }
  for (const x of [37.72, 38.73, 40.22]) {
    const bracket = x === 38.73 ? '#ba895e' : '#758072'
    meshes.box(x, gutterY(x) + .004, gutterZ, .045, .056, .143, bracket).name = 'Gutter strap'
    const rivet = meshes.cylinder(x, gutterY(x) + .026, gutterZ + .076, .025, .025, .014, 8, '#cfa277')
    rivet.rotation.x = Math.PI / 2
  }
  between(meshes, { x: spout.x + .028, y: 2.79, z: gutterZ }, spout, .096, .060, '#a77354')
  const linkLength = .267
  const firstLinkY = spout.y - .25
  const hanger = between(meshes, { ...spout, y: spout.y + .012 },
    { ...spout, y: firstLinkY + linkLength / 2 - .016 }, .031, .030, '#876951')
  hanger.name = 'Rain chain hanger'
  const collar = meshes.cylinder(spout.x, spout.y - .035, spout.z, .065, .050, .049, 9, '#aa805d')
  collar.name = 'Rain chain collar'
  for (let link = 0; link < 9; link++) {
    const y = firstLinkY - link * .265
    meshes.box(spout.x, y, spout.z, .023, linkLength, .022, '#876951')
    if (link % 2 === 0) meshes.cylinder(spout.x, y - .058, spout.z, .090, .051, .062, 9, link === 4 ? '#759184' : '#aa805d')
  }

  const length = drain.z - splash.z
  between(meshes, { ...splash, y: catchHeight - .011 }, { ...drain, y: grateHeight - .011 }, .255, .018, '#827c6b')
  for (const side of [-1, 1]) {
    for (let stone = 0; stone < 5; stone++) {
      const z = splash.z + (stone + .47) * length / 5
      const y = catchHeight + (grateHeight - catchHeight) * (z - splash.z) / length
      meshes.box(splash.x + side * (.16 + .011 * Math.sin(stone * 2)), y + .004, z,
        .092, .040, length / 5 - .009, stone % 2 ? '#b9aa89' : '#c8b99c').rotation.y = Math.sin(stone * 3) * .10
    }
  }
  meshes.box(splash.x, base + .014, splash.z - .03, .45, .033, .26, '#a69c83').name = 'Rain chain splash stone'
  meshes.box(drain.x, grateHeight - .004, drain.z, .36, .023, .25, '#545b54').name = 'Storm drain frame'
  for (let bar = -2; bar <= 2; bar++) meshes.box(drain.x, grateHeight + .012, drain.z + bar * .048,
    .319, .013, .018, '#9b9b82').name = 'Storm drain bar'
  const leaf = meshes.box(drain.x + .094, grateHeight + .024, drain.z - .03, .061, .008, .109, '#ac754c', undefined, false)
  leaf.name = 'Leaf caught on the grate'
  leaf.rotation.y = -.46
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
    a.x - dx, a.y, a.z - dz, b.x - dx, b.y, b.z - dz, a.x + dx, a.y, a.z + dz, b.x + dx, b.y, b.z + dz,
  ], quad, material, undefined, quadUV)
  mesh.setEnabled(false)
  return (amount: number, time: number) => {
    mesh.setEnabled(amount > .012)
    material.setFloat('amount', amount)
    material.setFloat('time', time)
  }
}

function createStream(meshes: MeshFactory) {
  const material = waterFilm(meshes, 'Water spilling down the rain chain', false)
  const positions: number[] = [], indices: number[] = [], uv: number[] = []
  for (let level = 0; level < 4; level++) {
    const t = level / 3, radius = .013 + .013 * t
    for (let i = 0; i <= 8; i++) {
      const angle = i * Math.PI / 4, index = level * 9 + i
      positions.push(Math.sin(angle) * radius - .026 * t, spout.y + (catchHeight - spout.y) * t,
        Math.cos(angle) * radius)
      uv.push(i / 8, t)
      if (level && i) indices.push(index - 10, index - 9, index - 1, index - 9, index, index - 1)
    }
  }
  const mesh = meshes.surface('Rain chain stream', positions, indices, material, undefined, uv)
  mesh.position.set(spout.x - .022, 0, spout.z + .030)
  mesh.setEnabled(false)
  return (amount: number, time: number) => {
    mesh.setEnabled(amount > .018)
    mesh.scaling.set(.68 + .53 * amount, 1, .68 + .53 * amount)
    material.setFloat('amount', amount)
    material.setFloat('time', time)
  }
}

function createDrops(meshes: MeshFactory) {
  const root = new TransformNode('Market rain droplets', meshes.scene)
  const material = createIslandMaterial(meshes.scene, 'Reflected sky on water drops', '#afd5d4', true)
  const splashWater = createIslandMaterial(meshes.scene, 'Water ripples', '#aad2ca', true)
  splashWater.alpha = .72
  const drops = Array.from({ length: 4 }, (_, i) =>
    meshes.sphere(spout.x - .06, 0, spout.z + .039 + i * .008, .032, .078, .032, material, root, false))
  const beads = Array.from({ length: 18 }, (_, i) => {
    const x = market.x + (Math.sin(i * 28.21) * .5) * 2.65
    const z = back.z + .12 + (.5 + .5 * Math.sin(i * 17.26)) * 1.12
    const mesh = meshes.sphere(x, 0, z, .032, .022, .036, material, root, false, 4)
    return { mesh, y: clothHeight(z), phase: (i * .691) % 1 }
  })
  const rings = [0, 1, 2].map(() => {
    const positions: number[] = [], indices: number[] = []
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16
      for (const radius of [.42, .50]) positions.push(radius * Math.cos(angle), 0, radius * Math.sin(angle))
      const a = i * 2, b = (a + 2) % 64
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
    return meshes.surface('Splash ring', positions, indices, splashWater, root)
  })
  return (time: number, state: MarketRunoff) => {
    const rhythm = time * 1.37
    drops.forEach((mesh, i) => {
      const progress = (rhythm + i * .261) % 1
      mesh.setEnabled(progress < .94 && (i === 0 && state.drip > .11 || i < 2 && state.drip > .64 || state.stream > .42))
      mesh.position.y = spout.y - (spout.y - catchHeight) * progress ** 2
    })
    for (const { mesh, y, phase } of beads) {
      const strike = (time * 3.3 + phase) % 1
      mesh.setEnabled(strike < .19 * state.rain)
      mesh.position.y = y + .018 + strike * .19
    }
    rings.forEach((ring, i) => {
      const spread = (rhythm + i * .261 + .098) % 1
      ring.setEnabled(spread < .51 && i < (state.stream > .3 ? 3 : state.drip > .11 ? 1 : 0))
      ring.position.set(splash.x - .033, catchHeight + .012 - i * .002, splash.z + .023)
      const radius = .075 + .47 * spread
      ring.scaling.set(radius, 1, radius * .90)
    })
  }
}

export function createMarketShower(meshes: MeshFactory) {
  const wetCloth = createAwning(meshes)
  createDrainage(meshes)
  const stream = createStream(meshes)
  const droplets = createDrops(meshes)
  const patch = flatFilm(meshes, 'Pooled water beside the market path',
    { ...splash, y: catchHeight + .004, z: splash.z - .15 },
    { ...splash, y: catchHeight - .004, z: splash.z + .44 }, .47, true)
  const gutter = flatFilm(meshes, 'Water in the sloped gutter',
    { x: market.x + 1.36, y: gutterY(market.x + 1.36) + .020, z: gutterZ },
    { x: spout.x + .03, y: gutterY(spout.x + .03) + .023, z: gutterZ }, .066, false)
  const trickle = flatFilm(meshes, 'Water running to the grate',
    { ...splash, y: catchHeight + .007 }, { ...drain, y: grateHeight + .006, z: drain.z - .12 }, .113, false)
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
    gutter(state.stream * nearby * .8, time)
    trickle(Math.max(state.stream, state.drip * .24) * nearby, time)
    droplets(time, { ...state, rain: state.rain * nearby, stream: state.stream * nearby, drip: state.drip * nearby })
  }
}
