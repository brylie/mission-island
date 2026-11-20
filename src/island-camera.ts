import { Camera } from '@babylonjs/core/Cameras/camera'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { groundHeight, waterLevel } from './terrain'
import { buildings, houseRoofRise } from './world'

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
  let vehicleBlend = 0
  let arm = 1

  const doc = canvas.ownerDocument
  const pointerEvents = new AbortController()
  const options = { signal: pointerEvents.signal }
  let mouseLook = true
  let attemptedLock = false
  let hadLock = false
  let previousMouse: { x: number; y: number } | undefined
  let invertHorizontal = true
  let invertVertical = true

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
    } catch {
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
    orbitYaw += dx * (invertHorizontal ? 0.006 : -0.006)
    const pitchChange = dy * (invertVertical ? 0.005 : -0.005)
    orbitPitch = Math.max(-0.79, Math.min(0.71, orbitPitch + pitchChange))
  }, options)

  function aimHeading() {
    return Math.atan2(target.x - follow.position.x, target.z - follow.position.z)
  }

  return {
    update(subject: TransformNode | undefined, seated: boolean, aspect: number, delta: number) {
      if (!subject) {
        if (tracking) {
          tracking = false
          releaseMouse()
        }
        scene.activeCamera = overview
        scene.fogStart = 400
        scene.fogEnd = 500
        const halfHeight = Math.max(106, 125 / Math.max(0.3, aspect))
        overview.orthoLeft = -halfHeight * aspect
        overview.orthoRight = halfHeight * aspect
        overview.orthoTop = halfHeight
        overview.orthoBottom = -halfHeight
        return overview
      }

      const snap = !tracking || Vector3.DistanceSquared(anchor, subject.position) > 196
      const blend = snap ? 1 : 1 - Math.exp(-delta * 8)
      if (seated !== wasSeated) {
        orbitYaw = seated ? 0 : heading
        wasSeated = seated
      }
      const wantedHeading = (seated ? subject.rotation.y : 0) + orbitYaw
      const turn = wantedHeading - heading
      heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * blend
      pitch += (orbitPitch - pitch) * blend
      vehicleBlend += (Number(seated) - vehicleBlend) * blend
      Vector3.LerpToRef(anchor, subject.position, blend, anchor)

      const forwardX = Math.sin(heading)
      const forwardZ = Math.cos(heading)
      const radius = 5.92 + vehicleBlend * 3.38
      const elevation = 0.38 - vehicleBlend * 0.025 + pitch
      const distance = radius * Math.cos(elevation)
      const height = 1.55 + radius * Math.sin(elevation)
      const shoulder = 0.68 * (1 - vehicleBlend)
      const lookAhead = 1.55 + vehicleBlend * 1.35

      pivot.set(anchor.x, anchor.y + 1.55, anchor.z)
      desired.set(anchor.x - forwardX * distance + forwardZ * shoulder, anchor.y + height,
        anchor.z - forwardZ * distance - forwardX * shoulder)
      const clear = terrainClearance(pivot, desired, visibleArm(pivot, desired))
      arm = snap ? clear : Math.min(clear, arm + (clear - arm) * blend)
      Vector3.LerpToRef(pivot, desired, arm, follow.position)
      // In tight spaces keep a view over the character's shoulder as the arm retracts.
      follow.position.y = Math.max(Math.max(groundHeight(follow.position), waterLevel) + 0.35,
        pivot.y + (desired.y - pivot.y) * (0.65 + 0.35 * arm))
      const lookUp = Math.max(0, -pitch - 0.28) * 2.4
      target.set(anchor.x + forwardX * lookAhead, anchor.y + 1.35 + lookUp, anchor.z + forwardZ * lookAhead)
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
    walkInput(x: number, z: number) {
      if (!tracking || wasSeated || (!x && !z)) return { x, z }
      const yaw = aimHeading()
      const cosine = Math.cos(yaw)
      const sine = Math.sin(yaw)
      const length = Math.hypot(x, z)
      return { x: (x * cosine + z * sine) / length, z: (z * cosine - x * sine) / length }
    },
    aimHeading: () => tracking ? aimHeading() : undefined,
    captureMouse,
    releaseMouse,
    setMouseInversion(horizontal: boolean, vertical: boolean) {
      invertHorizontal = horizontal
      invertVertical = vertical
    },
    dispose() {
      releaseMouse()
      pointerEvents.abort()
      delete canvas.dataset.mouseLook
    },
  }
}
