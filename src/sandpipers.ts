import { sandpiperGeometry } from './assets/geometry/sandpiper'
import { createShorebird } from './assets/shorebird'
import type { MeshFactory } from './island-meshes'
import { clamp } from './math/noise'
import { sandpiperPose } from './sandpiper-motion'
import { daylight } from './weather'
import type { WildlifeFrame } from './wildlife'
import type { Point } from './world'
import { driftwoodSandpipers } from './worlds/starter/layout/wildlife'

const visibleRangeM = 43
const visibleHeightM = 22
const earliestLight = 0.08
const scale = 1.16
const fullStrideSpeedMps = 0.86
const maximumContinuousFrameSeconds = 0.23

export function createSandpipers(meshes: MeshFactory) {
  const flock = Array.from({ length: driftwoodSandpipers.count }, () => {
    const bird = createShorebird(meshes, 'Driftwood sandpiper', sandpiperGeometry)
    bird.root.scaling.setAll(scale)
    return { ...bird, time: undefined as number | undefined }
  })
  const shore = sandpiperPose(0, 0)
  return ({ time, weather, camera, seek }: WildlifeFrame, walkers: readonly Point[]) => {
    const visible = daylight(weather.hour) > earliestLight && camera.y - shore.y < visibleHeightM
      && Math.hypot(camera.x - shore.x, camera.z - shore.z) < visibleRangeM
    for (const [index, bird] of flock.entries()) {
      bird.root.setEnabled(visible)
      if (!visible) {
        bird.time = undefined
        continue
      }
      const pose = sandpiperPose(time, index, walkers)
      const elapsed = time - (bird.time ?? time)
      const travel = Math.hypot(pose.x - bird.root.position.x, pose.z - bird.root.position.z)
      const stride = !seek && elapsed > 0 && elapsed < maximumContinuousFrameSeconds
        ? clamp(travel / elapsed / fullStrideSpeedMps)
        : pose.stride
      bird.time = time
      bird.root.position.set(pose.x, pose.y, pose.z)
      bird.root.rotation.y = pose.heading
      bird.pose(time + index, pose.feeding, stride)
    }
  }
}
