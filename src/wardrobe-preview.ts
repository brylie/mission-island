import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'
import { createCrew } from './assets/crew'
import type { CrewAppearance } from './crew-appearance'
import { createIslandLighting, createMeshFactory } from './island-meshes'

export function createWardrobePreview(canvas: HTMLCanvasElement, id: number) {
  const engine = new Engine(canvas, true)
  const scene = new Scene(engine)
  scene.clearColor = Color4.FromHexString('#293d3cff')
  const { shadows } = createIslandLighting(scene)
  const meshes = createMeshFactory(scene, shadows)
  const crew = createCrew(meshes, id)
  const stand = meshes.cylinder(0, -0.025, 0, 1.75, 1.85, 0.095, 48, '#526d65', undefined, false)
  stand.receiveShadows = true
  const camera = new ArcRotateCamera('Wardrobe orbit', Math.PI / 2, 1.39, 3.15, new Vector3(0, 0.94, 0), scene)
  camera.lowerRadiusLimit = 2.45
  camera.upperRadiusLimit = 4.2
  camera.lowerBetaLimit = 0.55
  camera.upperBetaLimit = Math.PI / 2
  camera.panningSensibility = 0
  camera.wheelDeltaPercentage = 0.035
  camera.attachControl(canvas, false)
  const resize = new ResizeObserver(() => engine.resize())
  resize.observe(canvas)
  const started = performance.now()
  engine.runRenderLoop(() => {
    crew.blink((performance.now() - started) / 1000)
    scene.render()
  })
  return {
    show: (appearance: CrewAppearance) => crew.setAppearance(appearance),
    view(rear: boolean) {
      camera.inertialAlphaOffset = camera.inertialBetaOffset = 0
      camera.alpha = rear ? -Math.PI / 2 : Math.PI / 2
      camera.beta = 1.39
    },
    dispose() {
      resize.disconnect()
      engine.dispose()
    },
  }
}
