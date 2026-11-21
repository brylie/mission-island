import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { createRock, createTree } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function puddleFixture(meshes: MeshFactory): Fixture {
  const flagstone = meshes.paintSurface('stone', '#6d7772')
  for (const x of [-1.52, 1.52]) {
    meshes.box(x, -.05, 0, .63, .1, 2.08, flagstone)
    for (const z of [-.79, 0, .79]) meshes.box(x, .017, z, .6, .045, .72, '#667874')
  }
  meshes.cylinder(0, .012, 0, 2.63, 2.63, .023, 20, '#477b86', undefined, false).scaling.z = .67
  const crew = crewAt(meshes, -1.53, -.28)
  crew.root.rotation.y = .97
  return {
    sourceAt: () => ({ x: 0, y: .034, z: 0 }),
    accents: [{ id: 'puddle-rain', sourceAt: () => ({ x: -.21, y: 2.65, z: 0, floor: .03 }) }],
  }
}

export function windowFixture(meshes: MeshFactory): Fixture {
  const glass = '#354f59', wood = '#936b49'
  meshes.box(0, 1.54, -.1, 2.4, 1.64, .13, glass)
  for (const x of [-1.17, 0, 1.17]) meshes.box(x, 1.54, .001, .085, 1.72, .107, wood)
  for (const y of [.71, 2.38]) meshes.box(0, y, .017, 2.44, .09, .165, wood)
  for (const x of [-.93, .19]) {
    const light = meshes.box(x, 1.76, -.027, .076, .83, .011, '#4c6a73', undefined, false)
    light.rotation.z = -.33
  }
  meshes.box(0, .35, -.12, 2.68, .69, .26, '#777361')
  crewAt(meshes, -1.88, -.04)
  return { sourceAt: () => ({ x: 0, y: 1.72, z: -.016, floor: .79 }) }
}

export function sunbeamFixture(meshes: MeshFactory): Fixture {
  createTree(meshes, -1.55, -.84, 3.7, 0)
  createTree(meshes, 1.86, -.83, 3.3, 2)
  createRock(meshes, .83, .23, .55, -.41, true)
  crewAt(meshes, -1.21, .31, 1)
  const beam = new ShaderMaterial('Sunbeam', meshes.scene, {
    vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      varying vec2 beamUV;
      void main() {
        beamUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.);
      }
    `,
    fragmentSource: `
      precision mediump float;
      varying vec2 beamUV;
      void main() {
        float edge = pow(max(0., sin(beamUV.x * 3.141593)), 1.7);
        gl_FragColor = vec4(1., .83, .52, .25 * edge * (.38 + .62 * beamUV.y));
      }
    `,
  }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection'], needAlphaBlending: true })
  beam.backFaceCulling = false
  beam.disableDepthWrite = true
  meshes.surface('Sunbeam', [-1.08, .075, .09, 1.48, .075, .09, .78, 3.12, -.41, -.32, 3.12, -.41],
    [0, 1, 2, 0, 2, 3], beam, undefined, [0, 0, 1, 0, 1, 1, 0, 1])
  meshes.box(0, -.015, 0, 4.5, .03, 3.2, '#465649', undefined, false).receiveShadows = true
  return {
    sourceAt(time) {
      return { x: -.3 + time * .135, y: 1.23 + .27 * Math.cos(time * 2.3), z: .01 }
    },
  }
}

export function sandFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -.06, 0, 6, .12, 4.2, meshes.paintSurface('sand', '#bf9c6d'), undefined, false).receiveShadows = true
  createRock(meshes, 1.6, .33, 1.1, .85, false)
  createRock(meshes, -.7, -.52, .6, -.65, true)
  const crew = crewAt(meshes, .22, 1.15)
  crew.root.rotation.y = -1.05
  function sourceAt(time: number, index: number) {
    if (contactAge(time, .26, 1.12, .52) === undefined) return
    const lane = index % 2 ? -.65 : .4
    return { x: -2.08, y: .026, z: lane, speed: .88 + (index % 4) * .08 }
  }
  return { sourceAt, accents: [{ id: 'sand-haze', sourceAt: (time, index) => {
    const gust = sourceAt(time, index)
    if (gust) return { ...gust, y: .104 }
  } }] }
}

export function breathFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, 0, 0, 1)
  meshes.box(0, -.045, 0, 3.7, .09, 3.15, '#637773').receiveShadows = true
  createRock(meshes, -1.22, -.58, .71, .75, false)
  const heading = (time: number) => -.3 + Math.sin(time * 1.75) * .49
  return {
    sourceAt(time) {
      if (contactAge(time, .37, .97, .224) === undefined) return
      const yaw = heading(time)
      return { x: Math.sin(yaw) * .302, y: 1.38, z: Math.cos(yaw) * .302, yaw }
    },
    pose(time) {
      crew.root.rotation.y = heading(time)
    },
  }
}
