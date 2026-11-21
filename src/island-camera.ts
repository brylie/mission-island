import { Camera } from '@babylonjs/core/Cameras/camera'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { groundHeight, waterLevel } from './terrain'
import { buildings, houseRoofRise } from './world'
import type { LookSettings } from './look-options-ui'
import { ridgeHeading } from './worlds/starter/ridge-scout'

type RidgeView = 'preflight' | 'flight'

// Include each roof overhang so the camera retracts before it reaches a wall or roof.
const cameraObstacles = buildings.map(({ x, z, w, h, d }) => ({
  min: [x - w / 2 - 0.39, -0.2, z - d / 2 - 0.39],
  max: [x + w / 2 + 0.39, h + houseRoofRise + 0.2, z + d / 2 + 0.39],
}))

function visibleArm(origin: Vector3, destination: Vector3) {
  const start = [origin.x, origin.y, origin.z]
  const direction = [destination.x - origin.x, destination.y - origin.y, destination.z - origin.z]
  let fraction = 1
  for (const { min, max } of cameraObstacles) {
    let entry = 0
    let exit = fraction
    for (const [axis, step] of direction.entries()) {
      if (Math.abs(step) < 0.0001) {
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
  for (let i = 1; i <= 16; i++) {
    const along = maximum * i / 16
    const x = origin.x + (destination.x - origin.x) * along
    const z = origin.z + (destination.z - origin.z) * along
    const y = origin.y + (destination.y - origin.y) * along
    if (y < Math.max(waterLevel, groundHeight({ x, z })) + 0.25) break
    clear = along
  }
  return clear
}

function reticleRay(origin: Vector3, target: Vector3) {
  const direction = target.subtract(origin).normalize()
  return { origin: origin.clone(), direction, reach: 18 * visibleArm(origin, origin.add(direction.scale(18))) }
}

function frameOverview(camera: FreeCamera, aspect: number) {
  const halfHeight = Math.max(106, 125 / Math.max(0.3, aspect))
  camera.orthoLeft = -halfHeight * aspect
  camera.orthoRight = halfHeight * aspect
  camera.orthoTop = halfHeight
  camera.orthoBottom = -halfHeight
}

// Over-the-shoulder framing: the camera orbits a pivot just above and to the right of the head
// and always looks through it, so the reticle sits over the shoulder rather than on the character.
// Looking down tips the aim ray onto the ground just ahead. A vehicle keeps a lower, centred pivot.
function shoulderRig(vehicleBlend: number, pitch: number) {
  return { radius: 5.92 + vehicleBlend * 3.38, elevation: 0.32 - vehicleBlend * 0.025 + pitch, shoulder: 0.38 * (1 - vehicleBlend), pivotHeight: 1.55 + 0.5 * (1 - vehicleBlend) }
}

export function createIslandCamera(scene: Scene, canvas: HTMLCanvasElement) {
  const overview = new FreeCamera('Island overview', new Vector3(0, 174, -120), scene)
  overview.mode = Camera.ORTHOGRAPHIC_CAMERA
  overview.setTarget(new Vector3(0, 0, 58))
  overview.maxZ = 680

  const follow = new FreeCamera('Third-person follow', Vector3.Zero(), scene)
  follow.fov = 0.94
  follow.minZ = 0.12
  follow.maxZ = 620

  scene.clearColor.set(0.725, 0.875, 0.89, 1)
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
    orbitYaw += dx * 0.0034 * look.speed * (look.invertHorizontal ? -1 : 1)
    orbitPitch = Math.max(-0.79, Math.min(0.92, orbitPitch + dy * 0.0028 * look.speed * (look.invertVertical ? -1 : 1)))
  }, options)

  function aimHeading() {
    return Math.atan2(target.x - follow.position.x, target.z - follow.position.z)
  }

  return {
    update(subject: TransformNode | undefined, seated: boolean, aspect: number, delta: number, ridge?: RidgeView) {
      if (!subject) {
        if (tracking) {
          tracking = false
          releaseMouse()
        }
        ridgeView = undefined
        scene.activeCamera = overview
        scene.fogStart = 400
        scene.fogEnd = 500
        frameOverview(overview, aspect)
        return overview
      }

      if (ridge && ridge !== ridgeView) orbitPitch = 0.14
      const snap = !tracking || Vector3.DistanceSquared(anchor, subject.position) > 196
      const blend = snap ? 1 : 1 - Math.exp(-delta * 8)
      seated ||= ridge === 'flight'
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

      const forwardX = Math.sin(heading)
      const forwardZ = Math.cos(heading)
      const { radius, elevation, shoulder, pivotHeight } = shoulderRig(vehicleBlend, pitch)
      pivot.set(anchor.x + forwardZ * shoulder, anchor.y + pivotHeight, anchor.z - forwardX * shoulder)
      desired.set(pivot.x - forwardX * radius * Math.cos(elevation), pivot.y + radius * Math.sin(elevation), pivot.z - forwardZ * radius * Math.cos(elevation))
      const clear = terrainClearance(pivot, desired, visibleArm(pivot, desired))
      arm = snap ? clear : Math.min(clear, arm + (clear - arm) * blend)
      Vector3.LerpToRef(pivot, desired, arm, follow.position)
      follow.position.y = Math.max(Math.max(groundHeight(follow.position), waterLevel) + 0.35, follow.position.y)
      // Aim through the pivot from wherever the camera ended up, even when the ground lifted it.
      pivot.subtractToRef(follow.position, target)
      if (target.lengthSquared() < 0.0025) target.set(forwardX, 0, forwardZ)
      target.normalize().scaleInPlace(6 + vehicleBlend * 3).addInPlace(pivot)
      follow.setTarget(target)
      if (!tracking) {
        tracking = true
        syncMouseLook()
      }
      scene.activeCamera = follow
      scene.fogStart = 55
      scene.fogEnd = 155
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
