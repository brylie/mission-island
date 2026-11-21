import { createBiomeScenery } from '../biome-scenery'
import { createCoastalPatch } from './coastal-patch'
import { createBiomeWalk } from './biome-walk'
import { habitatNavigation } from '../biome-navigation'
import { habitatCodex, presets, readRecipe } from '../biome-recipe'
import { biomeFrame, createBiome } from '../biome-model'
import type { Control, Entry } from './subject'

const meadow = presets['Meadow edge']

function controls(): Control[] {
  return [
    { key: 'seed', label: 'Layout seed', type: 'number', value: meadow.seed, min: 0, max: 9999, step: 1, rebuild: true },
    { key: 'ground', label: 'Ground surface', type: 'select', value: meadow.ground, choices: { grass: 'Meadow turf', soil: 'Forest duff', stone: 'Stone and grit' }, rebuild: true },
    { key: 'hour', label: 'Hour of day', type: 'range', value: meadow.hour, min: 0, max: 23, step: 1 },
    { key: 'rain', label: 'Rain (%)', type: 'range', value: meadow.rain, min: 0, max: 100, step: 1 },
    { key: 'walk', label: 'Walk the clearing (WASD)', type: 'checkbox', value: false },
    ...habitatCodex.map(({ key, label, max }): Control => ({ key, label, type: 'range', min: 0, max, value: meadow[key], step: 1, rebuild: true })),
  ]
}

export const biomeEntry: Entry = {
  id: 'biome',
  name: 'Biome Composer',
  group: 'Habitats',
  source: 'src/biome-model.ts',
  description: 'Compose a 16 m clearing. Select Coastal meadow to compare flower and shorebird populations. Enable Walk the clearing, focus the view and hold WASD to move. Drag to orbit.',
  duration: 90,
  ground: { height: -0.6, color: '#394942' },
  controls: controls(),
  create(meshes, values) {
    const recipe = readRecipe(values)
    let biome = createBiome(recipe)
    const initial = biome.seek(0)
    const surface = recipe.ground === 'soil' ? meshes.paintSurface('gravel', '#896f50') : meshes.paintSurface(recipe.ground)
    meshes.cylinder(0, -0.32, 0, 16.04, 15.8, 0.54, 36, '#856e50')
    meshes.cylinder(0, -0.05, 0, 16, 16.05, 0.1, 36, surface)
    const pose = createBiomeScenery(meshes, initial, { x: 0, z: 0 }, () => 0)
    const walk = createBiomeWalk(meshes, values, habitatNavigation(initial.patches))
    const coast = createCoastalPatch(meshes, recipe)
    let sampleEnd = 0, frames = 0, timing = 'Measuring frame time…'
    const observations = document.getElementById('biome-observations')
    return ({ time, delta }, settings) => {
      if (settings.hour !== recipe.hour || settings.rain !== recipe.rain) {
        recipe.hour = Number(settings.hour)
        recipe.rain = Number(settings.rain)
        biome = createBiome(recipe)
      }
      const visitor = walk(delta)
      const wary = coast(time, visitor)
      const state = biome.seek(time, visitor ? [visitor] : [])
      const now = performance.now()
      if (!sampleEnd) sampleEnd = now
      frames++
      if (now - sampleEnd >= 1000) {
        const ms = (now - sampleEnd) / frames
        timing = `${Math.round(1000 / ms)} FPS · ${ms.toFixed(1)} ms/frame · ${meshes.scene.getActiveMeshes().length} active meshes`
        frames = 0
        sampleEnd = now
      }
      const frame = biomeFrame(state)
      pose(frame, time)
      const stock = frame.clover.reduce((sum, amount) => sum + amount, 0)
      const count = (mode: string) => state.hares.filter((a) => a.behavior === mode).length
      const available = frame.clover.length ? Math.round(100 * stock / frame.clover.length) + '%' : 'none'
      const chasing = state.foxes.filter((f) => f.behavior === 'chasing').length
      const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's')
      const lines = [
        ...(recipe.hares || recipe.foxes
          ? [
              `Clover remaining ${available} · ${count('grazing')} grazing`,
              `${chasing} ${chasing === 1 ? 'fox' : 'foxes'} chasing · ${count('sheltering')} sheltered`,
              `${plural(state.escapes, 'escape')} into cover · ${plural(state.encounters, 'close encounter')}`,
            ]
          : []),
        ...(recipe.foxgloves || recipe.oystercatchers ? [`${recipe.foxgloves} foxgloves · ${recipe.oystercatchers} shorebirds · ${wary} wary`] : []),
        ...(visitor ? [`Walker X ${visitor.x.toFixed(1)} m · Z ${visitor.z.toFixed(1)} m`] : []),
        timing,
      ].join('\n')
      if (observations && observations.textContent !== lines) observations.textContent = lines
    }
  },
}
