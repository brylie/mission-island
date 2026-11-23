import { Camera } from '@babylonjs/core/Cameras/camera'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { fireWatchRoofBounds, nearFireWatch } from './fire-watch'
import { binocularEyeHeightM } from './spotting'
import { coastBounds, fireWatchBaseHeight, groundHeight, waterLevel } from './terrain'
import { buildings, houseRoofRise } from './world'
import type { LookSettings } from './look-options-ui'
import { ridgeHeading } from './worlds/starter/ridge-scout'

const halfWidthDivisor = 2
const wallOrbitPadding = 0.39
const buildingFloor = -0.2
const roofOrbitPadding = 0.2
const rayParallelTolerance = 0.0001
const terrainSampleCount = 16
const rayTerrainClearance = 0.25
const reticleReach = 18
const overviewMinimumAspect = 0.3
const followRadius = 5.92
const vehicleRadiusIncrease = 3.38
const followPitch = 0.32
const vehiclePitchDrop = 0.025
const shoulderOffset = 0.38
const vehiclePivotHeight = 1.55
const standingPivotLift = 0.5
// The overview frames the whole coast from the south, at the angle the original
// island view used: 174 m up and 178 m back from its focus.
const overviewElevation = 174
const overviewSetback = 178
const overviewMarginM = 16
const overviewFarReach = 3.9
const overviewFocusFraction = 0.5
export const followFieldOfView = 0.94
const followNearPlane = 0.12
const followFarPlane = 1000
const skyRed = 0.725
const skyGreen = 0.875
const skyBlue = 0.89
export const lookYawSensitivity = 0.0034
const lookMinimumPitch = -0.79
const lookMaximumPitch = 0.92
// Climbing the Fire Watch the view is the crewmate's own eyes: about 75° up to the sky and down to the
// fire finder or the next step at their feet. The eye sits a little ahead of the face, so the head stays behind the view.
const lookoutMinimumPitch = -1.3
const lookoutMaximumPitch = 1.3
const lookoutLensM = 0.3
// The lookout view covers the whole climb, stairs and cab, once a crewmate stands this far above the ground.
const towerClimbM = 0.25
const climbingTower = (feet: Vector3) => nearFireWatch(feet, 0) && feet.y > groundHeight(feet) + towerClimbM
export const lookPitchSensitivity = 0.0028
const overviewFogStartReach = 2.3
const overviewFogEndReach = 2.9
const ridgePitch = 0.14
const trackingSnapDistanceSquared = 196
const trackingBlendPerSecond = 8
const followTerrainClearance = 0.35
const aimFallbackLengthSquared = 0.0025
const aimDepth = 6
const vehicleAimDepthIncrease = 3
const followFogStart = 45
const followFogEnd = 900

const coast = coastBounds()
const coastSpan = { x: coast.east - coast.west, z: coast.north - coast.south }
const overviewFocus = { x: (coast.west + coast.east) / halfWidthDivisor, z: coast.south + coastSpan.z * overviewFocusFraction }
// Seen at this angle, the island's depth shrinks on screen by the sine of the view's pitch.
const overviewPitchSine = overviewElevation / Math.hypot(overviewElevation, overviewSetback)
const overviewHalfWidth = coastSpan.x / halfWidthDivisor + overviewMarginM
const overviewMinimumHalfHeight = coastSpan.z * overviewPitchSine / halfWidthDivisor + overviewMarginM
const overviewScale = Math.max(overviewHalfWidth, overviewMinimumHalfHeight)

type RidgeView = 'preflight' | 'flight'

// Include each roof overhang so the camera retracts before it reaches a wall or roof.
const cameraObstacles = [
  ...buildings.map(({ x, z, w, h, d }) => ({
    min: [x - w / halfWidthDivisor - wallOrbitPadding, buildingFloor, z - d / halfWidthDivisor - wallOrbitPadding],
    max: [x + w / halfWidthDivisor + wallOrbitPadding, h + houseRoofRise + roofOrbitPadding, z + d / halfWidthDivisor + wallOrbitPadding],
  })),
  fireWatchRoofBounds(fireWatchBaseHeight(), roofOrbitPadding),
]

