import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { workbenchSunbeamShader } from '../assets/effects/workbench-sunbeam'
import { breathStage, puddleStage, sandStage, sunbeamStage, windowStage } from '../assets/geometry/workbench-effect-fixtures'
import { createRock, createTree } from '../assets/props'
import { breathMotion, puddleSources, sandMotion, sunbeamMotion } from '../assets/recipes/workbench-effect-fixtures'
import { createSaltwindWindow, saltwindWindowRain, saltwindWindowRow } from '../assets/saltwind-window'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const halves = 2

export function puddleFixture(meshes: MeshFactory): Fixture {
  const { crew, flagstoneBase, flagstones, water } = puddleStage
  const base = meshes.paintSurface('stone', flagstoneBase.color)
  for (const x of flagstones.x) {
    meshes.box(x, flagstoneBase.y, 0, ...flagstoneBase.size, base)
    for (const z of flagstones.z) meshes.box(x, flagstones.y, z, ...flagstones.size, flagstones.color)
  }
  meshes.cylinder(0, water.y, 0, water.diameter, water.diameter, water.height, water.sides, water.color, undefined, false).scaling.z = water.depthScale
  crewAt(meshes, crew.x, crew.z).root.rotation.y = crew.heading
  return {
    sourceAt: () => ({ ...puddleSources.splash }),
    accents: [{ id: 'puddle-rain', sourceAt: () => ({ ...puddleSources.rain }) }],
  }
}

export function windowFixture(meshes: MeshFactory): Fixture {
  const { wall, crew } = windowStage
  const root = new TransformNode('Saltwind apartment window', meshes.scene)
  meshes.box(0, wall.height / halves, -wall.depth / halves, wall.width, wall.height, wall.depth, wall.color, root)
  createSaltwindWindow(meshes, root, 0, saltwindWindowRow.centreY, 0)
  crewAt(meshes, crew.x, crew.z)
  return { sourceAt: () => ({ x: 0, ...saltwindWindowRain }) }
}

export function sunbeamFixture(meshes: MeshFactory): Fixture {
  const { trees, rock, crew, ground, beam: beamShape } = sunbeamStage
  for (const tree of trees) createTree(meshes, tree.x, tree.z, tree.height, tree.variant)
  createRock(meshes, rock.x, rock.z, rock.size, rock.heading, true)
  crewAt(meshes, crew.x, crew.z, crew.id)
  const beam = new ShaderMaterial('Sunbeam', meshes.scene, workbenchSunbeamShader, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection'], needAlphaBlending: true })
  beam.backFaceCulling = false
  beam.disableDepthWrite = true
  meshes.surface('Sunbeam', [...beamShape.vertices], [...beamShape.triangles], beam, undefined, [...beamShape.uvs])
  meshes.box(0, ground.y, 0, ...ground.size, ground.color, undefined, false).receiveShadows = true
  const { x, xSpeed, y, bob, bobFrequency, z } = sunbeamMotion
  return {
    sourceAt: (time) => ({ x: x + time * xSpeed, y: y + bob * Math.cos(time * bobFrequency), z }),
  }
}

export function sandFixture(meshes: MeshFactory): Fixture {
  const { ground, rocks, crew } = sandStage
  meshes.box(0, ground.y, 0, ...ground.size, meshes.paintSurface('sand', ground.color), undefined, false).receiveShadows = true
  for (const rock of rocks) createRock(meshes, rock.x, rock.z, rock.size, rock.heading, rock.light)
  crewAt(meshes, crew.x, crew.z).root.rotation.y = crew.heading
  const { gust, source, hazeY } = sandMotion
  function sourceAt(time: number, index: number) {
    if (contactAge(time, ...gust) === undefined) return
    const [oddLane, evenLane] = source.driftLanes
    const z = index % halves ? oddLane : evenLane
    return { x: source.x, y: source.y, z, speed: source.speed + (index % source.speedSequence) * source.speedStep }
  }
  return {
    sourceAt,
    accents: [{ id: 'sand-haze', sourceAt: (time, index) => {
      const gust = sourceAt(time, index)
      if (gust) return { ...gust, y: hazeY }
    } }],
  }
}

export function breathFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, 0, 0, 1)
  const { ground, rock } = breathStage
  meshes.box(0, ground.y, 0, ...ground.size, ground.color).receiveShadows = true
  createRock(meshes, rock.x, rock.z, rock.size, rock.heading, false)
  const { heading: turn, exhale, mouth } = breathMotion
  const heading = (time: number) => turn.rest + Math.sin(time * turn.frequency) * turn.sweep
  return {
    sourceAt(time) {
      if (contactAge(time, ...exhale) === undefined) return
      const yaw = heading(time)
      return { x: Math.sin(yaw) * mouth.forward, y: mouth.height, z: Math.cos(yaw) * mouth.forward, yaw }
    },
    pose(time) {
      crew.root.rotation.y = heading(time)
    },
  }
}
