import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import type { Engine } from '@babylonjs/core/Engines/engine'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Scene } from '@babylonjs/core/scene'
import { createIslandLighting, createMeshFactory } from '../island-meshes'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { brinewickRainRoof } from '../second-island/brinewick-market-art'
import { createFieldScenery } from './field-scenery'
import type { FieldSite } from './field-site'
import { createAtmosphere } from '../island-atmosphere'
import { createIslandMaterial } from '../materials'
import { groundHeight as terrainHeight, waterLevel } from '../terrain'
import type { Entry, Values } from './subject'
import { lightingPresets } from './lighting'
import type { LightingPreset } from './lighting'
import { findZFightCandidates } from './z-fighting'
import { createLandscapeLayout } from './landscape-layout'
import type { createLandscapeDraft } from './landscape-draft'
import type { Point } from '../world'

export interface CameraState {
  alpha: number
  beta: number
  radius: number
  fov?: number
  target: number[]
}

export type Angle = 'perspective' | 'front' | 'side' | 'top'

function stageAtmosphere(scene: Scene, lighting: ReturnType<typeof createIslandLighting>, entry: Entry, field?: FieldSite) {
  if (entry.landscape || entry.weather) scene.fogMode = Scene.FOGMODE_LINEAR
  if (!entry.landscape && entry.id !== 'biome' && !entry.weather) return
  const { sky, sunlight, shadows } = lighting
  return createAtmosphere(scene, sky, sunlight, shadows, field?.saltwindSubject ? 3350 : undefined,
    field?.saltwindSubject ? brinewickRainRoof : undefined)
}

function stageWeather(entry: Entry, time: number, settings: Values) {
  return entry.weather?.(time, settings) ?? {
    hour: Number(settings.hour), rain: entry.id === 'biome' ? Number(settings.rain) / 100 : entry.landscape ? Number(settings.rain) : 0,
  }
}