function visibleArm(origin: Vector3, destination: Vector3) {
  const start = [origin.x, origin.y, origin.z]
  const direction = [destination.x - origin.x, destination.y - origin.y, destination.z - origin.z]
  let fraction = 1
  for (const { min, max } of cameraObstacles) {
    let entry = 0
    let exit = fraction
    for (const [axis, step] of direction.entries()) {
      if (Math.abs(step) < rayParallelTolerance) {
        if (start[axis] < min[axis] || start[axis] > max[axis]) {
          exit = -1
          break
        }
        continue
      }
      const near = (min[axis] - start[axis]) / step
      const far = (max[axis] - start[axis]) / step
      entry = Math.max(entry, Math.min(near, far))
      exit = Math.min(exit, Math.max(near, far))
      if (entry > exit) break
    }
    if (entry <= exit) fraction = entry
  }
  return fraction
}

function terrainClearance(origin: Vector3, destination: Vector3, maximum: number) {
  let clear = 0
  for (let i = 1; i <= terrainSampleCount; i++) {
    const along = maximum * i / terrainSampleCount
    const x = origin.x + (destination.x - origin.x) * along
    const z = origin.z + (destination.z - origin.z) * along
    const y = origin.y + (destination.y - origin.y) * along
    if (y < Math.max(waterLevel, groundHeight({ x, z })) + rayTerrainClearance) break
    clear = along
  }
  return clear
}

function reticleRay(origin: Vector3, target: Vector3) {
  const direction = target.subtract(origin).normalize()
  return { origin: origin.clone(), direction, reach: reticleReach * visibleArm(origin, origin.add(direction.scale(reticleReach))) }
}

function frameOverview(camera: FreeCamera, aspect: number) {
  const halfHeight = Math.max(overviewMinimumHalfHeight, overviewHalfWidth / Math.max(overviewMinimumAspect, aspect))
  camera.orthoLeft = -halfHeight * aspect
  camera.orthoRight = halfHeight * aspect
  camera.orthoTop = halfHeight
  camera.orthoBottom = -halfHeight
}

// Over-the-shoulder framing: the camera orbits a pivot just above and to the right of the head
// and always looks through it, so the reticle sits over the shoulder rather than on the character.
// Looking down tips the aim ray onto the ground just ahead. A vehicle keeps a lower, centred pivot.
const clampPitch = (value: number, lookout: boolean) => lookout
  ? Math.max(lookoutMinimumPitch, Math.min(lookoutMaximumPitch, value))
  : Math.max(lookMinimumPitch, Math.min(lookMaximumPitch, value))

// On the tower's stairs and under the cab's roof there is no room for a camera behind the crewmate,
// so they look out with their own eyes.
// Positive pitch looks down, as it does for the follow camera.
function placeLookout(camera: FreeCamera, target: Vector3, feet: Vector3, heading: number, pitch: number) {
  const ahead = new Vector3(Math.sin(heading) * Math.cos(pitch), -Math.sin(pitch), Math.cos(heading) * Math.cos(pitch))
  camera.position.set(feet.x + ahead.x * lookoutLensM, feet.y + binocularEyeHeightM + ahead.y * lookoutLensM, feet.z + ahead.z * lookoutLensM)
  target.copyFrom(camera.position).addInPlace(ahead.scale(aimDepth))
  camera.setTarget(target)
}

function shoulderRig(vehicleBlend: number, pitch: number) {
  return { radius: followRadius + vehicleBlend * vehicleRadiusIncrease, elevation: followPitch - vehicleBlend * vehiclePitchDrop + pitch, shoulder: shoulderOffset * (1 - vehicleBlend), pivotHeight: vehiclePivotHeight + standingPivotLift * (1 - vehicleBlend) }
}

