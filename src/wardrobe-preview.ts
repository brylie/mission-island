import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'
import { createCrew } from './assets/crew'
import { wardrobeStand } from './assets/geometry/wardrobe-preview'
import type { CrewAppearance } from './crew-appearance'
import { createIslandLighting, createMeshFactory } from './island-meshes'

const halfWidthDivisor = 2
const orbitTilt = 1.39
const orbitRadius = 3.15
const orbitTargetY = 0.94
const minimumOrbitRadius = 2.45
const maximumOrbitRadius = 4.2
const minimumOrbitTilt = 0.55
const orbitZoomSensitivity = 0.035
const millisecondsPerSecond = 1000

export function createWardrobePreview(canvas: HTMLCanvasElement, id: number) {
  const engine = new Engine(canvas, true)
  const scene = new Scene(engine)
  scene.clearColor = Color4.FromHexString('#293d3cff')
  const { shadows } = createIslandLighting(scene)
  const meshes = createMeshFactory(scene, shadows)
  const crew = createCrew(meshes, id)
  const stand = meshes.cylinder(0, wardrobeStand.y, 0, wardrobeStand.top, wardrobeStand.bottom, wardrobeStand.height, wardrobeStand.segments, wardrobeStand.color, undefined, false)
  stand.receiveShadows = true
  const camera = new ArcRotateCamera('Wardrobe orbit', Math.PI / halfWidthDivisor, orbitTilt, orbitRadius, new Vector3(0, orbitTargetY, 0), scene)
  camera.lowerRadiusLimit = minimumOrbitRadius
  camera.upperRadiusLimit = maximumOrbitRadius
  camera.lowerBetaLimit = minimumOrbitTilt
  camera.upperBetaLimit = Math.PI / halfWidthDivisor
  camera.panningSensibility = 0
  camera.wheelDeltaPercentage = orbitZoomSensitivity
  camera.attachControl(canvas, false)
  const resize = new ResizeObserver(() => engine.resize())
  resize.observe(canvas)
  const started = performance.now()
  engine.runRenderLoop(() => {
    crew.blink((performance.now() - started) / millisecondsPerSecond)
    scene.render()
  })
  return {
    show: (appearance: CrewAppearance) => crew.setAppearance(appearance),
    view(rear: boolean) {
      camera.inertialAlphaOffset = camera.inertialBetaOffset = 0
      camera.alpha = rear ? -Math.PI / halfWidthDivisor : Math.PI / halfWidthDivisor
      camera.beta = orbitTilt
    },
    dispose() {
      resize.disconnect()
      engine.dispose()
    },
  }
}
