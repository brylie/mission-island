import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'
import {
  dockTugBodywork,
  dockTugCab,
  dockTugChassis,
  dockTugDriver,
  dockTugFinishes as finish,
  dockTugRunningGear,
  type DockTugBox,
} from './geometry/dock-tug'

const half = 0.5
const quarterTurn = Math.PI * half

export function createDockTug(meshes: MeshFactory) {
  const { scene, box, cylinder } = meshes
  const root = new TransformNode('Three-wheel dock tug', scene)
  const addBox = (part: DockTugBox) => box(...part.center, ...part.size, finish[part.finish], root)

  const { frame, cargoBed, deck, rails, tailgate, bulkhead } = dockTugChassis
  addBox(frame)
  addBox(cargoBed)
  addBox(deck)
  for (const x of rails.x) box(x, rails.y, rails.z, ...rails.size, finish.enamel, root)
  addBox(tailgate)
  addBox(bulkhead)

  // An open driver's step separates the low load deck and the rounded nose.
  const { step, pedestal, seat, backrest } = dockTugDriver
  addBox(step)
  addBox(pedestal)
  addBox(seat)
  addBox(backrest).rotation.x = backrest.rake

  const { bonnet, bumper, grille, rear, headlights } = dockTugBodywork
  coastalProfile(meshes, root, 'Enamel motor bonnet', finish.enamel, bonnet.sections, bonnet.sides, bonnet.roundness)
  addBox(bumper)
  for (const y of grille.levels) box(0, y, grille.z, ...grille.size, finish.iron, root)
  for (const x of rear.x) {
    box(x, rear.taillight.y, rear.taillight.z, ...rear.taillight.size, finish.taillight, root)
    box(x, rear.fender.y, rear.fender.z, ...rear.fender.size, finish.enamel, root)
  }
  for (const x of headlights.x) {
    cylinder(x, headlights.y, headlights.casing.z, ...headlights.casing.size, finish.iron, root).rotation.x = quarterTurn
    cylinder(x, headlights.y, headlights.lens.z, ...headlights.lens.size, finish.headlight, root).rotation.x = quarterTurn
  }

  const { posts, windshieldRake, windshield, sill, roof, roofLining, steering } = dockTugCab
  for (const x of posts.x) {
    box(x, posts.y, posts.front.z, ...posts.front.size, finish.cream, root).rotation.x = windshieldRake
    box(x, posts.y, posts.rear.z, ...posts.rear.size, finish.iron, root)
  }
  const glass = meshes.paint(finish.windshield).clone('Dock tug windshield')!
  glass.alpha = windshield.opacity
  box(...windshield.center, ...windshield.size, glass, root, false).rotation.x = windshieldRake
  addBox(sill)
  addBox(roof)
  addBox(roofLining)
  cylinder(...steering.column.center, ...steering.column.size, finish.iron, root).rotation.x = steering.rake
  cylinder(...steering.wheel.center, ...steering.wheel.size, finish.rubber, root).rotation.x = steering.rake

  const { axleHeight, rearWheels, frontWheelZ, fork, tire, rim, cap } = dockTugRunningGear
  const rollers: TransformNode[] = []
  const steer = new TransformNode('Front fork', scene)
  steer.parent = root
  steer.position.set(0, axleHeight, frontWheelZ)
  function wheel(parent: TransformNode, rear?: { x: number, z: number }) {
    const hub = new TransformNode('Axle', scene)
    hub.parent = parent
    if (rear) hub.position.set(rear.x, axleHeight, rear.z)
    rollers.push(hub)
    cylinder(0, 0, 0, ...tire, finish.rubber, hub).rotation.z = quarterTurn
    for (const side of [-1, 1]) {
      cylinder(side * rim.offsetX, 0, 0, ...rim.size, finish.cream, hub).rotation.z = quarterTurn
      cylinder(side * cap.offsetX, 0, 0, ...cap.size, finish.iron, hub).rotation.z = quarterTurn
    }
  }
  for (const x of fork.x) box(x, fork.y, 0, ...fork.size, finish.iron, steer)
  for (const x of rearWheels.x) wheel(root, { x, z: rearWheels.z })
  wheel(steer)
  return (angle: number, roll: number) => {
    steer.rotation.y = angle
    for (const wheel of rollers) wheel.rotation.x = roll
  }
}
