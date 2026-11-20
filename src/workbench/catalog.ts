import { createLookoutFire } from '../fire-effect'
import { createExtinguisherSpray } from '../extinguisher-spray'
import {
  createBuoy, createCrew, createDock, createFlatbed, createHarborBoat, createHomeChest, createHouse,
  createRoad, createRock, createSupply, createTrail, createTree, createUmbrella, poseCrew, poseFlatbed, poseFloating,
  umbrellaColors,
} from '../island-assets'
import { createFarm } from '../island-farm'
import { createIslandWorld } from '../island-world'
import { farmPlots } from '../farm'
import type { PlotStage } from '../farm'
import { chargePower } from '../charged-actions'
import type { MeshFactory } from '../island-meshes'
import { readAppearance, skinTones, uniforms } from '../crew-appearance'
import { createIslandMaterial, createSurfaceMaterial, surfaces } from '../materials'
import type { SurfaceName } from '../materials'
import { createOceanMaterial } from '../ocean'
import { createTextureSample, noiseTypes } from '../surface-textures'
import type { MetalType } from '../surface-textures'
import { falls, waterLevel } from '../terrain'
import { nightLighting } from '../weather'
import type { Point } from '../world'
import { footpaths, road, walkways } from '../routes'
import { buildings, cargoSlots, crateSize, jumpGravity, jumpSpeed, truckBed } from '../world'
import { createSurfaceShader } from './surface-preview'
import type { LightingPreset } from './lighting'

type Value = string | number | boolean
export type Values = Record<string, Value>

export type Control = { key: string; label: string; rebuild?: boolean } & (
  | { type: 'select'; value: string; choices: Record<string, string> }
  | { type: 'range' | 'number'; value: number; min: number; max: number; step: number }
  | { type: 'checkbox'; value: boolean }
  | { type: 'color'; value: string }
)

interface Playback {
  time: number
  rate: number
  seek: boolean
  lighting: LightingPreset
  camera: Point
  light: number
  rain: number
}

export interface Entry {
  id: string
  name: string
  group: string
  description: string
  swatch?: string
  source: string
  duration?: number
  angle?: number
  headroom?: number
  topView?: boolean
  landscape?: boolean
  ground?: { color: string; height: number }
  controls?: Control[]
  create(meshes: MeshFactory, values: Values, reportError: (error: string) => void):
    ((frame: Playback, values: Values) => void) | void
}

const models = 'src/island-assets.ts'
const control = (key: string, label: string, value: string, choices: Record<string, string>, rebuild = false): Control =>
  ({ type: 'select', key, label, value, choices, rebuild })
const range = (key: string, label: string, value: number, min: number, max: number, step: number, rebuild = false): Control =>
  ({ type: 'range', key, label, value, min, max, step, rebuild })

