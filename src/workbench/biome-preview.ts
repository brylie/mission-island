import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createTree, createRock } from '../island-assets'
import { createHare } from '../hare'
import type { MeshFactory } from '../island-meshes'
import { placeSiteFeatures } from '../site-props'
import { codex, presets, readRecipe } from './biome-recipe'
import { createBiome } from './biome-model'
import type { Control, Entry } from './catalog'

const meadow = presets['Meadow edge']

function createFox(meshes: MeshFactory) {
  const root = new TransformNode('Fox', meshes.scene)
  const coat = '#ba653c', cream = '#e5d9b9'
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.sphere(x, y, z, w, h, d, color, root, true, 5)
  part(0, .42, 0, .39, .43, .88, coat)
  part(0, .61, .35, .39, .4, .41, coat)
  part(0, .55, .56, .23, .18, .28, cream)
  part(0, .57, .7, .09, .08, .08, '#433b33')
  part(0, .36, -.58, .28, .28, .68, coat).rotation.x = -.18
  part(0, .31, -.85, .19, .19, .25, cream)
  for (const side of [-1, 1]) {
    meshes.cylinder(side * .13, .84, .29, 0, .18, .26, 3, coat, root)
    for (const z of [-.24, .24]) part(side * .14, .17, z, .12, .32, .13, '#523c32')
  }
  return root
}

function plant(meshes: MeshFactory, grass: boolean) {
  const root = new TransformNode(grass ? 'Tussock' : 'Clover', meshes.scene)
  // One mesh per patch keeps individual plants cheap even at full density.
  const vertices: number[] = [], faces: number[] = []
  for (let i = 0; i < (grass ? 28 : 18); i++) {
    const angle = i * 2.39996
    const spread = .1 + .42 * ((i * 7) % 17) / 17
    const x = Math.cos(angle) * spread, z = Math.sin(angle) * spread
    const tip = grass ? .26 + (i % 5) * .072 : .1 + i % 3 * .04
    const leafCount = grass ? 1 : 3
    for (let j = 0; j < leafCount; j++) {
      const a = angle + j * 2 * Math.PI / 3, dx = Math.cos(a), dz = Math.sin(a)
      const base = vertices.length / 3, width = grass ? .041 : .074
      vertices.push(x, grass ? 0 : .04, z, x + dx * .1 - dz * width, tip * .78, z + dz * .1 + dx * width,
        x + dx * .19, tip, z + dz * .19, x + dx * .1 + dz * width, tip * .78, z + dz * .1 - dx * width)
      faces.push(base, base+1, base+2, base, base+2, base+3)
    }
  }
  const leaves = meshes.surface(root.name, vertices, faces, grass ? '#8c9c4f' : '#478254', root)
  if (leaves.material) leaves.material.backFaceCulling = false
  if (!grass) {
    for (const offset of [-.24, .18]) meshes.sphere(offset, .19, offset * .6, .13, .12, .13, '#ece4cb', root, false, 4)
  }
  return root
}

function controls(): Control[] {
  return [
    { key: 'seed', label: 'Layout seed', type: 'number', value: meadow.seed, min: 0, max: 9999, step: 1, rebuild: true },
    { key: 'ground', label: 'Ground surface', type: 'select', value: meadow.ground, choices: { grass: 'Meadow turf', soil: 'Forest duff', stone: 'Stone and grit' }, rebuild: true },
    { key: 'hour', label: 'Hour of day', type: 'range', value: meadow.hour, min: 0, max: 23, step: 1 },
    { key: 'rain', label: 'Rain (%)', type: 'range', value: meadow.rain, min: 0, max: 100, step: 1 },
    ...codex.map(({ key, label, max }): Control => ({ key, label, type: 'range', min: 0, max, value: meadow[key], step: 1, rebuild: true })),
  ]
}

export const biomeEntry: Entry = {
  id: 'biome', name: 'Biome Composer', group: 'World', source: 'src/workbench/biome-model.ts',
  description: 'Compose a 16 m clearing. Replay the same seed to compare feeding, pursuit and shelter.',
  duration: 90, ground: { height: -.6, color: '#394942' }, controls: controls(),
  create(meshes, values) {
    const recipe = readRecipe(values)
    let biome = createBiome(recipe)
    const initial = biome.seek(0)
    const surface = recipe.ground === 'soil' ? meshes.paintSurface('gravel', '#896f50') : meshes.paintSurface(recipe.ground)
    meshes.cylinder(0, -.32, 0, 16.04, 15.8, .54, 36, '#856e50')
    meshes.cylinder(0, -.05, 0, 16, 16.05, .1, 36, surface)
    const plants = new Map<number, TransformNode>()
    initial.patches.forEach((p, i) => {
      if (p.kind === 'trees') createTree(meshes, p.x, p.z, 2.7 + p.angle * .24, i % 2 + 1)
      if (p.kind === 'stones') createRock(meshes, p.x, p.z, .8 + .13 * p.angle, p.angle, i % 2 === 0)
      if (p.kind === 'logs') placeSiteFeatures(meshes, [{ ...p, site: 'biome', model: 'log', name: 'Fallen trunk', heading: p.angle, color: '#87725a' }], () => 0)
      if (p.kind === 'grass' || p.kind === 'clover') {
        const root = plant(meshes, p.kind === 'grass')
        root.position.set(p.x, 0, p.z)
        root.rotation.y = p.angle
        if (p.kind === 'clover') plants.set(i, root)
      }
    })
    const hares = initial.hares.map((_, i) => createHare(meshes, 'Hare', i % 2 ? '#b6a188' : '#967858'))
    const foxes = initial.foxes.map(() => createFox(meshes))
    const observations = document.getElementById('biome-observations')
    return ({ time }, settings) => {
      if (settings.hour !== recipe.hour || settings.rain !== recipe.rain) {
        recipe.hour = Number(settings.hour)
        recipe.rain = Number(settings.rain)
        biome = createBiome(recipe)
      }
      const state = biome.seek(time)
      let stock = 0
      for (const [index, plant] of plants) {
        const amount = state.patches[index].stock
        plant.scaling.setAll(.28 + .72 * amount)
        stock += amount
      }
      state.hares.forEach((animal, i) => {
        const moving = animal.behavior !== 'grazing' && animal.behavior !== 'sheltering'
        hares[i].position.set(animal.x, .12 + (moving ? .11 * Math.abs(Math.sin(time * 7 + i)) : 0), animal.z)
        hares[i].rotation.set(animal.behavior === 'grazing' ? .18 : 0, animal.heading, 0)
      })
      state.foxes.forEach((fox, i) => {
        foxes[i].position.set(fox.x, .035 * Math.abs(Math.sin(time * 6 + i)), fox.z)
        foxes[i].rotation.y = fox.heading
      })
      const count = (mode: string) => state.hares.filter(a => a.behavior === mode).length
      const available = plants.size ? Math.round(100 * stock / plants.size) + '%' : 'none'
      const chasing = state.foxes.filter(f => f.behavior === 'chasing').length
      const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's')
      const lines = [
        `Clover remaining ${available} · ${count('grazing')} grazing`,
        `${chasing} ${chasing === 1 ? 'fox' : 'foxes'} chasing · ${count('sheltering')} sheltered`,
        `${plural(state.escapes, 'escape')} into cover · ${plural(state.encounters, 'close encounter')}`,
      ].join('\n')
      if (observations && observations.textContent !== lines) observations.textContent = lines
    }
  },
}
