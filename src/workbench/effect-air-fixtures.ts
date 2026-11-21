import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { createRock, createTree } from '../assets/props'
import { createSaltwindWindow, saltwindWindowRain, saltwindWindowRow } from '../assets/saltwind-window'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function puddleFixture(meshes: MeshFactory): Fixture {
  const flagstone = meshes.paintSurface('stone', '#6d7772')
  for (const x of [-1.52, 1.52]) {
    meshes.box(x, -0.05, 0, 0.63, 0.1, 2.08, flagstone)
    for (const z of [-0.79, 0, 0.79]) meshes.box(x, 0.017, z, 0.6, 0.045, 0.72, '#667874')
  }
  meshes.cylinder(0, 0.012, 0, 2.63, 2.63, 0.023, 20, '#477b86', undefined, false).scaling.z = 0.67
  const crew = crewAt(meshes, -1.53, -0.28)
  crew.root.rotation.y = 0.97
  return {
    sourceAt: () => ({ x: 0, y: 0.034, z: 0 }),
    accents: [{ id: 'puddle-rain', sourceAt: () => ({ x: -0.21, y: 2.65, z: 0, floor: 0.03 }) }],
  }
}

export function windowFixture(meshes: MeshFactory): Fixture {
  const wallWidth = 2.55
  const wallHeight = 2.72
  const wallDepth = 0.18
  const root = new TransformNode('Saltwind apartment window', meshes.scene)
  meshes.box(0, wallHeight / 2, -wallDepth / 2, wallWidth, wallHeight, wallDepth, '#d4916b', root)
  createSaltwindWindow(meshes, root, 0, saltwindWindowRow.centreY, 0)
  crewAt(meshes, -1.6, -0.04)
  return { sourceAt: () => ({ x: 0, ...saltwindWindowRain }) }
}

export function sunbeamFixture(meshes: MeshFactory): Fixture {
  createTree(meshes, -1.55, -0.84, 3.7, 0)
  createTree(meshes, 1.86, -0.83, 3.3, 2)
  createRock(meshes, 0.83, 0.23, 0.55, -0.41, true)
  crewAt(meshes, -1.21, 0.31, 1)
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
  meshes.surface('Sunbeam', [-1.08, 0.075, 0.09, 1.48, 0.075, 0.09, 0.78, 3.12, -0.41, -0.32, 3.12, -0.41], [0, 1, 2, 0, 2, 3], beam, undefined, [0, 0, 1, 0, 1, 1, 0, 1])
  meshes.box(0, -0.015, 0, 4.5, 0.03, 3.2, '#465649', undefined, false).receiveShadows = true
  return {
    sourceAt(time) {
      return { x: -0.3 + time * 0.135, y: 1.23 + 0.27 * Math.cos(time * 2.3), z: 0.01 }
    },
  }
}

export function sandFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.06, 0, 6, 0.12, 4.2, meshes.paintSurface('sand', '#bf9c6d'), undefined, false).receiveShadows = true
  createRock(meshes, 1.6, 0.33, 1.1, 0.85, false)
  createRock(meshes, -0.7, -0.52, 0.6, -0.65, true)
  const crew = crewAt(meshes, 0.22, 1.15)
  crew.root.rotation.y = -1.05
  function sourceAt(time: number, index: number) {
    if (contactAge(time, 0.26, 1.12, 0.52) === undefined) return
    const lane = index % 2 ? -0.65 : 0.4
    return { x: -2.08, y: 0.026, z: lane, speed: 0.88 + (index % 4) * 0.08 }
  }
  return { sourceAt, accents: [{ id: 'sand-haze', sourceAt: (time, index) => {
    const gust = sourceAt(time, index)
    if (gust) return { ...gust, y: 0.104 }
  } }] }
}

export function breathFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, 0, 0, 1)
  meshes.box(0, -0.045, 0, 3.7, 0.09, 3.15, '#637773').receiveShadows = true
  createRock(meshes, -1.22, -0.58, 0.71, 0.75, false)
  const heading = (time: number) => -0.3 + Math.sin(time * 1.75) * 0.49
  return {
    sourceAt(time) {
      if (contactAge(time, 0.37, 0.97, 0.224) === undefined) return
      const yaw = heading(time)
      return { x: Math.sin(yaw) * 0.302, y: 1.38, z: Math.cos(yaw) * 0.302, yaw }
    },
    pose(time) {
      crew.root.rotation.y = heading(time)
    },
  }
}