export function createStage(engine: Engine, canvas: HTMLCanvasElement, entry: Entry, values: Values,
  reportError: (error: string) => void, draft: ReturnType<typeof createLandscapeDraft>, field?: FieldSite) {
  const scene = new Scene(engine)
  const biome = entry.id === 'biome'
  try {
    scene.clearColor = Color4.FromHexString('#1b292aff')
    const sceneLighting = createIslandLighting(scene)
    const { sky, sunlight, shadows } = sceneLighting
    const atmosphere = stageAtmosphere(scene, sceneLighting, entry, field)
    const surroundings = field ? createFieldScenery(createMeshFactory(scene, shadows), field) : undefined
    if (field) scene.clearColor = Color4.FromHexString('#b7d3d7ff')
    const firstSubjectRoot = scene.rootNodes.length
    const firstSubjectMesh = scene.meshes.length
    const meshes = createMeshFactory(scene, shadows)
    const readout = document.getElementById('subject-observations')!
    const update = entry.create(meshes, values, reportError, text => {
      if (readout.textContent !== text) readout.textContent = text
    })
    if (field) {
      const roots = scene.rootNodes.slice(firstSubjectRoot)
      const anchor = new TransformNode('Field subject', scene)
      anchor.position.set(field.offset.x, field.offset.y, field.offset.z)
      anchor.rotation.y = field.heading ?? 0
      for (const root of roots) root.parent = anchor
    }
    meshes.finishScenery({ merge: false })
    let min = new Vector3(Infinity, Infinity, Infinity)
    let max = new Vector3(-Infinity, -Infinity, -Infinity)
    let triangles = 0
    const subject = scene.meshes.slice(firstSubjectMesh)
    const meshCount = subject.filter((mesh) => mesh.isVisible).length
    for (const mesh of subject) {
      mesh.computeWorldMatrix(true)
      const { boundingBox } = mesh.getBoundingInfo()
      min = Vector3.Minimize(min, boundingBox.minimumWorld)
      max = Vector3.Maximize(max, boundingBox.maximumWorld)
      if (mesh.isVisible) triangles += mesh.getTotalIndices() / 3
    }

    max.y += entry.headroom ?? 0
    const span = max.subtract(min)
    const groundHeight = (entry.ground?.height ?? 0) + (field?.offset.y ?? 0)
    const subjectHeight = Math.max(0.4, max.y - Math.max(min.y, groundHeight))
    const center = Vector3.FromArray(entry.cameraFocus ?? [(min.x + max.x) / 2, Math.max(min.y, groundHeight) + subjectHeight * 0.43, (min.z + max.z) / 2])
    const size = entry.landscape ? 24 : Math.max(span.x, span.z, subjectHeight)
    let focusHeight = Number(values.focusHeight ?? 0.25)
    if (entry.landscape) {
      const point = { x: Number(values.x), z: Number(values.z) }
      center.set(point.x, Math.max(waterLevel, terrainHeight(point)) + focusHeight, point.z)
    }
    const groundSize = Math.max(14, size * 2.25)
    const step = size > 45 ? 5 : size > 12 ? 2 : 1
    const radius = entry.cameraRadius ?? (entry.landscape ? 24 : biome ? size * 1.15 : Math.max(3, size * 1.55 + subjectHeight * 0.6))
    const camera = new ArcRotateCamera('Workbench camera', entry.angle ?? 0.88, 1.1, radius, center.clone(), scene)
    camera.lowerRadiusLimit = entry.landscape ? 0.55 : Math.max(0.55, size * 0.12)
    camera.upperRadiusLimit = entry.landscape ? 450 : radius * 5
    camera.lowerBetaLimit = 0.035
    camera.upperBetaLimit = Math.PI - 0.06
    camera.minZ = Math.max(0.025, size / 2000)
    camera.maxZ = entry.landscape ? 950 : Math.max(600, radius * 8)
    camera.wheelDeltaPercentage = 0.045
    camera.panningSensibility = 840 / Math.max(1, size / 5)
    camera.attachControl(canvas, false)
    scene.activeCamera = camera
    const layout = entry.landscape ? createLandscapeLayout(meshes, canvas, draft, () => ({
      x: camera.target.x, z: camera.target.z,
      yaw: Math.atan2(camera.target.x - camera.globalPosition.x, camera.target.z - camera.globalPosition.z),
    })) : undefined

    const directions = Array.from({ length: Math.floor(groundSize / step) + 1 }, (_, i) => (i * step) - groundSize / 2)
    if (!entry.landscape && !field) {
      const floor = createIslandMaterial(scene, 'Workbench floor', entry.ground?.color ?? '#374a48')
      const ground = meshes.box(center.x, groundHeight - 0.19, center.z, groundSize, 0.36, groundSize, floor, undefined, false)
      ground.receiveShadows = true
    }
    const gridY = (entry.landscape ? Math.max(waterLevel, terrainHeight(center)) : groundHeight) + 0.005
    const gridOrigin = new Vector3(center.x, gridY, center.z)
    const half = groundSize / 2
    const lines = directions.flatMap((offset) => [
      [new Vector3(center.x + offset, gridY, center.z - half), new Vector3(center.x + offset, gridY, center.z + half)],
      [new Vector3(center.x - half, gridY, center.z + offset), new Vector3(center.x + half, gridY, center.z + offset)],
    ])
    const grid = CreateLineSystem('Preview grid', { lines }, scene)
    grid.color = Color3.FromHexString('#758d86')
    grid.alpha = 0.21
    grid.isPickable = false

    sunlight.position.set(center.x - 14, Math.max(21, size), center.z - 16)
    sunlight.shadowMaxZ = Math.max(biome ? 160 : 55, size * 4)
    let lighting: LightingPreset = 'daylight'
    let wireframe = false
    function applyWireframe(mesh: AbstractMesh) {
      if (mesh.material && mesh.material.wireframe !== wireframe) mesh.material.wireframe = wireframe
    }

    const pointOfView = {
      perspective: [entry.angle ?? 0.88, entry.cameraBeta ?? 1.1],
      front: [entry.angle && entry.angle < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI / 2],
      side: [0, Math.PI / 2],
      top: [Math.PI / 2, 0.04],
    }

    function setCamera(saved: CameraState, settings?: Values) {
      if (entry.landscape && settings) updateLandscapeFocus(settings)
      camera.setTarget(Vector3.FromArray(saved.target))
      camera.alpha = saved.alpha
      camera.beta = saved.beta
      camera.radius = saved.radius
      camera.fov = saved.fov ?? .8
      camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0
      camera.inertialPanningX = camera.inertialPanningY = 0
    }

    function setView(angle: Angle = entry.topView ? 'top' : 'perspective', settings?: Values) {
      if (entry.landscape && settings) updateLandscapeFocus(settings)
      const [alpha, beta] = pointOfView[angle]
      const aspect = engine.getAspectRatio(camera)
      setCamera({ alpha, beta, radius: radius * Math.max(1, 0.92 / Math.max(0.3, aspect)), target: center.asArray() })
    }

    function updateLandscapeFocus(settings: Values) {
      const point = { x: Number(settings.x), z: Number(settings.z) }
      const height = Number(settings.focusHeight ?? 0.25)
      if (center.x === point.x && center.z === point.z && focusHeight === height) return
      focusHeight = height
      const ground = Math.max(waterLevel, terrainHeight(point))
      center.set(point.x, ground + height, point.z)
      grid.position.set(point.x - gridOrigin.x, ground + 0.005 - gridOrigin.y, point.z - gridOrigin.z)
      camera.setTarget(center.clone(), false, false, true)
    }
    setView()

    return {
      meshCount,
      triangles: Math.round(triangles),
      step,
      supportsSunShafts: atmosphere?.supportsSunShafts ?? false,
      mapFocus: () => ({ x: camera.target.x, z: camera.target.z }),
      draftMapObjects: () => layout?.mapObjects() ?? [],
      placeDraftAt: (point: Point) => layout?.placeAt(point) ?? false,
      moveDraftAt: (id: number, point: Point) => layout?.moveAt(id, point) ?? false,
      selectDraft: (id: number) => layout?.select(id),
      checkZFighting: () => findZFightCandidates(layout ? [...subject, ...layout.meshes()] : subject, entry.landscape ? camera.target : undefined),
      draw(time: number, rate: number, seek: boolean, settings: Values, turntable: boolean, delta: number) {
        if (turntable) camera.alpha += delta * 0.38
        if (entry.landscape) updateLandscapeFocus(settings)
        const weather = stageWeather(entry, time, settings)
        const shaftIntensity = settings.sunShafts === false ? 0 : Number(settings.shaftIntensity ?? 100) / 100
        camera.getViewMatrix()
        const position = camera.globalPosition
        const light = atmosphere?.update(time, weather, position, true, { shaftIntensity, fogScale: field?.saltwindSubject ? 7 : 1 }) ?? 1
        update?.({ time, rate, seek, lighting, camera: position, light, rain: weather.rain, delta }, settings)
        surroundings?.({ time, delta: rate * delta, seek, weather: { hour: entry.weather ? weather.hour : 13, rain: weather.rain }, camera: position, threats: [] }, light)
        layout?.update(delta, time)
        subject.forEach(applyWireframe)
        layout?.meshes().forEach(applyWireframe)
        scene.render()
      },
      setLighting(preset: LightingPreset) {
        lighting = preset
        const { ambient, sun, color, direction } = lightingPresets[preset]
        sky.intensity = ambient
        sunlight.intensity = sun
        sunlight.diffuse = Color3.FromHexString(color)
        sunlight.direction.copyFrom(direction.normalizeToNew())
      },
      setGrid(visible: boolean) { grid.setEnabled(visible) },
      setWireframe(visible: boolean) { wireframe = visible },
      setView,
      setLandscapeView({ alpha, beta, radius }: Omit<CameraState, 'target'>) {
        updateLandscapeFocus(values)
        setCamera({ alpha, beta, radius, target: center.asArray() })
      },
      getCamera(): CameraState {
        return { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, fov: camera.fov, target: camera.target.asArray() }
      },
      setCamera,
      dispose() {
        layout?.dispose()
        camera.detachControl()
        scene.dispose()
      },
    }
  } catch (error) {
    scene.dispose()
    throw error
  }
}
