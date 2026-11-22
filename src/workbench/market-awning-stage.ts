import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCrew } from '../assets/crew'
import { createMarketAwning } from '../assets/market-awning'
import { marketAwningGeometry } from '../assets/geometry/market-awning'
import type { MeshFactory } from '../island-meshes'
import { marketAwningSite, marketRunoffCurtain, marketRunoffLaneX } from '../worlds/starter/market-awning'

const half = 0.5
const wallDepth = 0.28
const wallHeight = 3.34
const wallEdge = 0.16
const wetness = 0.63
const runwayZ = 0.44
const runwayDepth = 0.56
const runwayThickness = 0.018
const splashLift = 0.004
const crewX = -0.99
const crewZ = 0.06

export function createMarketRunoffStage(meshes: MeshFactory) {
  const { back, base, hem } = marketAwningSite
  const { halfWidth } = marketAwningGeometry
  const origin = new TransformNode('Seabrook awning stage', meshes.scene)
  origin.position.set(-marketRunoffCurtain.x, -base, -hem.z)
  const wetCloth = createMarketAwning(meshes, origin)
  wetCloth(wetness)

  const backZ = back.z + origin.position.z
  meshes.box(0, wallHeight * half, backZ - wallDepth * half, (halfWidth + wallEdge) / half, wallHeight, wallDepth, '#b19a76')
  createCrew(meshes, 1).root.position.set(crewX, 0, crewZ)
  const curtain = {
    x: marketRunoffCurtain.x + origin.position.x,
    y: marketRunoffCurtain.y + origin.position.y,
    z: marketRunoffCurtain.z + origin.position.z,
    floor: marketRunoffCurtain.floor + origin.position.y,
  }
  meshes.box(0, curtain.floor - runwayThickness * half, runwayZ, halfWidth / half, runwayThickness, runwayDepth, '#508a8b', undefined, false)
  const laneX = (index: number) => marketRunoffLaneX(index) + origin.position.x

  return {
    curtain,
    runoffLane: (index: number) => ({ ...curtain, x: laneX(index) }),
    runway: (index: number) => ({ x: laneX(index), y: curtain.floor + splashLift, z: runwayZ }),
  }
}
