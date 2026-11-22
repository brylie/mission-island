import { Camera } from '@babylonjs/core/Cameras/camera'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { arrival } from './sites'

const spawnCameraY = 12
const spawnCameraZOffset = 19
const overviewCameraY = 910
const overviewCameraZ = -389
const overviewFocusZ = 8
const cameraNearPlane = 0.22
const cameraFarPlane = 1900
const followFieldOfView = 0.82

export function createInspectionCameras(scene: Scene) {
  const follow = new FreeCamera('Saltwind follow', new Vector3(arrival.x, spawnCameraY, arrival.z - spawnCameraZOffset), scene)
  const overview = new FreeCamera('Saltwind overview', new Vector3(0, overviewCameraY, overviewCameraZ), scene)
  overview.mode = Camera.ORTHOGRAPHIC_CAMERA
  overview.setTarget(new Vector3(0, 0, overviewFocusZ))
  for (const camera of [follow, overview]) {
    camera.minZ = cameraNearPlane
    camera.maxZ = cameraFarPlane
  }
  follow.fov = followFieldOfView
  return { follow, overview }
}
