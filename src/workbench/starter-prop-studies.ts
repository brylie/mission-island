import { createBuoy, createDock, poseFloating } from '../assets/waterfront'
import { createHomeChest, createRock, createSupply, createTree, createUmbrella, umbrellaColors } from '../assets/props'
import { starterPropControls } from '../assets/recipes/workbench-starter-props'
import { surfaces } from '../materials'
import { waterLevel } from '../terrain'
import { crateSize } from '../world'
import { control, range, type Entry } from './subject'

const halves = 2
const degreesPerHalfTurn = 180
const rockHeading = 0.36
const submergedRockY = -0.45
const buoyPreviewDuration = 8
const buoyPhase = 0.3

export const starterSceneryStudies: Entry[] = [
  {
    id: 'crate',
    name: 'Supply crate',
    group: 'Props',
    source: 'src/assets/props.ts',
    description: 'Inspect the loose cargo mesh and its proportions.',
    create(meshes) { createSupply(meshes, 'crate').position.y = crateSize / halves },
  },
  {
    id: 'umbrella',
    name: 'Beach umbrella',
    group: 'Props',
    source: 'src/assets/props.ts',
    description: 'Preview the umbrellas and beach mats in the island palette.',
    ground: { height: 0, color: surfaces.sand.color },
    controls: [control('color', 'Canopy', '0', starterPropControls.canopyColor, true)],
    create(meshes, values) { createUmbrella(meshes, 0, 0, umbrellaColors[Number(values.color)]) },
  },
  {
    id: 'tree',
    name: 'Trees',
    group: 'Plants',
    source: 'src/assets/props.ts',
    description: 'Compare the broadleaf tree and the two pine variants.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [
      control('variant', 'Species', '0', starterPropControls.treeVariant, true),
      range('height', 'Height', ...starterPropControls.treeHeight, true),
    ],
    create(meshes, values) { createTree(meshes, 0, 0, Number(values.height), Number(values.variant)) },
  },
  {
    id: 'rock',
    name: 'Shore rocks',
    group: 'Props',
    source: 'src/assets/props.ts',
    description: 'Check the rock silhouette and how much sits below the surface.',
    ground: { height: 0, color: surfaces.sand.color },
    controls: [
      range('size', 'Size', ...starterPropControls.rockSize, true),
      { type: 'checkbox', key: 'light', label: 'Light stone', value: false, rebuild: true },
      { type: 'checkbox', key: 'offshore', label: 'Lower into shoreline', value: false, rebuild: true },
    ],
    create(meshes, values) { createRock(meshes, 0, 0, Number(values.size), rockHeading, Boolean(values.light), values.offshore ? submergedRockY : 0) },
  },
]

export const homeChestStudy: Entry = {
  id: 'chest',
  name: 'Home chest',
  group: 'Props',
  source: 'src/assets/props.ts',
  description: 'Inspect the lid, latch, and trim on crew storage.',
  controls: [range('lid', 'Lid angle', ...starterPropControls.lidAngle)],
  create(meshes) {
    const chest = createHomeChest(meshes, { x: 0, z: 0 }, '#4faba4')
    return (_, settings) => {
      chest.hinge.rotation.x = Number(settings.lid) * Math.PI / degreesPerHalfTurn
    }
  },
}

export const dockStudy: Entry = {
  id: 'dock',
  name: 'Harbor dock',
  group: 'Props',
  source: 'src/assets/waterfront.ts',
  description: 'Inspect the dock planks and posts from above or alongside.',
  ground: { height: waterLevel, color: surfaces.water.color },
  create(meshes) { createDock(meshes) },
}

export const buoyStudy: Entry = {
  id: 'buoy',
  name: 'Buoy',
  group: 'Props',
  source: 'src/assets/waterfront.ts',
  description: 'Inspect the harbor marker as it bobs at the waterline.',
  ground: { height: waterLevel, color: surfaces.water.color },
  duration: buoyPreviewDuration,
  create(meshes) {
    const buoy = createBuoy(meshes, 0, 0)
    return ({ time }) => poseFloating(buoy, time, buoyPhase)
  },
}
