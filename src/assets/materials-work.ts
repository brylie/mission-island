import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { materialsOpen, repairMaterials, sourceOpen, type RepairMaterial } from '../materials-work'
import type { Snapshot } from '../protocol'
import { groundHeight } from '../terrain'
import type { Point } from '../world'
import { edgingSections, materialSources, repairChoices, repairSite, sampleTray } from '../worlds/starter/materials'
import { repairEdging, repairMarker, repairSampleTray, stoneSample, timberSample } from './geometry/materials-work'

const half = 0.5

function groupAt(meshes: MeshFactory, name: string, point: Point) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(point.x, groundHeight(point), point.z)
  root.setEnabled(false)
  return root
}

function markedPost(meshes: MeshFactory, root: TransformNode, x: number, height: number) {
  const { post, tag } = repairMarker
  meshes.box(x, height * half, 0, post.width, height, post.depth, post.finish, root)
  meshes.box(x, height - tag.margin, 0, ...tag.size, tag.finish, root).rotation.z = tag.tilt
}

function sample(meshes: MeshFactory, root: TransformNode, material: RepairMaterial, y: number) {
  if (material === 'timber') {
    const { branch, twig, end } = timberSample
    const bark = meshes.paintSurface('wood', timberSample.bark)
    meshes.cylinder(0, y + branch.y, 0, ...branch.shape, bark, root).rotation.z = branch.tilt
    meshes.cylinder(twig.center[0], y + twig.center[1], twig.center[2], ...twig.shape, bark, root).rotation.set(...twig.rotation)
    meshes.cylinder(end.center[0], y + end.center[1], end.center[2], ...end.shape, end.finish, root).rotation.z = branch.tilt
  }
  else {
    const { main, chip, segments } = stoneSample
    meshes.sphere(0, y + main.y, 0, ...main.size, main.finish, root, true, segments).rotation.y = main.turn
    meshes.sphere(chip.center[0], y + chip.center[1], chip.center[2], ...chip.size, chip.finish, root, true, segments)
  }
}

function edging(meshes: MeshFactory, section: Point, material: RepairMaterial) {
  const root = groupAt(meshes, `${material} edging`, section)
  if (material === 'timber') {
    const { beam, stakes } = repairEdging.timber
    meshes.box(0, beam.y, 0, ...beam.size, meshes.paintSurface('wood', beam.finish), root)
    for (const z of stakes.z) meshes.box(stakes.x, stakes.y, z, ...stakes.size, stakes.finish, root)
  }
  else {
    const { rocks, y, width, height, heightStep, depth, segments, turnStep } = repairEdging.stone
    for (const [index, { z, finish }] of rocks.entries()) {
      const rock = meshes.sphere(0, y, z, width, height + index * heightStep, depth, finish, root, true, segments)
      rock.rotation.y = index * turnStep
    }
  }
  return root
}

export function createMaterialsWorkView(meshes: MeshFactory) {
  const { source, choice: option } = repairMarker
  const sources = repairMaterials.map((material) => {
    const marker = groupAt(meshes, materialSources[material].name, materialSources[material])
    markedPost(meshes, marker, source.x, source.height)
    marker.rotation.y = source.facing
    const pickup = new TransformNode(`${material} pickup`, meshes.scene)
    pickup.parent = marker
    sample(meshes, pickup, material, 0)
    return { material, marker, pickup }
  })
  const tray = groupAt(meshes, 'Wren’s sample tray', sampleTray)
  const { legs, shelf, rails } = repairSampleTray
  for (const x of legs.x) meshes.box(x, legs.y, 0, ...legs.size, legs.finish, tray)
  meshes.box(0, shelf.y, 0, ...shelf.size, shelf.finish, tray)
  for (const z of rails.z) meshes.box(0, rails.y, z, ...rails.size, rails.finish, tray)

  const site = groupAt(meshes, repairSite.name, repairSite)
  markedPost(meshes, site, 0, repairMarker.site.height)
  const choices = repairMaterials.map((material) => {
    const choice = groupAt(meshes, `${material} option`, repairChoices[material])
    markedPost(meshes, choice, 0, option.height)
    meshes.box(0, option.shelf.y, 0, ...option.shelf.size, option.shelf.finish, choice)
    sample(meshes, choice, material, option.sampleY)
    return choice
  })
  const sections = edgingSections.map((section) => ({ timber: edging(meshes, section, 'timber'), stone: edging(meshes, section, 'stone') }))

  return (state: Snapshot) => {
    const { checkout, request, readyAt } = state.materialsWork
    for (const { material, marker, pickup } of sources) {
      marker.setEnabled(sourceOpen(state, material))
      pickup.setEnabled(readyAt[material] <= state.islandTime)
    }
    tray.setEnabled(materialsOpen(state) && checkout !== 'qualified')
    site.setEnabled(checkout === 'qualified')
    for (const choice of choices) choice.setEnabled(checkout === 'qualified' && !request)
    for (const [index, section] of sections.entries()) {
      for (const material of repairMaterials) section[material].setEnabled(request?.material === material && index < request.delivered)
    }
  }
}