export const entries: Entry[] = [
  {
    id: 'flatbed', name: 'Flatbed truck', group: 'Vehicles', source: models, duration: 4,
    description: 'Inspect the truck exterior, side rails, steering, and cargo fit.',
    controls: [
      control('state', 'State', 'parked', { parked: 'Parked', driving: 'Driving', turning: 'Turning' }),
      range('steering', 'Steering angle', 28, -45, 45, 1),
      { type: 'checkbox', key: 'cargo', label: 'Show bed cargo', value: false },
      { type: 'checkbox', key: 'lights', label: 'Running lights', value: false },
      { type: 'checkbox', key: 'brake', label: 'Brake lights', value: false },
    ],
    create(meshes) {
      const truck = createFlatbed(meshes)
      const crates = cargoSlots.map((z) => {
        const crate = createSupply(meshes, 'crate')
        crate.parent = truck.root
        crate.position.set(0, truckBed.top + crateSize / 2, z)
        return crate
      })
      return ({ time }, values) => {
        const turn = Number(values.steering) * Math.PI / 180
        poseFlatbed(truck, values.state === 'parked' ? 0 : time * Math.PI * 4, values.state === 'turning' ? turn : 0)
        truck.setLights(values.lights ? 1 : 0, Boolean(values.brake))
        for (const crate of crates) crate.setEnabled(Boolean(values.cargo))
      }
    },
  },
  {
    id: 'landscape', name: 'Landscape Workbench', group: 'World', source: 'src/island-world.ts',
    description: 'Focus on map coordinates in metres, orbit and pan, and inspect scenery under different skies.',
    landscape: true, duration: 84, angle: -Math.PI / 2,
    controls: [
      { type: 'number', key: 'x', label: 'Focus X (m)', value: falls.x, min: -500, max: 500, step: 0.1 },
      { type: 'number', key: 'z', label: 'Focus Z (m)', value: falls.z, min: -500, max: 500, step: 0.1 },
      range('hour', 'Island hour', 16.5, 0, 24, 0.1),
      range('rain', 'Rain intensity', 0, 0, 1, 0.01),
    ],
    create(meshes) {
      const world = createIslandWorld(meshes)
      return ({ time, camera, light, rain }, settings) => {
        world.northernScenery.update(camera, true)
        poseFloating(world.boat, time)
        world.buoys.forEach((buoy, index) => poseFloating(buoy, time, index * 1.67))
        world.gulls(time)
        world.fishSchools(time)
        world.lights(camera, nightLighting(Number(settings.hour)))
        world.water.pose(time, light, rain)
      }
    },
  },
  {
    id: 'crew', name: 'Crew character', group: 'Crew', source: models, duration: 2.4, headroom: 1.45,
    description: 'Play or scrub the crew poses and compare uniform and skin color choices.',
    controls: [
      control('state', 'Animation', 'walk', { idle: 'Idle', walk: 'Walk', sprint: 'Sprint', jump: 'Jump', reach: 'Left reach', carry: 'Carry crate', throw: 'Throw crate', spray: 'Use extinguisher' }),
      control('uniform', 'Uniform', 'amber', Object.fromEntries(Object.entries(uniforms).map(([id, uniform]) => [id, uniform.name]))),
      control('skin', 'Skin tone', 'light', Object.fromEntries(Object.entries(skinTones).map(([id, tone]) => [id, tone.name]))),
      range('stride', 'Stride length', 1, 0.2, 1.4, 0.05),
    ],
    create(meshes) {
      const crew = createCrew(meshes, 0)
      const crate = createSupply(meshes, 'crate')
      crate.parent = crew.root
      crate.position.set(0, 1.13, 0.89)
      const tool = createSupply(meshes, 'extinguisher')
      tool.parent = crew.root
      tool.position.set(-0.49, 0.24, 0.59)
      return ({ time }, values) => {
        const sprinting = values.state === 'sprint'
        const walking = values.state === 'walk' || values.state === 'carry'
        const jumping = values.state === 'jump'
        const windup = values.state === 'throw' && time < 1.12
        const throwing = values.state === 'throw' && time >= 1.12 && time < 1.39
        const carrying = values.state === 'carry' || windup
        const spraying = values.state === 'spray'
        const reaching = values.state === 'reach' || spraying
        const jumpTime = Math.max(0, time - 0.6)
        const elevation = jumping ? Math.max(0, jumpSpeed * jumpTime - jumpGravity / 2 * jumpTime * jumpTime) : 0
        crew.root.position.y = elevation
        const stride = Number(values.stride) * (sprinting ? 0.89 : walking ? 0.57 : 0)
        crew.setAppearance(readAppearance(values))
        crew.blink(time)
        const power = windup ? chargePower('throw', time) : 0
        poseCrew(crew, time * (sprinting ? 2.5 : 5 / 3), stride, elevation > 0.08,
          carrying ? 'crate' : spraying ? 'extinguisher' : undefined, reaching ? 0.8 + 0.2 * Math.sin(time * 4) : 0, 1, power, throwing)
        crate.setEnabled(carrying)
        crate.position.y = 1.13 + power * 0.41
        tool.setEnabled(spraying)
      }
    },
  },
  {
    id: 'crate', name: 'Supply crate', group: 'Props', source: models,
    description: 'Inspect the loose cargo mesh and its proportions.',
    create(meshes) { createSupply(meshes, 'crate').position.y = crateSize / 2 },
  },
  {
    id: 'umbrella', name: 'Beach umbrella', group: 'Props', source: models,
    description: 'Preview the umbrellas and beach mats in the island palette.',
    ground: { height: 0, color: surfaces.sand.color },
    controls: [control('color', 'Canopy', '0', { 0: 'Coral', 1: 'Sunflower', 2: 'Teal' }, true)],
    create(meshes, values) { createUmbrella(meshes, 0, 0, umbrellaColors[Number(values.color)]) },
  },
  {
    id: 'tree', name: 'Trees', group: 'Props', source: models,
    description: 'Compare the broadleaf tree and the two pine variants.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [
      control('variant', 'Species', '0', { 0: 'Broadleaf', 1: 'Pine', 2: 'Dark pine' }, true),
      range('height', 'Height', 5.4, 3.2, 7.8, 0.1, true),
    ],
    create(meshes, values) { createTree(meshes, 0, 0, Number(values.height), Number(values.variant)) },
  },
  {
    id: 'rock', name: 'Shore rocks', group: 'Props', source: models,
    description: 'Check the rock silhouette and how much sits below the surface.',
    ground: { height: 0, color: surfaces.sand.color },
    controls: [
      range('size', 'Size', 2.5, 0.65, 3.35, 0.05, true),
      { type: 'checkbox', key: 'light', label: 'Light stone', value: false, rebuild: true },
      { type: 'checkbox', key: 'offshore', label: 'Lower into shoreline', value: false, rebuild: true },
    ],
    create(meshes, values) { createRock(meshes, 0, 0, Number(values.size), 0.36, Boolean(values.light), values.offshore ? -0.45 : 0) },
  },
  {
    id: 'house', name: 'Island houses', group: 'Props', source: models, angle: -0.98,
    description: 'Inspect the exterior, windows, roofline, and foundation of each building.',
    controls: [control('variant', 'Building', '0', {
      0: 'Harbor Depot', 1: 'Harbor workshop', 2: 'Seabrook house', 3: 'Seabrook brick house',
      4: 'Seabrook cottage', 5: 'Seabrook shop', 6: 'Seabrook teal house', 7: 'Fire supplies', 8: 'Forest Lookout',
      9: 'Amber crew home', 10: 'Blue crew home',
    }, true)],
    create(meshes, values) { createHouse(meshes, { ...buildings[Number(values.variant)], x: 0, z: 0 }) },
  },
  {
    id: 'chest', name: 'Home chest', group: 'Props', source: models,
    description: 'Inspect the lid, latch, and trim on crew storage.',
    controls: [range('lid', 'Lid angle', 0, 0, 55, 1)],
    create(meshes) {
      const chest = createHomeChest(meshes, { x: 0, z: 0 }, '#4faba4')
      return (_, settings) => { chest.hinge.rotation.x = Number(settings.lid) * Math.PI / 180 }
    },
  },
  {
    id: 'farm', name: 'Carrot plots', group: 'Props', source: 'src/island-farm.ts',
    description: 'Compare soil and carrot growth through each stage of the crop.',
    controls: [control('plot', 'Growth stage', 'ripe', { grass: 'Grass', tilled: 'Tilled', planted: 'Planted', watered: 'Watered', ripe: 'Ripe' })],
    create(meshes, values) {
      const show = createFarm(meshes)
      let stage = values.plot as PlotStage
      const poses = farmPlots.map(() => stage)
      show(poses)
      return (_, settings) => {
        if (settings.plot === stage) return
        stage = settings.plot as PlotStage
        show(poses.fill(stage))
      }
    },
  },
  {
    id: 'dock', name: 'Harbor dock', group: 'Props', source: models,
    description: 'Inspect the dock planks and posts from above or alongside.',
    ground: { height: waterLevel, color: surfaces.water.color },
    create: createDock,
  },
  {
    id: 'boat', name: 'Harbor boat', group: 'Props', source: models,
    description: 'Inspect the skiff hull, bench seats, and gentle motion at the dock.',
    ground: { height: waterLevel, color: surfaces.water.color }, duration: 8,
    create(meshes) {
      const boat = createHarborBoat(meshes)
      return ({ time }) => poseFloating(boat, time, 0.5, 0.048)
    },
  },
  {
    id: 'buoy', name: 'Buoy', group: 'Props', source: models,
    description: 'Inspect the harbor marker as it bobs at the waterline.',
    ground: { height: waterLevel, color: surfaces.water.color }, duration: 8,
    create(meshes) {
      const buoy = createBuoy(meshes, 0, 0)
      return ({ time }) => poseFloating(buoy, time, 0.3)
    },
  },
  {
    id: 'extinguisher', name: 'Extinguisher mist', group: 'Effects', source: 'src/extinguisher-spray.ts', duration: 3.5,
    description: 'Trigger the spray and inspect nozzle alignment, spread, and falloff.',
    angle: 0.36,
    controls: [
      control('mode', 'Emission', 'burst', { idle: 'Off', burst: 'Burst loop', continuous: 'Continuous' }),
      range('rate', 'Particles per second', 155, 35, 300, 5),
    ],
    create(meshes) {
      const tool = createSupply(meshes, 'extinguisher')
      tool.position.set(0, 0.6, -2.3)
      const spray = createExtinguisherSpray(meshes.scene)
      // Bound the visible stream when framing the preview.
      const extent = meshes.box(0, 1.35, 0.7, 2.4, 1.5, 6.6, '#ffffff', tool, false)
      extent.parent = null
      extent.isVisible = false
      return ({ time, rate, seek }, values) => {
        const opening = 0.25
        const stopping = 2.4
        let elapsed = 0
        let since = 0
        if (values.mode === 'continuous') elapsed = time + 0.53
        if (values.mode === 'burst') {
          elapsed = Math.max(0, Math.min(time, stopping) - opening)
          since = Math.max(0, time - stopping)
        }
        spray.setRate(Number(values.rate))
        if (seek) spray.seek(tool, elapsed, since)
        spray.setPlaybackSpeed(rate)
        spray.update(tool, elapsed > 0 && since === 0)
      }
    },
  },
  {
    id: 'fire', name: 'Lookout fire', group: 'Effects', source: 'src/fire-effect.ts', duration: 5, headroom: 2.8,
    description: 'Preview the flame shapes and lower the intensity to simulate suppression.',
    controls: [range('intensity', 'Intensity', 1, 0, 1, 0.01)],
    create(meshes) {
      const fire = createLookoutFire(meshes.scene)
      const extent = meshes.box(0.4, 1.55, 0, 3.6, 3.1, 2.8, '#ffffff', undefined, false)
      extent.isVisible = false
      return ({ time, rate, seek }, values) => fire.pose(time, Number(values.intensity), rate, seek)
    },
  },
  {
    id: 'road', name: 'Island road', group: 'Routes', source: 'src/routes.ts', angle: 1.03,
    description: 'Inspect the full road ribbon, shoulders, and lane markings through both bends.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [
      range('width', 'Pavement width', 6, 3, 12, 0.2, true),
      { type: 'checkbox', key: 'shoulder', label: 'Show shoulder', value: true },
      { type: 'checkbox', key: 'markings', label: 'Show markings', value: true },
    ],
    create(meshes, values) {
      const route = createRoad(meshes, road, Number(values.width))
      return (_, options) => {
        route.shoulder.setEnabled(Boolean(options.shoulder))
        route.markings.setEnabled(Boolean(options.markings))
      }
    },
  },
  {
    id: 'trail', name: 'Footpaths', group: 'Routes', source: 'src/routes.ts',
    description: 'Check the rounded path geometry used by the lookout, beach, and harbor trails.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [
      control('route', 'Path', '0', { 0: 'Lookout', 1: 'Beach', 2: 'Harbor' }, true),
      range('width', 'Width multiplier', 1, 0.5, 1.8, 0.05, true),
    ],
    create(meshes, values) {
      const path = footpaths[Number(values.route)]
      createTrail(meshes, path.name, path.points, path.width * Number(values.width))
    },
  },
  {
    id: 'pavement', name: 'Neighborhood pavement', group: 'Routes', source: 'src/routes.ts',
    description: 'Inspect the paved walks and approaches around Seabrook houses.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [control('route', 'Walkway', '0', { 0: 'North neighborhood', 1: 'South neighborhood', 2: 'House entrance', 3: 'East houses' }, true)],
    create(meshes, values) {
      const path = walkways[Number(values.route)]
      createTrail(meshes, path.name, path.points, path.width, true)
    },
  },
  {
    id: 'texture-gallery', name: 'Texture gallery', group: 'Materials', source: 'src/surface-textures.ts',
    description: 'From top left, grass, gravel, sand, concrete, wood, stone, leaves, metal, and water.',
    topView: true,
    controls: [
      control('pattern', 'Texture family', 'surface', noiseTypes, true),
      range('spacing', 'Feature spacing', 1, 0.45, 2.4, 0.05, true),
    ],
    create(meshes, values) {
      const palette = ['grass', 'gravel', 'sand', 'concrete', 'wood', 'stone', 'leaves', 'metal', 'water'] as const
      const spacing = Number(values.spacing)
      const family = String(values.pattern)
      const repeated = family === 'surface' ? undefined : createTextureSample(meshes.scene, family, 1 / spacing, 0.57).diffuse
      for (const [i, surface] of palette.entries()) {
        const color = surfaces[surface].color
        const material = repeated
          ? createIslandMaterial(meshes.scene, surface, color)
          : createSurfaceMaterial(meshes.scene, surface, undefined, { grainSize: spacing })
        if (repeated && 'diffuseTexture' in material) material.diffuseTexture = repeated
        const tile = meshes.box((1 - i % 3) * 2.48, 0.07, (Math.floor(i / 3) - 1) * 2.48,
          2.25, 0.14, 2.25, material, undefined, false)
        tile.receiveShadows = true
      }
    },
  },
  {
    id: 'shader-drafts', name: 'Shader drafts', group: 'Materials', source: 'src/workbench/surface.frag.glsl', duration: 12,
    description: 'A stage for iterating on the editable shader source.',
    controls: [control('surface', 'Substance', 'water', Object.fromEntries(
      Object.entries(surfaces).map(([key, value]) => [key, value.name]),
    ), true)],
    create(meshes, values, reportError) {
      const surface = surfaces[values.surface as SurfaceName]
      const draft = createSurfaceShader(meshes.scene, surface.pattern, reportError)
      meshes.box(0, 0.1, 0, 3.6, 0.2, 3.6, draft.shader, undefined, false)
      return ({ lighting, time }) => draft.apply(lighting, surface.color, surface.scale, 1, time)
    },
  },
  ...Object.entries(surfaces).map(([id, surface]): Entry => ({
    id, name: surface.name, group: 'Materials', swatch: surface.color, source: 'src/materials.ts',
    duration: id === 'water' ? 12 : undefined,
    description: id === 'metal'
      ? 'Compare steel, brass, and copper with brushed wear and oxidation.'
      : 'Adjust the surface finish and compare it under different lighting.',
    controls: materialControls(id as SurfaceName),
    create(meshes, values) {
      const name = id as SurfaceName
      const color = typeof values.color === 'string' ? values.color : undefined
      const grainSize = Number(values.size ?? 1)
      const strength = Number(values.detail ?? 1)
      const water = id === 'water' ? createOceanMaterial(meshes.scene, true) : undefined
      water?.setAppearance(color ?? surface.color, grainSize, strength)
      const finish = water?.material ?? createSurfaceMaterial(meshes.scene, name, color, {
        grainSize, contrast: strength, relief: Number(values.relief ?? 1),
        striations: id === 'wood' ? Number(values.striations) : undefined,
        metalType: id === 'metal' ? values.metal as MetalType : undefined,
        abrasion: id === 'metal' ? Number(values.abrasion) : undefined,
        oxidation: id === 'metal' ? Number(values.oxidation) : undefined,
      })
      const sample = values.shape === 'sphere'
        ? meshes.sphere(0, 1.4, 0, 2.8, 2.8, 2.8, finish, undefined, false, 36)
        : meshes.box(0, values.shape === 'tile' ? 0.1 : 1.25, 0, 3.6, values.shape === 'tile' ? 0.2 : 2.5, 3.6, finish, undefined, false)
      sample.receiveShadows = true
      return water ? ({ time }) => water.pose(time) : undefined
    },
  })),
]

