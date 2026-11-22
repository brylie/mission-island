import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import type { Engine } from '@babylonjs/core/Engines/engine'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Scene } from '@babylonjs/core/scene'
import { studioCamera, studioCrewLighting, studioFieldAtmosphere, studioGrid, studioSunlight } from '../assets/recipes/workbench-stage'
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
  // The default radius of the subject this view was framed for. Kept views carry it, so growth in small steps still reframes.
  framed?: number
}

export type Angle = 'perspective' | 'front' | 'side' | 'top'

const halves = 2
const indicesPerTriangle = 3
const percentScale = 100
const quarterTurn = Math.PI / halves

function stageAtmosphere(scene: Scene, lighting: ReturnType<typeof createIslandLighting>, entry: Entry, field?: FieldSite) {
  if (entry.landscape || entry.weather) scene.fogMode = Scene.FOGMODE_LINEAR
  if (!entry.landscape && entry.id !== 'biome' && !entry.weather) return
  const { sky, sunlight, shadows } = lighting
  return createAtmosphere(scene, sky, sunlight, shadows, field?.saltwindSubject ? studioFieldAtmosphere.saltwindSkySize : undefined, field?.saltwindSubject ? brinewickRainRoof : undefined)
}

function stageWeather(entry: Entry, time: number, settings: Values) {
  return entry.weather?.(time, settings) ?? {
    hour: Number(settings.hour),
    rain: entry.id === 'biome' ? Number(settings.rain) / percentScale : entry.landscape ? Number(settings.rain) : 0,
  }
}

function applyStageLighting(sceneLighting: ReturnType<typeof createIslandLighting>, preset: LightingPreset, crew: boolean) {
  const { ambient, sun, color, direction } = lightingPresets[preset]
  const { sky, sunlight, shadows } = sceneLighting
  sky.intensity = crew && preset === 'daylight' ? studioCrewLighting.ambientDaylight : ambient
  sunlight.intensity = sun
  sunlight.diffuse = Color3.FromHexString(color)
  const key = crew ? new Vector3(direction.x, direction.y, studioCrewLighting.keyDirectionZ) : direction
  sunlight.direction.copyFrom(key.normalizeToNew())
  if (crew) shadows.setDarkness(studioCrewLighting.shadows)
}

function createPreviewCamera(scene: Scene, canvas: HTMLCanvasElement, entry: Entry, values: Values, subject: AbstractMesh[], field?: FieldSite) {
  const biome = entry.id === 'biome'
  let min = new Vector3(Infinity, Infinity, Infinity)
  let max = new Vector3(-Infinity, -Infinity, -Infinity)
  let triangles = 0
  let meshCount = 0
  for (const mesh of subject) {
    mesh.computeWorldMatrix(true)
    const { boundingBox } = mesh.getBoundingInfo()
    min = Vector3.Minimize(min, boundingBox.minimumWorld)
    max = Vector3.Maximize(max, boundingBox.maximumWorld)
    if (mesh.isVisible) {
      meshCount++
      triangles += mesh.getTotalIndices() / indicesPerTriangle
    }
  }

  max.y += entry.headroom ?? 0
  const span = max.subtract(min)
  const groundHeight = (entry.ground?.height ?? 0) + (field?.offset.y ?? 0)
  const smallSample = (entry.cameraRadius ?? Infinity) < studioCamera.smallSampleRadius
  const subjectHeight = Math.max(smallSample ? studioCamera.smallSampleMinimumHeight : studioCamera.minimumSubjectHeight, max.y - Math.max(min.y, groundHeight))
  const center = Vector3.FromArray(entry.cameraFocus ?? [
    (min.x + max.x) / halves,
    Math.max(min.y, groundHeight) + subjectHeight * studioCamera.aimHeightRatio,
    (min.z + max.z) / halves,
  ])
  if (field?.surface) center.set(field.offset.x, field.offset.y, field.offset.z)
  const size = field?.surface?.radius ?? (entry.landscape ? studioCamera.landscapeRadius : Math.max(span.x, span.z, subjectHeight))
  const focusHeight = Number(values.focusHeight ?? studioCamera.landscapeFocusHeight)
  if (entry.landscape) {
    const point = { x: Number(values.x), z: Number(values.z) }
    center.set(point.x, Math.max(waterLevel, terrainHeight(point)) + focusHeight, point.z)
  }
  const groundSize = Math.max(studioGrid.minimumSpan, size * studioGrid.spanScale)
  const step = size > studioGrid.coarseThreshold ? studioGrid.coarseSpacing : size > studioGrid.mediumThreshold ? studioGrid.mediumSpacing : 1
  const { subjectRadius, zoom, orbit, clipping } = studioCamera
  const radius = field?.surface?.radius ?? entry.cameraRadius
    ?? (entry.landscape ? studioCamera.landscapeRadius : biome ? size * studioCamera.biomeRadiusScale : Math.max(subjectRadius.min, size * subjectRadius.spanScale + subjectHeight * subjectRadius.heightScale))
  const closeFraming = smallSample || Boolean(field?.surface)
  const camera = new ArcRotateCamera('Workbench camera', entry.angle ?? studioCamera.alpha, studioCamera.beta, radius, center.clone(), scene)
  camera.lowerRadiusLimit = closeFraming ? Math.max(zoom.closeMin, Math.min(zoom.minRadius, radius * zoom.closeScale)) : entry.landscape ? zoom.minRadius : Math.max(zoom.minRadius, size * zoom.minSpanScale)
  camera.upperRadiusLimit = entry.landscape || field?.surface ? zoom.range : radius * zoom.rangeScale
  camera.lowerBetaLimit = orbit.minBeta
  camera.upperBetaLimit = Math.PI - orbit.nadirInset
  camera.minZ = Math.max(closeFraming ? clipping.closeNear : clipping.near, size / clipping.nearSpanDivisor)
  camera.maxZ = entry.landscape ? clipping.landscapeFar : Math.max(clipping.far, radius * clipping.farRadiusScale)
  camera.wheelDeltaPercentage = zoom.wheelStep
  camera.panningSensibility = orbit.panSensitivity / Math.max(1, size / orbit.panSpan)
  camera.attachControl(canvas, false)
  scene.activeCamera = camera
  return { camera, center, size, radius, groundSize, groundHeight, step, triangles, meshCount }
}

