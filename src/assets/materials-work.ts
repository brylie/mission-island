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
  meshes.box(x, height / 2, 0, .09, height, .09, '#625449', root)
  const tag = meshes.box(x, height - .08, 0, .26, .26, .07, '#e1ac58', root)
  tag.rotation.z = Math.PI / 4
}

function sample(meshes: MeshFactory, root: TransformNode, material: RepairMaterial, y: number) {
  if (material === 'timber') {
    const bark = meshes.paintSurface('wood', '#765142')
    meshes.cylinder(0, y + .07, 0, .09, .19, .69, 7, bark, root).rotation.z = 1.48
    meshes.cylinder(.08, y + .095, .1, .035, .09, .32, 6, bark, root).rotation.set(1.1, 0, -.48)
    meshes.cylinder(-.34, y + .045, 0, .12, .12, .025, 6, '#d5ad7a', root).rotation.z = 1.48
  } else {
    meshes.sphere(0, y + .072, 0, .34, .21, .28, '#827f74', root, true, 3).rotation.y = .4
    meshes.sphere(-.07, y + .025, .05, .24, .09, .21, '#a29b87', root, true, 3)
  }
}

function edging(meshes: MeshFactory, section: Point, material: RepairMaterial) {
  const root = groupAt(meshes, `${material} edging`, section)
  if (material === 'timber') {
    meshes.box(0, .11, 0, .18, .23, 1.17, meshes.paintSurface('wood', '#ac855c'), root)
    for (const z of [-.44, .44]) meshes.box(.086, .14, z, .1, .28, .1, '#745d46', root)
  } else {
    for (const [index, z] of [-.42, 0, .42].entries()) {
      const rock = meshes.sphere(0, .085, z, .29, .25 + index * .024, .45, ['#89867b', '#a39e90', '#96968b'][index], root, true, 4)
      rock.rotation.y = index * .37
    }
  }
  return root
}

export function createMaterialsWorkView(meshes: MeshFactory) {
  const sources = repairMaterials.map((material) => {
    const marker = groupAt(meshes, materialSources[material].name, materialSources[material])
    markedPost(meshes, marker, .4, .63)
    marker.rotation.y = -.25
    const pickup = new TransformNode(`${material} pickup`, meshes.scene)
    pickup.parent = marker
    sample(meshes, pickup, material, 0)
    return { material, marker, pickup }
  })
  const tray = groupAt(meshes, 'Wren’s sample tray', sampleTray)
  for (const x of [-.22, .22]) meshes.box(x, .31, 0, .09, .62, .1, '#604838', tray)
  meshes.box(0, .63, 0, .67, .09, .47, '#a88667', tray)
  for (const z of [-.21, .21]) meshes.box(0, .7, z, .67, .08, .055, '#6e5240', tray)

  const site = groupAt(meshes, repairSite.name, repairSite)
  markedPost(meshes, site, 0, .75)
  const choices = repairMaterials.map((material) => {
    const choice = groupAt(meshes, `${material} option`, repairChoices[material])
    markedPost(meshes, choice, 0, .89)
    meshes.box(0, .62, 0, .64, .07, .35, '#736354', choice)
    sample(meshes, choice, material, .65)
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
