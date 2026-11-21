import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { materialsOpen, repairMaterials, sourceOpen, type RepairMaterial } from '../materials-work'
import type { Snapshot } from '../protocol'
import { groundHeight } from '../terrain'
import type { Point } from '../world'
import { edgingSections, materialSources, repairChoices, repairSite, sampleTray } from '../worlds/starter/materials'

function groupAt(meshes: MeshFactory, name: string, point: Point) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(point.x, groundHeight(point), point.z)
  root.setEnabled(false)
  return root
}

function markedPost(meshes: MeshFactory, root: TransformNode, x: number, height: number) {
  meshes.box(x, height / 2, 0, 0.09, height, 0.09, '#625449', root)
  const tag = meshes.box(x, height - 0.08, 0, 0.26, 0.26, 0.07, '#e1ac58', root)
  tag.rotation.z = Math.PI / 4
}

function sample(meshes: MeshFactory, root: TransformNode, material: RepairMaterial, y: number) {
  if (material === 'timber') {
    const bark = meshes.paintSurface('wood', '#765142')
    meshes.cylinder(0, y + 0.07, 0, 0.09, 0.19, 0.69, 7, bark, root).rotation.z = 1.48
    meshes.cylinder(0.08, y + 0.095, 0.1, 0.035, 0.09, 0.32, 6, bark, root).rotation.set(1.1, 0, -0.48)
    meshes.cylinder(-0.34, y + 0.045, 0, 0.12, 0.12, 0.025, 6, '#d5ad7a', root).rotation.z = 1.48
  }
  else {
    meshes.sphere(0, y + 0.072, 0, 0.34, 0.21, 0.28, '#827f74', root, true, 3).rotation.y = 0.4
    meshes.sphere(-0.07, y + 0.025, 0.05, 0.24, 0.09, 0.21, '#a29b87', root, true, 3)
  }
}

function edging(meshes: MeshFactory, section: Point, material: RepairMaterial) {
  const root = groupAt(meshes, `${material} edging`, section)
  if (material === 'timber') {
    meshes.box(0, 0.11, 0, 0.18, 0.23, 1.17, meshes.paintSurface('wood', '#ac855c'), root)
    for (const z of [-0.44, 0.44]) meshes.box(0.086, 0.14, z, 0.1, 0.28, 0.1, '#745d46', root)
  }
  else {
    for (const [index, z] of [-0.42, 0, 0.42].entries()) {
      const rock = meshes.sphere(0, 0.085, z, 0.29, 0.25 + index * 0.024, 0.45, ['#89867b', '#a39e90', '#96968b'][index], root, true, 4)
      rock.rotation.y = index * 0.37
    }
  }
  return root
}

export function createMaterialsWorkView(meshes: MeshFactory) {
  const sources = repairMaterials.map((material) => {
    const marker = groupAt(meshes, materialSources[material].name, materialSources[material])
    markedPost(meshes, marker, 0.4, 0.63)
    marker.rotation.y = -0.25
    const pickup = new TransformNode(`${material} pickup`, meshes.scene)
    pickup.parent = marker
    sample(meshes, pickup, material, 0)
    return { material, marker, pickup }
  })
  const tray = groupAt(meshes, 'Wren’s sample tray', sampleTray)
  for (const x of [-0.22, 0.22]) meshes.box(x, 0.31, 0, 0.09, 0.62, 0.1, '#604838', tray)
  meshes.box(0, 0.63, 0, 0.67, 0.09, 0.47, '#a88667', tray)
  for (const z of [-0.21, 0.21]) meshes.box(0, 0.7, z, 0.67, 0.08, 0.055, '#6e5240', tray)

  const site = groupAt(meshes, repairSite.name, repairSite)
  markedPost(meshes, site, 0, 0.75)
  const choices = repairMaterials.map((material) => {
    const choice = groupAt(meshes, `${material} option`, repairChoices[material])
    markedPost(meshes, choice, 0, 0.89)
    meshes.box(0, 0.62, 0, 0.64, 0.07, 0.35, '#736354', choice)
    sample(meshes, choice, material, 0.65)
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