export function createStage(engine: Engine, canvas: HTMLCanvasElement, entry: Entry, values: Values, reportError: (error: string) => void, draft: ReturnType<typeof createLandscapeDraft>, field?: FieldSite) {
  const scene = new Scene(engine)
  const biome = entry.id === 'biome'
  try {
    scene.clearColor = Color4.FromHexString('#1b292aff')
    const sceneLighting = createIslandLighting(scene)
    const { sunlight, shadows } = sceneLighting
    const atmosphere = stageAtmosphere(scene, sceneLighting, entry, field)
    const surroundings = field ? createFieldScenery(createMeshFactory(scene, shadows), field) : undefined
    if (field) scene.clearColor = Color4.FromHexString('#b7d3d7ff')
    const firstSubjectRoot = scene.rootNodes.length
    const firstSubjectMesh = scene.meshes.length
    const meshes = createMeshFactory(scene, shadows)
    const readout = document.getElementById('subject-observations')!
    const update = !field?.surface
      ? entry.create(meshes, values, reportError, (text) => {
          if (readout.textContent !== text) readout.textContent = text
        }, field)
      : undefined
    if (field && !field.surface) {
      const roots = scene.rootNodes.slice(firstSubjectRoot)
      const anchor = new TransformNode('Field subject', scene)
      anchor.position.set(field.offset.x, field.offset.y, field.offset.z)
      anchor.rotation.y = field.heading ?? 0
      for (const root of roots) root.parent = anchor
    }
    meshes.finishScenery({ merge: false })
    const subject = surroundings?.surfaceMeshes ?? scene.meshes.slice(firstSubjectMesh)
    const { camera, center, size, radius, groundSize, groundHeight, step, triangles, meshCount }
      = createPreviewCamera(scene, canvas, entry, values, subject, field)
    let focusHeight = Number(values.focusHeight ?? studioCamera.landscapeFocusHeight)
    const layout = entry.landscape
      ? createLandscapeLayout(meshes, canvas, draft, () => ({
          x: camera.target.x,
          z: camera.target.z,
          yaw: Math.atan2(camera.target.x - camera.globalPosition.x, camera.target.z - camera.globalPosition.z),
        }))
      : undefined

    const directions = Array.from({ length: Math.floor(groundSize / step) + 1 }, (_, i) => (i * step) - groundSize / halves)
    if (!entry.landscape && !field) {
      const floor = createIslandMaterial(scene, 'Workbench floor', entry.ground?.color ?? '#374a48')
      const ground = meshes.box(center.x, groundHeight - studioGrid.ground.drop, center.z, groundSize, studioGrid.ground.thickness, groundSize, floor, undefined, false)
      ground.receiveShadows = true
    }
    const gridY = (entry.landscape ? Math.max(waterLevel, terrainHeight(center)) : groundHeight) + studioGrid.lift
    const gridOrigin = new Vector3(center.x, gridY, center.z)
    const half = groundSize / halves
    const lines = directions.flatMap((offset) => [
      [new Vector3(center.x + offset, gridY, center.z - half), new Vector3(center.x + offset, gridY, center.z + half)],
      [new Vector3(center.x - half, gridY, center.z + offset), new Vector3(center.x + half, gridY, center.z + offset)],
    ])
    const grid = CreateLineSystem('Preview grid', { lines }, scene)
    grid.color = Color3.FromHexString(studioGrid.color)
    grid.alpha = studioGrid.opacity
    grid.isPickable = false

    const studioCrew = entry.id === 'crew' && !field
    sunlight.position.set(center.x + studioSunlight.x, Math.max(studioSunlight.minimumHeight, size), center.z + (studioCrew ? studioCrewLighting.lightZ : studioSunlight.z))
    sunlight.shadowMaxZ = Math.max(biome ? studioSunlight.biomeShadowRange : studioSunlight.shadowRange, size * studioSunlight.shadowSpanScale)
    let lighting: LightingPreset = 'daylight'
    let framed = radius
    let wireframe = false
    function applyWireframe(mesh: AbstractMesh) {
      if (mesh.material && mesh.material.wireframe !== wireframe) mesh.material.wireframe = wireframe
    }

    const pointOfView = {
      perspective: [field?.surface?.alpha ?? entry.angle ?? studioCamera.alpha, field?.surface?.beta ?? entry.cameraBeta ?? studioCamera.beta],
      front: [entry.angle && entry.angle < 0 ? -quarterTurn : quarterTurn, quarterTurn],
      side: [0, quarterTurn],
      top: [quarterTurn, studioCamera.topBeta],
    }

    function setCamera(saved: CameraState, settings?: Values) {
      if (entry.landscape && settings) updateLandscapeFocus(settings)
      camera.setTarget(Vector3.FromArray(saved.target))
      camera.alpha = saved.alpha
      camera.beta = saved.beta
      camera.radius = saved.radius
      camera.fov = saved.fov ?? studioCamera.fov
      camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0
      camera.inertialPanningX = camera.inertialPanningY = 0
      framed = saved.framed ?? radius
    }

    function frame(alpha: number, beta: number, fov?: number) {
      const aspect = engine.getAspectRatio(camera)
      setCamera({ alpha, beta, fov, radius: radius * Math.max(1, studioCamera.fit.aspect / Math.max(studioCamera.fit.minAspect, aspect)), target: center.asArray() })
    }

    function setView(angle: Angle = entry.topView ? 'top' : 'perspective', settings?: Values) {
      if (entry.landscape && settings) updateLandscapeFocus(settings)
      const [alpha, beta] = pointOfView[angle]
      frame(alpha, beta)
    }

    function updateLandscapeFocus(settings: Values) {
      const point = { x: Number(settings.x), z: Number(settings.z) }
      const height = Number(settings.focusHeight ?? studioCamera.landscapeFocusHeight)
      if (center.x === point.x && center.z === point.z && focusHeight === height) return
      focusHeight = height
      const ground = Math.max(waterLevel, terrainHeight(point))
      center.set(point.x, ground + height, point.z)
      grid.position.set(point.x - gridOrigin.x, ground + studioGrid.lift - gridOrigin.y, point.z - gridOrigin.z)
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
        if (turntable) camera.alpha += delta * studioCamera.orbit.turntableRate
        if (entry.landscape) updateLandscapeFocus(settings)
        if (field?.surface) camera.minZ = Math.max(studioCamera.clipping.fieldNear, camera.radius / studioCamera.clipping.fieldNearDivisor)
        const weather = stageWeather(entry, time, settings)
        const shaftIntensity = settings.sunShafts === false ? 0 : Number(settings.shaftIntensity ?? percentScale) / percentScale
        camera.getViewMatrix()
        const position = camera.globalPosition
        const light = atmosphere?.update(time, weather, position, true, { shaftIntensity, fogScale: field?.saltwindSubject ? studioFieldAtmosphere.saltwindFogScale : 1 }) ?? 1
        update?.({ time, rate, seek, lighting, camera: position, light, rain: weather.rain, delta }, settings)
        surroundings?.update({ time, delta: rate * delta, seek, weather: { hour: entry.weather ? weather.hour : studioFieldAtmosphere.defaultHour, rain: weather.rain }, camera: position, threats: [] }, light)
        layout?.update(delta, time)
        subject.forEach(applyWireframe)
        layout?.meshes().forEach(applyWireframe)
        scene.render()
      },
      setLighting(preset: LightingPreset) {
        lighting = preset
        applyStageLighting(sceneLighting, preset, studioCrew)
      },
      setGrid(visible: boolean) { grid.setEnabled(visible) },
      setWireframe(visible: boolean) { wireframe = visible },
      setView,
      setLandscapeView({ alpha, beta, radius }: Omit<CameraState, 'target'>) {
        updateLandscapeFocus(values)
        setCamera({ alpha, beta, radius, target: center.asArray() })
      },
      getCamera(): CameraState {
        return { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, fov: camera.fov, target: camera.target.asArray(), framed }
      },
      setCamera,
      // Restores a view of the same subject. With `reframe`, a subject that grew or shrank past the reframe ratio
      // since the view was framed is framed afresh from the same angle.
      keepCamera(saved: CameraState, reframe: boolean) {
        const anchor = saved.framed ?? radius
        if (!reframe || Math.max(anchor, radius) / Math.min(anchor, radius) <= studioCamera.reframeRatio) setCamera(saved)
        else frame(saved.alpha, saved.beta, saved.fov)
      },
      dispose() {
        layout?.dispose()
        camera.detachControl()
        scene.dispose()
      },
    }
  }
  catch (error) {
    scene.dispose()
    throw error
  }
}
