import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { createCrew } from './crew'
import { crewFishingRod, crewHoe, crewPaddle, crewSkiffSeats, crewToolGrip, crewWateringCan } from './geometry/crew-equipment'

export const skiffCrewSeats = crewSkiffSeats.map(([x, y, z]) => new Vector3(x, y, z))
export const wateringRoseOffset = crewWateringCan.sprayOrigin
export const paddleBladeOffset = crewPaddle.waterContact

export function createFarmTools({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  const hoe = new TransformNode('Hoe', scene)
  const can = new TransformNode('Watering can', scene)
  const { offsetX, y, z } = crewToolGrip
  for (const grip of [hoe, can]) {
    grip.parent = character.arms[0]
    grip.position.set(-offsetX, y, z)
    grip.setEnabled(false)
  }

  const { shaft, blade, tilt } = crewHoe
  hoe.rotation.z = tilt
  cylinder(...shaft.centre, shaft.diameter, shaft.diameter, shaft.length, shaft.sides, shaft.color, hoe)
  box(...blade.centre, ...blade.size, blade.color, hoe)

  const { body, spout, rose } = crewWateringCan
  sphere(...body.centre, ...body.size, body.color, can)
  box(...spout.centre, ...spout.size, spout.color, can).rotation.x = spout.tilt
  sphere(...rose.centre, ...rose.size, rose.color, can)
  return { hoe, can }
}

export function createSkiffGear({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  const inverseGrip = Matrix.Identity(), toOtherHand = Vector3.Zero()
  const up = Vector3.Up()
  const { offsetX, y, z } = crewToolGrip
  const { shaft: paddleShaft, blade } = crewPaddle
  const { shaft: rodShaft, reel } = crewFishingRod
  const gear = [-1, 1].map((side, i) => {
    const grip = new TransformNode('Skiff gear', scene)
    grip.parent = character.arms[i]
    grip.position.set(side * offsetX, y, z)
    const paddle = new TransformNode('Paddle', scene)
    paddle.parent = grip
    paddle.rotationQuaternion = Quaternion.Identity()
    cylinder(...paddleShaft.centre, paddleShaft.diameter, paddleShaft.diameter, paddleShaft.length, paddleShaft.sides, paddleShaft.color, paddle)
    box(...blade.centre, ...blade.size, blade.color, paddle)
    const rod = new TransformNode('Fishing rod', scene)
    rod.parent = grip
    cylinder(...rodShaft.centre, rodShaft.topDiameter, rodShaft.bottomDiameter, rodShaft.length, rodShaft.sides, rodShaft.color, rod)
    sphere(...reel.centre, ...reel.size, reel.color, rod, false)
    grip.setEnabled(false)
    return { grip, paddle, rod }
  })
  return gear.map((tool, i) => ({
    ...tool,
    alignPaddle: () => {
      tool.grip.computeWorldMatrix(true).invertToRef(inverseGrip)
      const opposite = gear[1 - i].grip
      opposite.computeWorldMatrix(true)
      Vector3.TransformCoordinatesToRef(opposite.absolutePosition, inverseGrip, toOtherHand)
      Quaternion.FromUnitVectorsToRef(up, toOtherHand.normalize(), tool.paddle.rotationQuaternion!)
    },
  }))
}