function materialControls(surface: SurfaceName): Control[] {
  const defaultShape = ['water', 'sand', 'gravel', 'grass', 'concrete'].includes(surface) ? 'tile' : 'sphere'
  const shape = control('shape', 'Sample shape', defaultShape, { sphere: 'Sphere', tile: 'Tile', block: 'Block' }, true)
  if (surface === 'metal') {
    return [
      shape,
      control('metal', 'Metal', 'steel', { steel: 'Steel', brass: 'Brass', copper: 'Copper' }, true),
      range('abrasion', 'Abrasion', 0.34, 0, 1, 0.01, true),
      range('oxidation', 'Oxidation', 0, 0, 1, 0.01, true),
      range('size', 'Scratch spacing', 1, 0.45, 2.5, 0.05, true),
    ]
  }
  const features = {
    water: ['Water tint', 'Wave size', 'Choppiness', ''],
    gravel: ['Stone tone', 'Chip size', 'Stone contrast', 'Chip relief'],
    sand: ['Sand tone', 'Ripple spacing', 'Ripple contrast', 'Ripple relief'],
    concrete: ['Cement tone', 'Aggregate size', 'Mottling', 'Pitting'],
    wood: ['Timber tone', 'Grain spacing', 'Grain contrast', 'Grain relief'],
    stone: ['Stone tone', 'Grain size', 'Vein contrast', 'Surface relief'],
    leaves: ['Leaf tone', 'Leaf size', 'Vein contrast', 'Vein relief'],
    grass: ['Grass tone', 'Blade spacing', 'Patch contrast', 'Ground relief'],
  }[surface]
  const [tone, size, contrast, relief] = features
  const choices: Control[] = [
    shape,
    { type: 'color', key: 'color', label: tone, value: surfaces[surface].color, rebuild: true },
    range('size', size, 1, 0.45, 3, 0.05, true),
    range('detail', contrast, 1, 0, 2, 0.05, true),
  ]
  if (relief) choices.push(range('relief', relief, 1, 0, 2, 0.05, true))
  if (surface === 'wood') choices.push(range('striations', 'Grain striations', 25, 8, 55, 1, true))
  return choices
}
