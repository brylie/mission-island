import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { MeshFactory } from './island-meshes'
import type { LiveTrial } from './live-checkpoints'
import { sidewalkHeight } from './routes'
import { commuteCheckpoint, walkingCheckpoint, walkingLane } from './walking-scenario'

export function createWalkingReview(meshes: MeshFactory, releaseMouse: () => void, faceLane: (heading: number) => void) {
  const button = document.querySelector<HTMLButtonElement>('#walking-side-view')!
  const camera = new FreeCamera('Walking side view', Vector3.Zero(), meshes.scene)
  camera.minZ = .12
  camera.maxZ = 620
  const { start, length, heading } = walkingLane
  const marks = Array.from({ length: length + 1 }, (_, metre) =>
    meshes.box(start.x + metre, sidewalkHeight + .004, start.z, metre % 2 ? .025 : .043, .008, 1.36, '#5c675f', undefined, false))
  for (const mark of marks) mark.setEnabled(false)
  let revision: number | undefined, checkpoint: string | undefined, enabled = false, arm = 1

  function showSideView(on: boolean) {
    enabled = on
    button.setAttribute('aria-pressed', String(on))
    if (on) releaseMouse()
  }
  function aim(target: Vector3) {
    camera.setTarget(target)
    arm = Vector3.Distance(camera.position, target)
  }
  button.onclick = () => showSideView(!enabled)

  return {
    sync(trial: LiveTrial | undefined, viewer: number) {
      if (trial?.revision === revision && trial?.checkpoint === checkpoint) return
      revision = trial?.revision
      checkpoint = trial?.checkpoint
      const lane = checkpoint === walkingCheckpoint
      const commute = checkpoint === commuteCheckpoint
      for (const mark of marks) mark.setEnabled(lane)
      button.hidden = !lane && !commute
      showSideView(commute || (lane && viewer === 1))
      if (lane) {
        const middle = start.x + length / 2
        camera.position.set(middle, 1.95, 17.2)
        aim(new Vector3(middle, .82, start.z))
        faceLane(heading)
      } else if (commute) {
        camera.position.set(-38.0, 1.65, -32.5)
        aim(new Vector3(-42.45, .85, -27.9))
      }
    },
    view(aspect: number) {
      if (!enabled) return
      const width = checkpoint === walkingCheckpoint ? 7.1 : 5
      camera.fov = 2 * Math.atan(Math.max(1.8, width / aspect) / arm)
      return camera
    },
    active: () => enabled,
    running: () => checkpoint === walkingCheckpoint || checkpoint === commuteCheckpoint,
    dispose() { button.onclick = null },
  }
}