export function createIslandCamera(scene: Scene, canvas: HTMLCanvasElement) {
  const lift = overviewScale / overviewSetback
  const overview = new FreeCamera('Island overview', new Vector3(overviewFocus.x, overviewElevation * lift, overviewFocus.z - overviewSetback * lift), scene)
  overview.mode = Camera.ORTHOGRAPHIC_CAMERA
  overview.setTarget(new Vector3(overviewFocus.x, 0, overviewFocus.z))
  overview.maxZ = overviewScale * overviewFarReach

  const follow = new FreeCamera('Third-person follow', Vector3.Zero(), scene)
  follow.fov = followFieldOfView
  follow.minZ = followNearPlane
  follow.maxZ = followFarPlane

  scene.clearColor.set(skyRed, skyGreen, skyBlue, 1)
  scene.fogColor.copyFromFloats(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)
  scene.fogMode = Scene.FOGMODE_LINEAR

  const anchor = Vector3.Zero()
  const pivot = Vector3.Zero()
  const desired = Vector3.Zero()
  const target = Vector3.Zero()
  let tracking = false
  let heading = 0
  let orbitYaw = 0
  let orbitPitch = 0
  let lookout = false
  let pitch = 0
  let wasSeated = false
  let ridgeView: RidgeView | undefined
  let vehicleBlend = 0
  let arm = 1

  const doc = canvas.ownerDocument
  const pointerEvents = new AbortController()
  const options = { signal: pointerEvents.signal }
  let mouseLook = true
  let attemptedLock = false
  let hadLock = false
  let previousMouse: { x: number, y: number } | undefined
  let look: LookSettings = { invertHorizontal: false, invertVertical: false, speed: 1 }

  function syncMouseLook() {
    const locked = doc.pointerLockElement === canvas
    canvas.dataset.mouseLook = !tracking ? 'off' : !mouseLook ? 'paused' : locked ? 'locked' : 'free'
  }
  syncMouseLook()

  function captureMouse() {
    if (!mouseLook) {
      mouseLook = true
      syncMouseLook()
    }
    if (attemptedLock || doc.pointerLockElement || !canvas.requestPointerLock) return
    attemptedLock = true
    try {
      // Some browsers and embedded previews limit pointer lock. Mouse look
      // still works while the cursor is over the canvas in those environments.
      void canvas.requestPointerLock()?.catch(() => {})
    }
    catch {
      // Older implementations can report the restriction synchronously.
    }
  }

  function releaseMouse() {
    mouseLook = false
    syncMouseLook()
    attemptedLock = false
    previousMouse = undefined
    if (doc.pointerLockElement === canvas) doc.exitPointerLock()
  }

  doc.addEventListener('pointerlockchange', () => {
    const locked = doc.pointerLockElement === canvas
    if (locked && !mouseLook) {
      doc.exitPointerLock()
      return
    }
    if (!locked && hadLock) releaseMouse()
    hadLock = locked
    syncMouseLook()
  }, options)

  canvas.addEventListener('mouseleave', () => {
    previousMouse = undefined
  }, options)

  canvas.addEventListener('mousemove', (event) => {
    if (!tracking || !mouseLook) return
    const locked = doc.pointerLockElement === canvas
    const dx = locked ? event.movementX : event.clientX - (previousMouse?.x ?? event.clientX)
    const dy = locked ? event.movementY : event.clientY - (previousMouse?.y ?? event.clientY)
    previousMouse = { x: event.clientX, y: event.clientY }
    // Standard look turns right with the mouse and looks down as it moves down. The invert options flip
    // each axis. A gentler base rate than before; the Options slider scales it.
    orbitYaw += dx * lookYawSensitivity * look.speed * (look.invertHorizontal ? -1 : 1)
    orbitPitch = clampPitch(orbitPitch + dy * lookPitchSensitivity * look.speed * (look.invertVertical ? -1 : 1), lookout)
  }, options)

  function aimHeading() {
    return Math.atan2(target.x - follow.position.x, target.z - follow.position.z)
  }

  return {
    update(subject: TransformNode | undefined, aboardVehicle: boolean, aspect: number, delta: number, ridge?: RidgeView) {
      if (!subject) {
        if (tracking) {
          tracking = false
          releaseMouse()
        }
        ridgeView = undefined
        scene.activeCamera = overview
        scene.fogStart = overviewScale * overviewFogStartReach
        scene.fogEnd = overviewScale * overviewFogEndReach
        frameOverview(overview, aspect)
        return overview
      }

      if (ridge && ridge !== ridgeView) orbitPitch = ridgePitch
      const snap = !tracking || Vector3.DistanceSquared(anchor, subject.position) > trackingSnapDistanceSquared
      const blend = snap ? 1 : 1 - Math.exp(-delta * trackingBlendPerSecond)
      const seated = aboardVehicle || ridge === 'flight'
      if (seated !== wasSeated) {
        orbitYaw = seated ? 0 : heading
        wasSeated = seated
      }
      if (ridge === 'preflight' && ridge !== ridgeView) orbitYaw = ridgeHeading
      ridgeView = ridge
      const wantedHeading = (seated ? subject.rotation.y : 0) + orbitYaw
      const turn = wantedHeading - heading
      heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * blend
      pitch += (orbitPitch - pitch) * blend
      vehicleBlend += (Number(seated) - vehicleBlend) * blend
      Vector3.LerpToRef(anchor, subject.position, blend, anchor)

      lookout = !seated && climbingTower(subject.position)
      orbitPitch = clampPitch(orbitPitch, lookout)
      if (lookout) placeLookout(follow, target, anchor, heading, pitch)
      else {
        const forwardX = Math.sin(heading)
        const forwardZ = Math.cos(heading)
        const { radius, elevation, shoulder, pivotHeight } = shoulderRig(vehicleBlend, pitch)
        pivot.set(anchor.x + forwardZ * shoulder, anchor.y + pivotHeight, anchor.z - forwardX * shoulder)
        desired.set(pivot.x - forwardX * radius * Math.cos(elevation), pivot.y + radius * Math.sin(elevation), pivot.z - forwardZ * radius * Math.cos(elevation))
        const clear = terrainClearance(pivot, desired, visibleArm(pivot, desired))
        arm = snap ? clear : Math.min(clear, arm + (clear - arm) * blend)
        Vector3.LerpToRef(pivot, desired, arm, follow.position)
        follow.position.y = Math.max(Math.max(groundHeight(follow.position), waterLevel) + followTerrainClearance, follow.position.y)
        // Aim through the pivot from wherever the camera ended up, even when the ground lifted it.
        pivot.subtractToRef(follow.position, target)
        if (target.lengthSquared() < aimFallbackLengthSquared) target.set(forwardX, 0, forwardZ)
        target.normalize().scaleInPlace(aimDepth + vehicleBlend * vehicleAimDepthIncrease).addInPlace(pivot)
        follow.setTarget(target)
      }
      if (!tracking) {
        tracking = true
        syncMouseLook()
      }
      scene.activeCamera = follow
      scene.fogStart = followFogStart
      scene.fogEnd = followFogEnd
      return follow
    },
    inspectionCamera() {
      if (!tracking) return
      const offset = follow.position.subtract(target)
      const radius = offset.length()
      return { target: target.asArray(), alpha: Math.atan2(offset.z, offset.x), beta: Math.acos(offset.y / radius), radius, fov: follow.fov }
    },
    walkInput(x: number, z: number) {
      if (!tracking || wasSeated || (!x && !z)) return { x, z }
      const yaw = aimHeading()
      const cosine = Math.cos(yaw)
      const sine = Math.sin(yaw)
      const length = Math.hypot(x, z)
      return { x: (x * cosine + z * sine) / length, z: (z * cosine - x * sine) / length }
    },
    aimHeading: () => tracking ? aimHeading() : undefined,
    // The reticle's ray from the follow camera, cut short where it meets a building.
    aimRay: () => tracking && mouseLook ? reticleRay(follow.position, target) : undefined,
    viewRay: () => tracking ? { origin: follow.position.clone(), direction: target.subtract(follow.position).normalize() } : undefined,
    captureMouse,
    releaseMouse,
    setLook(settings: LookSettings) { look = settings },
    dispose() {
      releaseMouse()
      pointerEvents.abort()
      delete canvas.dataset.mouseLook
    },
  }
}
